// src/app/api/stripe/checkout/route.ts
// Creates a Stripe Checkout Session for upgrading to a paid tier
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStripe, TIERS, type Tier } from "@/lib/stripe";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tier, billing } = body as { tier: Tier; billing: "monthly" | "yearly" };

    if (!tier || !["FARMER", "FEED_MILL", "COOPERATIVE"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
    if (!billing || !["monthly", "yearly"].includes(billing)) {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const tierConfig = TIERS[tier];
    const priceId =
      billing === "monthly"
        ? tierConfig.stripePriceIdMonthly
        : tierConfig.stripePriceIdYearly;

    if (!priceId) {
      return NextResponse.json(
        {
          error: `Stripe price ID not configured for ${tier} ${billing}. Set STRIPE_PRICE_${tier}_${billing.toUpperCase()} env var.`,
        },
        { status: 500 },
      );
    }

    const stripe = getStripe();

    // Find or create Stripe customer
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      include: { subscription: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
          tier: tier,
        },
      });
      customerId = customer.id;
    }

    // Build success + cancel URLs
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${origin}/?upgraded=1&tier=${tier}`;
    const cancelUrl = `${origin}/?upgrade_canceled=1`;

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId as string, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: user.id,
        tier,
        billing,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
          billing,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("[stripe/checkout] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
