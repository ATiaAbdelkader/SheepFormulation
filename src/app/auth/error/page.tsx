// src/app/auth/error/page.tsx — Auth error page
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <Card className="w-full max-w-md border-stone-200">
        <CardHeader className="text-center">
          <AlertCircle className="h-12 w-12 text-rose-600 mx-auto mb-2" />
          <CardTitle className="text-lg text-stone-900">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-sm text-stone-600">
            Something went wrong during sign-in. The magic link may have expired or already been used.
          </p>
          <Link href="/auth/signin">
            <Button className="w-full bg-emerald-700 hover:bg-emerald-800">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Try again
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="w-full text-stone-600">
              Back to home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
