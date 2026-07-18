// src/components/providers/session-provider.tsx
// Wraps next-auth SessionProvider so client components can call useSession()
"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
