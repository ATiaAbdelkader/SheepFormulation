// src/middleware.ts — NextAuth middleware
// Protects /api/stripe/* routes (requires session)
// All other routes are public — auth is enforced client-side via UserMenu + tier gating
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Protect Stripe customer portal + checkout (must be signed in)
  if (pathname.startsWith("/api/stripe/checkout") || pathname.startsWith("/api/stripe/portal")) {
    if (!req.auth) {
      return NextResponse.json(
        { error: "Unauthorized — sign in first" },
        { status: 401 },
      );
    }
  }

  // Webhook route is public (Stripe signs requests separately) — skip auth check
  if (pathname.startsWith("/api/stripe/webhook")) {
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  // Run middleware on API + auth routes only (not on static assets)
  matcher: ["/api/stripe/:path*", "/api/auth/:path*"],
};
