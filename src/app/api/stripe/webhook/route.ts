// src/app/api/stripe/webhook/route.ts
// Stripe webhook — syncs subscription state to our database
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, syncSubscriptionFromStripe } from "@/lib/stripe";
import { db } from "@/lib/db";

// Disable body parsing — we need the raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        console.log(`[stripe/webhook] Checkout completed: ${cs.id}`);
        // If subscription was created, sync it
        if (cs.subscription && typeof cs.subscription === "string") {
          await syncSubscriptionFromStripe(cs.subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`[stripe/webhook] Subscription ${event.type}: ${sub.id}`);
        await syncSubscriptionFromStripe(sub.id);
        break;
      }

      case "invoice.paid":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[stripe/webhook] Invoice ${event.type}: ${invoice.id}`);

        // Record invoice in DB
        if (invoice.subscription && typeof invoice.subscription === "string") {
          const sub = await db.subscription.findUnique({
            where: { stripeSubscriptionId: invoice.subscription },
          });
          if (sub) {
            await db.invoice.upsert({
              where: { stripeInvoiceId: invoice.id },
              create: {
                subscriptionId: sub.id,
                stripeInvoiceId: invoice.id,
                amountDue: invoice.amount_due,
                amountPaid: invoice.amount_paid,
                currency: invoice.currency,
                status: invoice.status || "open",
                invoicePdf: invoice.invoice_pdf,
                hostedInvoiceUrl: invoice.hosted_invoice_url,
              },
              update: {
                amountDue: invoice.amount_due,
                amountPaid: invoice.amount_paid,
                status: invoice.status || "open",
                invoicePdf: invoice.invoice_pdf,
                hostedInvoiceUrl: invoice.hosted_invoice_url,
              },
            });
          }
        }
        break;
      }

      default:
        // Unhandled event — log for visibility
        console.log(`[stripe/webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] Processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
