const assert = require("node:assert/strict");
const fs = require("node:fs");

async function main() {
  const { default: worker } = await import("../worker.mjs");
  const config = JSON.parse(fs.readFileSync("wrangler.jsonc", "utf8"));

  assert.equal(config.main, "./worker.mjs");
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.assets.not_found_handling, "single-page-application");

  const workerFirst = new Set(config.assets.run_worker_first);
  const routes = [
    "/signin", "/login", "/signup",
    "/vendo-management", "/dashboard", "/new-wash", "/service-queue",
    "/transactions", "/customers", "/booking", "/bookings", "/facility-listing",
    "/services-pricing", "/add-on-analytics", "/employees", "/expenses",
    "/reports", "/inventory", "/branches", "/loyalty-packages",
    "/service-recipes", "/shift-reconciliation", "/subscription-billing",
    "/business-management", "/platform/overview", "/platform/businesses",
    "/platform/billing-revenue", "/features", "/businesses", "/business",
    "/how-it-works", "/pricing", "/about", "/faq", "/contact"
  ];
  for (const route of routes) {
    assert.ok(workerFirst.has(route), "Cloudflare must invoke the Worker first for " + route);
    assert.ok(workerFirst.has(route + "/*"), "Cloudflare must invoke the Worker first for nested route " + route);
  }
  assert.ok(workerFirst.has("/signin.html"), "Cloudflare should serve the sign-in HTML as a static asset.");
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

  const oldSignin = await fetchPath("/signin");
  assert.equal(oldSignin.status, 308, "The old /signin path should redirect once to /login.");
  assert.equal(oldSignin.headers.get("location"), "https://washpilot.shop/login");

  const loginBefore = calls.length;
  const loginResponse = await fetchPath("/login");
  assert.equal(loginResponse.status, 200, "Canonical /login should serve successfully.");
  assert.equal(calls[loginBefore].path, "/signin.html", "Canonical /login must load the dedicated auth-only HTML, not the shared landing shell.");

  const directSigninFile = await fetchPath("/signin.html");
  assert.equal(directSigninFile.status, 200, "The sign-in HTML file should be served directly.");
  assert.equal(calls.at(-1).path, "/signin.html", "The sign-in HTML asset must not redirect back to /signin.");

  for (const path of ["/signup", "/dashboard", "/new-wash", "/service-queue", "/services-pricing", "/platform/overview", "/features", "/businesses", "/booking", "/facility/my-carwash", "/book/my-carwash?slot=10%3A00"]) {
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

  console.log("PASS: Cloudflare serves a dedicated login page without a redirect loop, routes the remaining app through one app.html, keeps the new homepage/assets, and redirects old duplicate URLs.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
