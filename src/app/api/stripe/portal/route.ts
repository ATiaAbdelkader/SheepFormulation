// src/app/api/stripe/portal/route.ts
// Creates a Stripe Customer Portal session for subscription management
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBillingPortalUrl } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });
    if (!user?.subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found. Subscribe first." },
        { status: 400 },
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const returnUrl = `${origin}/`;
    const url = await createBillingPortalUrl(user.subscription.stripeCustomerId, returnUrl);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("[stripe/portal] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
