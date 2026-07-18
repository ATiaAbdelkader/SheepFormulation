// src/app/api/auth/[...nextauth]/route.ts
// NextAuth v5 route handler — exposes GET + POST at /api/auth/*
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
