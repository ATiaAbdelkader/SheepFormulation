import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OvinFormulation v1.0 — Rationnement des ovins",
  description: "Outil pédagogique de formulation de rations pour ovins : besoins des animaux, valeurs alimentaires des fourrages et concentrés, calcul de ration, bilan fourrager, suivi de pâturage. D'après Abdelkader Atia, AgriSkills Academy.",
  keywords: ["ovins", "brebis", "ration", "alimentation", "fourrage", "UFL", "PDI", "Agneaux", "OvinFormulation"],
  authors: [{ name: "Abdelkader Atia - AgriSkills Academy" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
