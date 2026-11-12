import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const auth = readFileSync(new URL("../src/context/AuthContext.jsx", import.meta.url), "utf8");
const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
const client = readFileSync(new URL("../src/lib/supabaseClient.js", import.meta.url), "utf8");

test("marketplace App, never AdminActivityPage, is the single default export", () => {
  assert.equal((app.match(/export\s+default\b/g) || []).length, 1);
  assert.match(app, /export\s+default\s+function\s+App\s*\(/);
  assert.doesNotMatch(app, /export\s+default\s+function\s+AdminActivityPage\s*\(/);
});
test("the public homepage and admin activity have separate React routes", () => {
  assert.match(app, /<Route\s+path="\/"\s+element=\{<HomePage\s*\/>\}/);
  assert.match(app, /<Route\s+path="\/admin\/activity"\s+element=\{<AdminActivityPage\s*\/>\}/);
  assert.match(app, /profile\?\.role\s*===\s*"admin"/);
});
test("private admin activity checks an active administrator", () => {
  const component = app.split("function AdminActivityPage()")[1]?.split("function MobileBottomNavigation()")[0];
  assert.ok(component, "admin activity component is present");
  assert.match(component, /profile\?\.role === "admin"/);
  assert.match(component, /profile\?\.account_status === "active"/);
});
test("site has a SPA fallback without rewriting API requests to a public admin route", () => {
  assert.ok(config.rewrites.some(({source,destination}) => source === "/(.*)" && destination === "/index.html"));
  assert.ok(config.headers.some(({source,headers}) => source === "/(.*)" && headers.some(({key}) => key === "Content-Security-Policy")));
});
test("browser only initializes Supabase from publishable variables", () => {
  assert.match(client, /VITE_SUPABASE_URL/);
  assert.match(client, /VITE_SUPABASE_ANON_KEY/);
  assert.doesNotMatch(client, /VITE_SUPABASE_SERVICE_ROLE_KEY|VITE_SUPABASE_SECRET_KEY/);
});
test("account profile loads from database and has a session refresh", () => {
  assert.match(auth, /from\("profiles"\)/);
  assert.match(auth, /getUser\(\)/);
  assert.match(auth, /setProfile\(freshProfile\)/);
});
test("payment state guards are delegated to the database", () => {
  assert.match(app, /from\("orders"\)/);
  assert.match(app, /payment_pending/);
  assert.match(app, /payment_verified_at/);
});
test("payment settings exist for buyers and sellers", () => {
  assert.ok(app.includes('<Route path="/payment-settings" element={<PaymentSettingsPage />} />'));
  assert.ok(app.includes("payout_destination_id: selectedPayoutDestinationId"));
  assert.ok(app.includes("payoutPhoneVerified"));
});

test("marketplace reports remain separate from public and admin activity routes", () => {
  assert.ok(app.includes('<Route path="/admin/reports" element={<AdminReportsPage />} />'));
  assert.ok(app.includes("function ConversationPage()"));
  assert.ok(app.includes('from("marketplace_reports").insert('));
  assert.ok(app.includes('from("account_blocks").insert('));
  assert.ok(app.includes("export default function App()"));
});
