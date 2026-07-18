// src/lib/stripe.ts — Stripe server-side client + tier config
import Stripe from "stripe";
import { db } from "@/lib/db";

// Lazy-init: don't crash dev when STRIPE_SECRET_KEY is missing
let _stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "[stripe] STRIPE_SECRET_KEY not set. Add it to .env (dev) or Vercel env vars (prod).",
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2025-08-27.basil" as Stripe.LatestApiVersion,
    typescript: true,
  });
  return _stripe;
}

// ============================================================
// Subscription tier configuration
// ============================================================

export type Tier = "STUDENT" | "FARMER" | "FEED_MILL" | "COOPERATIVE";

export const TIERS = {
  STUDENT: {
    name: "Student",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "eur",
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      "13 modules including Ration, AI Assistant (10 msg/day), Rumen Sim",
      "3 saved rations",
      "Community support",
    ],
  },
  FARMER: {
    name: "Farmer",
    priceMonthly: 9.90,
    priceYearly: 89,
    currency: "eur",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_FARMER_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_FARMER_YEARLY || null,
    features: [
      "20 modules including Optimization, Comparer, Custom Feeds",
      "Unlimited AI Assistant + saved rations",
      "Weather + market price feeds",
      "Email support (48h)",
    ],
  },
  FEED_MILL: {
    name: "Feed Mill",
    priceMonthly: 49,
    priceYearly: 449,
    currency: "eur",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_FEEDMILL_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_FEEDMILL_YEARLY || null,
    features: [
      "All 22 modules including Production + Traceability",
      "Multi-user (up to 25 seats)",
      "API access + webhooks",
      "White-label PDF reports",
      "Priority support (24h)",
    ],
  },
  COOPERATIVE: {
    name: "Cooperative",
    priceMonthly: 999,
    priceYearly: 9988,
    currency: "eur",
    stripePriceIdMonthly: process.env.STRIPE_PRICE_COOP_MONTHLY || null,
    stripePriceIdYearly: process.env.STRIPE_PRICE_COOP_YEARLY || null,
    features: [
      "Multi-tenant white-label SaaS",
      "On-premise deployment option",
      "SLA + dedicated success manager",
      "Custom integrations",
    ],
  },
} as const;

// ============================================================
// Customer portal URL helper
// ============================================================

export async function createBillingPortalUrl(
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

// ============================================================
// Sync helper — update DB subscription from Stripe event
// ============================================================

export async function syncSubscriptionFromStripe(
  stripeSubscriptionId: string,
): Promise<void> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId, {
    expand: ["default_payment_method", "customer"],
  });

  const customer = sub.customer as Stripe.Customer;
  const customerEmail = customer.email;
  if (!customerEmail) {
    console.warn("[stripe] No email on customer", customer.id);
    return;
  }

  // Find user by email
  const user = await db.user.findUnique({
    where: { email: customerEmail },
    include: { subscription: true },
  });
  if (!user) {
    console.warn("[stripe] No user found for email", customerEmail);
    return;
  }

  // Determine tier from price ID
  const priceId = sub.items.data[0]?.price?.id;
  let tier: Tier = "STUDENT";
  if (priceId === TIERS.FARMER.stripePriceIdMonthly || priceId === TIERS.FARMER.stripePriceIdYearly) {
    tier = "FARMER";
  } else if (priceId === TIERS.FEED_MILL.stripePriceIdMonthly || priceId === TIERS.FEED_MILL.stripePriceIdYearly) {
    tier = "FEED_MILL";
  } else if (priceId === TIERS.COOPERATIVE.stripePriceIdMonthly || priceId === TIERS.COOPERATIVE.stripePriceIdYearly) {
    tier = "COOPERATIVE";
  }

  // Map Stripe status → our status
  const statusMap: Record<string, string> = {
    trialing: "TRIALING",
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    incomplete: "INCOMPLETE",
  };
  const ourStatus = statusMap[sub.status] || "FREE";

  // Upsert subscription
  if (user.subscription) {
    await db.subscription.update({
      where: { userId: user.id },
      data: {
        tier,
        status: ourStatus,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : null,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  } else {
    await db.subscription.create({
      data: {
        userId: user.id,
        tier,
        status: ourStatus,
        stripeCustomerId: customer.id,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        currentPeriodStart: sub.current_period_start
          ? new Date(sub.current_period_start * 1000)
          : null,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }

  // Also update user.role to match tier (FARMER, FEED_MILL, COOPERATIVE)
  if (tier !== "STUDENT") {
    await db.user.update({
      where: { id: user.id },
      data: { role: tier },
    });
  }

  console.log(`[stripe] Synced subscription for ${user.email}: ${tier} / ${ourStatus}`);
}
