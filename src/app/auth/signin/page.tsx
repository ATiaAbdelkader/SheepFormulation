// src/app/auth/signin/page.tsx — Sign-in page with Email + Google
"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Chrome, Wheat } from "lucide-react";

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading("email");
    await signIn("email", { email, callbackUrl, redirect: false });
    setLoading(null);
    // Show "check your email" message
    setEmail("");
    alert("Check your email for a magic sign-in link!");
  };

  const handleGoogle = async () => {
    setLoading("google");
    await signIn("google", { callbackUrl });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <Card className="w-full max-w-md border-stone-200">
        <CardHeader className="text-center pb-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm mx-auto mb-3">
            <Wheat className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl font-bold text-stone-900">
            Sign in to OvinFormulation
          </CardTitle>
          <p className="text-xs text-stone-500 mt-1">
            Access 22 modules for sheep nutrition, ration formulation & feed mill management.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              Sign-in error: {error}
            </div>
          )}

          <Button
            onClick={handleGoogle}
            disabled={loading !== null}
            variant="outline"
            className="w-full h-11 gap-2"
          >
            {loading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Chrome className="h-4 w-4" />
            )}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-[10px] uppercase tracking-wider text-stone-400">or</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          <form onSubmit={handleEmail} className="space-y-2">
            <Label htmlFor="email" className="text-xs text-stone-600">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11"
            />
            <Button
              type="submit"
              disabled={loading !== null || !email.trim()}
              className="w-full h-11 gap-2 bg-emerald-700 hover:bg-emerald-800"
            >
              {loading === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send magic link
            </Button>
          </form>

          <p className="text-[10px] text-stone-400 text-center pt-2 leading-relaxed">
            By signing in, you agree to the Terms of Service and Privacy Policy.
            New users get a free Student tier account automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <SignInForm />
    </Suspense>
  );
}
