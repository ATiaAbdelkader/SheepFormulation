// src/auth.ts — NextAuth v5 configuration
// Provides: email magic-link + Google OAuth + Prisma adapter
// Exports: auth, handlers, signIn, signOut
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import EmailProvider from "next-auth/providers/email";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

if (!process.env.NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("[auth] NEXTAUTH_SECRET not set — auth will FAIL in production");
  } else {
    console.warn("[auth] NEXTAUTH_SECRET not set — using dev fallback (do NOT use in prod)");
  }
}

// Provide a dev fallback secret so auth doesn't crash in development
const FALLBACK_DEV_SECRET = "ovinformulation-dev-secret-do-not-use-in-production-32chars";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Prisma adapter syncs users/sessions/accounts to the database
  adapter: PrismaAdapter(db),
  // JWT session strategy (works better with Vercel edge + Stripe webhooks)
  session: { strategy: "jwt" },
  // Secret — required. Use dev fallback if missing.
  secret: process.env.NEXTAUTH_SECRET || FALLBACK_DEV_SECRET,
  // Configure providers — all env-gated so missing keys don't crash dev
  providers: [
    // Email magic-link provider
    // Provide a no-op SMTP config when no real server is configured so nodemailer doesn't crash
    EmailProvider({
      server:
        process.env.EMAIL_SERVER ||
        `smtp://fake@fake-host-do-not-send.example.com:587`,
      from: process.env.EMAIL_FROM || "noreply@ovinformulation.com",
      // In dev without SMTP configured, emails print to console instead of being sent
      ...(process.env.NODE_ENV !== "production" && !process.env.EMAIL_SERVER
        ? {
            sendVerificationRequest: async ({ identifier, url, token }) => {
              console.log("\n====================");
              console.log("[auth] Magic link email");
              console.log("[auth] To:", identifier);
              console.log("[auth] URL:", url);
              console.log("[auth] Token:", token);
              console.log("====================\n");
            },
          }
        : {}),
    }),
    // Only register Google if credentials are present
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  // Pages — custom sign-in route
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  // Callbacks
  callbacks: {
    // Attach user.role + user.tier to the JWT
    async jwt({ token, user, trigger }) {
      // Initial sign-in: fetch user from DB to get role + tier
      if (user) {
        token.role = user.role || "STUDENT";
        token.tier = user.tier || "STUDENT";
        token.userId = user.id;
      }
      // On session update (e.g. after upgrade), re-fetch role + tier
      if (trigger === "update" || !token.role) {
        if (token.email) {
          const dbUser = await db.user.findUnique({
            where: { email: token.email },
            include: { subscription: true },
          });
          if (dbUser) {
            token.role = dbUser.role;
            token.tier = dbUser.subscription?.tier || dbUser.role;
            token.userId = dbUser.id;
            token.subscriptionStatus = dbUser.subscription?.status || "FREE";
          }
        }
      }
      return token;
    },
    // Forward role + tier to the session
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.tier = token.tier as string;
        session.user.subscriptionStatus = token.subscriptionStatus as string;
      }
      return session;
    },
    // Allow sign-in for any email (no domain restriction in v1)
    async signIn({ user, email }) {
      // Blocklist could go here (e.g. banned users)
      return true;
    },
  },
  // Events — create Subscription record on first sign-in
  events: {
    async createUser({ user }) {
      // Auto-create a free-tier Subscription when a new User signs up
      if (user.id) {
        await db.subscription.create({
          data: {
            userId: user.id,
            status: "FREE",
            tier: "STUDENT",
          },
        });
        console.log(`[auth] Created FREE subscription for user ${user.email}`);
      }
    },
  },
  // Trust host header (required for Vercel + reverse proxies)
  trustHost: true,
});

// Type augmentation for the JWT + Session
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string; // STUDENT | FARMER | FEED_MILL | COOPERATIVE | ADMIN
      tier: string; // STUDENT | FARMER | FEED_MILL | COOPERATIVE
      subscriptionStatus: string; // FREE | TRIALING | ACTIVE | PAST_DUE | CANCELED
    };
  }
  interface User {
    role?: string;
    tier?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    tier?: string;
    subscriptionStatus?: string;
  }
}
