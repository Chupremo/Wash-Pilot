const APP_ROUTES = new Set([
  "/signin",
  "/signup",
  "/vendo-management",
  "/dashboard",
  "/new-wash",
  "/service-queue",
  "/transactions",
  "/customers",
  "/booking",
  "/bookings",
  "/facility-listing",
  "/services-pricing",
  "/add-on-analytics",
  "/employees",
  "/expenses",
  "/reports",
  "/inventory",
  "/branches",
  "/loyalty-packages",
  "/service-recipes",
  "/shift-reconciliation",
  "/subscription-billing",
  "/business-management",
  "/platform/overview",
  "/platform/businesses",
  "/platform/billing-revenue",
  "/features",
  "/businesses",
  "/business",
  "/how-it-works",
  "/pricing",
  "/about",
  "/faq",
  "/contact"
]);

const LEGACY_REDIRECTS = new Map([
  ["/login", "/signin"],
  ["/signin.html", "/signin"],
  ["/signup.html", "/signup"],
  ["/forgot", "/signin"],
  ["/forgot.html", "/signin"],
  ["/dashboard.html", "/dashboard"],
  ["/pos.html", "/new-wash"],
  ["/pos", "/new-wash"],
  ["/home.html", "/"],
  ["/index.html", "/"]
]);

function normalizePath(pathname) {
  const normalized = String(pathname || "/").replace(/\/+$/, "");
  return normalized || "/";
}

function redirectUrl(requestUrl, destination) {
  const target = new URL(requestUrl);
  target.pathname = destination;
  return target;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return env.ASSETS.fetch(request);
    }

    const legacyDestination = LEGACY_REDIRECTS.get(path);
    if (legacyDestination) {
      return Response.redirect(redirectUrl(url, legacyDestination).toString(), 308);
    }

    // app.html is the shared application shell, not a second public homepage.
    if (path === "/app.html") {
      return Response.redirect(redirectUrl(url, "/").toString(), 308);
    }

    const isPublicFacilityRoute =
      path.startsWith("/facility/") && path.length > "/facility/".length;
    const isPublicBookingRoute =
      path.startsWith("/book/") && path.length > "/book/".length;

    if (APP_ROUTES.has(path) || isPublicFacilityRoute || isPublicBookingRoute) {
      const appUrl = new URL(url);
      appUrl.pathname = "/app.html";
      // Preserve auth callback parameters and other route query strings.
      return env.ASSETS.fetch(new Request(appUrl, request));
    }

    // Keep the redesigned public homepage and ordinary static assets unchanged.
    return env.ASSETS.fetch(request);
  }
};
