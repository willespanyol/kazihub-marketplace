import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const client = readFileSync(new URL("../src/lib/supabaseClient.js", import.meta.url), "utf8");
const vercel = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));

test("Vercel is the only repository-managed hosting configuration", () => {
  assert.equal(existsSync(new URL("../netlify.toml", import.meta.url)), false);
  assert.equal(Array.isArray(vercel.rewrites), true);
  assert.match(client, /Vercel project environment variables/);
  assert.doesNotMatch(client, /Netlify environment variables/);
});

test("notification badge counts all unread notifications, not just the ten displayed", () => {
  assert.match(app, /setUnreadNotificationCount\(countResult\.count \?\? 0\)/);
  assert.match(app, /count: "exact", head: true/);
  assert.match(app, /\.eq\("is_read", false\)/);
  assert.doesNotMatch(app, /const unreadNotificationCount = notifications\.filter/);
});
