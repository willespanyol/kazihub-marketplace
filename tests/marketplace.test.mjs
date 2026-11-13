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
  assert.match(app, /<Route\s+path="\/admin\/activity"\s+element=\{<AccountRoleRoute allowedRoles=\{\["admin"\]\}><AdminActivityPage\s*\/>/);
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
  assert.ok(app.includes('path="/admin/reports" element={<AccountRoleRoute allowedRoles={["admin"]}><AdminReportsPage />'));
  assert.ok(app.includes("function ConversationPage()"));
  assert.ok(app.includes('from("marketplace_reports").insert('));
  assert.ok(app.includes('from("account_blocks").insert('));
  assert.ok(app.includes("export default function App()"));
});

test("conversation offers render only within an authorized conversation", () => {
  const page = readFileSync(new URL("../src/components/ConversationOffersPanel.jsx", import.meta.url), "utf8");
  assert.ok(app.includes('<ConversationOffersPanel conversation={conversation} userId={user.id} />'));
  assert.ok(page.includes("isSeller = userId && userId===conversation?.seller_id"));
  assert.ok(page.includes("isBuyer = userId && userId===conversation?.buyer_id"));
  assert.ok(page.includes('rpc("create_conversation_offer"'));
  assert.ok(page.includes('rpc("accept_conversation_offer"'));
  assert.ok(page.includes('rpc("respond_conversation_offer"'));
  assert.ok(page.includes("navigate(`/orders/${data}`)"));
});

test("offer comparison route is available without making the admin page default", () => {
  const offers = readFileSync(new URL("../src/pages/MyOffersPage.jsx", import.meta.url), "utf8");
  assert.ok(app.includes('<Route path="/offers" element={<MyOffersPage />} />'));
  assert.ok(offers.includes('rpc(method,args)'));
  assert.ok(offers.includes("navigate(`/orders/${data}`)"));
  assert.ok(app.includes("export default function App()"));
});

test("milestones and seller portfolios have dedicated pages without altering the marketplace default route", () => {
 const milestones=readFileSync(new URL("../src/components/OrderMilestonesPanel.jsx",import.meta.url),"utf8");
 const portfolios=readFileSync(new URL("../src/pages/SellerPortfolioPage.jsx",import.meta.url),"utf8");
 assert.ok(app.includes('path="/portfolio" element={<AccountRoleRoute allowedRoles={["seller"]}><SellerPortfolioPage />'));
 assert.ok(app.includes('<OrderMilestonesPanel order={order} userId={user.id} />'));
 assert.ok(app.includes("export default function App()"));
 assert.ok(milestones.includes('rpc("propose_order_milestones"'));
 assert.ok(milestones.includes('rpc("review_order_milestone_plan"'));
 assert.ok(milestones.includes('rpc("update_order_milestone_progress"'));
 assert.ok(portfolios.includes('from("seller_portfolio_projects")'));
 assert.ok(portfolios.includes('storage.from("portfolio-images")'));
});

test("public discovery is server-side, paginated and keeps admin UI separate", () => {
 const search=readFileSync(new URL("../src/pages/MarketplaceSearchPage.jsx",import.meta.url),"utf8");
 assert.ok(app.includes('<Route path="/services" element={<MarketplaceSearchPage />} />'));
 assert.ok(search.includes('rpc("search_marketplace_services"'));
 assert.ok(search.includes("p_page_size:PAGE_SIZE"));
 assert.ok(search.includes("p_verified_only:filters.verified"));
 assert.ok(search.includes('from("saved_services")'));
 assert.ok(search.includes("aria-label=\"Search results pages\""));
 assert.ok(app.includes("export default function App()"));
});

test("public freelancer directory is indexed server-side and not an admin page", () => {
 const sellers=readFileSync(new URL("../src/pages/FindSellersPage.jsx",import.meta.url),"utf8");
 assert.ok(app.includes('<Route path="/sellers" element={<FindSellersPage />} />'));
 assert.ok(sellers.includes('rpc("search_marketplace_sellers"'));
 assert.ok(sellers.includes("p_page_size:PER_PAGE"));
 assert.ok(sellers.includes("p_verified_only:verified"));
 assert.ok(app.includes("export default function App()"));
});

test("order uploads validate size and keep storage and metadata consistent", () => {
 const upload = readFileSync(new URL("../src/lib/uploadUtils.js",import.meta.url),"utf8");
 assert.ok(upload.includes('export function validateUpload'));
 assert.ok(upload.includes('"order-files": 50 * 1024 * 1024'));
 assert.ok(upload.includes('crypto.randomUUID()'));
 assert.ok(app.includes('uniqueUploadPath(order.id, file)'));
 assert.ok(app.includes('validateUpload(file, "order-files")') || app.includes('validateUpload(file,"order-files")'));
 assert.ok(app.includes('storage.from("order-files").remove([filePath])'));
 assert.ok(app.includes('File attached to this order successfully.'));
});
test("other uploads validate against bucket size and mime restrictions", () => {
 assert.ok(app.includes('validateUpload(profileImageFile,"profile-images")'));
 assert.ok(app.includes('validateUpload(verificationDocumentFile,"seller-verification-files")'));
 assert.ok(app.includes('validateUpload(serviceImageFile,"service-media")'));
 assert.ok(app.includes('validateUpload(file,"service-media")'));
});

test("seller vacation mode controls are routed separately from admin", () => {
 const page=readFileSync(new URL("../src/pages/SellerAvailabilityPage.jsx",import.meta.url),"utf8");
 assert.ok(app.includes('path="/availability" element={<AccountRoleRoute allowedRoles={["seller"]}><SellerAvailabilityPage />'));
 assert.ok(page.includes('from("seller_availability").upsert('));
 assert.ok(page.includes("accepting_orders:accepting"));
 assert.ok(page.includes("max_active_orders:max"));
 assert.ok(app.includes("export default function App()"));
});

test("gig extras use server-verified order snapshots and a seller-owned manager", () => {
 const manager=readFileSync(new URL("../src/pages/ManageGigExtrasPage.jsx",import.meta.url),"utf8");
 assert.ok(app.includes('path="/services/:id/extras" element={<AccountRoleRoute allowedRoles={["seller"]}><ManageGigExtrasPage />'));
 assert.ok(app.includes('source: chosenExtras.length ? "service_with_extras" : "service_offer"'));
 assert.ok(app.includes('gig_package_id: chosenExtras.length ? packageToBuy.id : null'));
 assert.ok(app.includes('gig_extra_ids: chosenExtras.map(item=>item.id)'));
 assert.ok(manager.includes('from("service_offer_extras").insert('));
});
test("order timeline and cancellation requests do not auto-refund payments", () => {
 const management=readFileSync(new URL("../src/components/OrderManagementPanel.jsx",import.meta.url),"utf8");
 assert.ok(app.includes('<OrderManagementPanel order={order} userId={user.id}'));
 assert.ok(management.includes('rpc("request_order_cancellation"'));
 assert.ok(management.includes('rpc("respond_order_cancellation"'));
 assert.ok(management.includes('rpc("resolve_order_cancellation"'));
 assert.ok(management.includes('payment/refund status reconciled'));
});

test("file uploads never submit a native browser form", () => {
  assert.ok(app.includes('type="button"\n            onClick={handleFileUpload}'));
  assert.ok(!app.includes('<form onSubmit={handleFileUpload}'));
  assert.ok(app.includes('event?.preventDefault?.()'));
  assert.ok(app.includes('Uploading securely...'));
});
test("dispute evidence and status synchronization are shown to order participants", () => {
  const evidence=readFileSync(new URL("../src/components/OrderDisputeEvidencePanel.jsx",import.meta.url),"utf8");
  assert.ok(app.includes('<OrderDisputeEvidencePanel order={order} disputes={orderDisputes} files={orderFiles}'));
  assert.ok(evidence.includes('from("order_dispute_evidence").insert('));
  assert.ok(evidence.includes('order_file_id:fileId||null'));
  assert.ok(!app.includes('.update({\n        status: "disputed",'));
});

test("seller performance is loaded from authenticated database metrics", () => {
 const performance=readFileSync(new URL("../src/components/SellerPerformancePanel.jsx",import.meta.url),"utf8");
 assert.ok(app.includes('<SellerPerformancePanel userId={user?.id} />'));
 assert.ok(performance.includes('rpc("my_seller_performance")'));
 assert.ok(performance.includes("Not enough data"));
});
