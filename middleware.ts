import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const publicPaths = ["/", "/login", "/signup", "/forgot", "/reset", "/media"];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    // Always allow media file streaming
    if (pathname.startsWith("/media")) return NextResponse.next();
    // API auth is handled in each route; don't block API here
    if (pathname.startsWith("/api")) return NextResponse.next();
    return NextResponse.next();
  },
  {
    callbacks: {
      // protect the dashboard + editor + settings
      authorized({ req, token }) {
        const { pathname } = req.nextUrl;
        if (pathname.startsWith("/media")) return true;
        if (pathname.startsWith("/api")) return true;
        const protectedPaths = ["/dashboard", "/new-project", "/project", "/settings", "/clips", "/admin"];
        const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
        if (isProtected) return !!token;
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};