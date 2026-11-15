const assert = require("node:assert/strict");
const fs = require("node:fs");
const { default: worker } = await import("../worker.mjs");

const config = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));
assert.equal(config.main, "./worker.mjs");
assert.equal(config.assets.binding, "ASSETS");
assert.equal(config.assets.not_found_handling, "single-page-application");

const workerFirst = new Set(config.assets.run_worker_first);
const routes = [
  "/signin", "/signup",
  "/vendo-management", "/dashboard", "/new-wash", "/service-queue",
  "/transactions", "/customers", "/bookings", "/facility-listing",
  "/services-pricing", "/add-on-analytics", "/employees", "/expenses",
  "/reports", "/inventory", "/branches", "/loyalty-packages",
  "/service-recipes", "/shift-reconciliation", "/subscription-billing",
  "/business-management", "/platform/overview", "/platform/businesses",
  "/platform/billing-revenue", "/features", "/businesses", "/business",
  "/how-it-works", "/pricing", "/about", "/faq", "/contact"
];
for (const route of routes) {
  assert.ok(workerFirst.has(route), "Cloudflare must invoke the Worker first for " + route);
}
assert.ok(workerFirst.has("/facility/*"));
assert.ok(workerFirst.has("/book/*"));

const calls = [];
const env = {
  ASSETS: {
    async fetch(request) {
      const url = new URL(request.url);
      calls.push({ path: url.pathname, search: url.search, method: request.method });
      return new Response("asset:" + url.pathname, { status: 200 });
    }
  }
};

async function fetchPath(path, method = "GET") {
  return worker.fetch(new Request("https://washpilot.shop" + path, { method }), env);
}

for (const path of ["/signin", "/signup", "/dashboard", "/new-wash", "/service-queue", "/services-pricing", "/platform/overview", "/features", "/businesses", "/facility/my-carwash", "/book/my-carwash?slot=10%3A00"]) {
  const before = calls.length;
  const response = await fetchPath(path);
  assert.equal(response.status, 200, "Expected successful app shell response for " + path);
  assert.equal(calls[before].path, "/app.html", "Expected one shared app shell for " + path);
}
const queryCall = calls.at(-1);
assert.equal(queryCall.search, "?slot=10%3A00", "Booking parameters must survive the app-shell rewrite.");

const logoResponse = await fetchPath("/washpilot-logo.svg");
assert.equal(logoResponse.status, 200);
assert.equal(calls.at(-1).path, "/washpilot-logo.svg", "Static assets must remain unchanged.");

const legacy = await fetchPath("/dashboard.html?from=legacy");
assert.equal(legacy.status, 308);
assert.equal(legacy.headers.get("location"), "https://washpilot.shop/dashboard?from=legacy");

const oldPos = await fetchPath("/pos.html");
assert.equal(oldPos.status, 308);
assert.equal(oldPos.headers.get("location"), "https://washpilot.shop/new-wash");

const appEntry = await fetchPath("/app.html");
assert.equal(appEntry.status, 308);
assert.equal(appEntry.headers.get("location"), "https://washpilot.shop/");

const homepage = await fetchPath("/");
assert.equal(homepage.status, 200);
assert.equal(calls.at(-1).path, "/", "The redesigned homepage must keep serving index.html.");

console.log("PASS: Cloudflare routes all authenticated and public app pages through one app.html, keeps the new homepage/assets, and redirects old duplicate URLs.");
