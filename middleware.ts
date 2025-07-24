// middleware.ts
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isSignIn = createRouteMatcher(["/signin"]);
const isProtected = createRouteMatcher(["/fahrtenbuch", "/dashboard"]);

export default convexAuthNextjsMiddleware(async (req, { convexAuth }) => {
  if (isSignIn(req) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(req, "/fahrtenbuch");
  }
  if (isProtected(req) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(req, "/signin");
  }
});

export const config = {
  matcher: ["/","/fahrtenbuch/:path*","/dashboard/:path*","/api/:path*"],
};
