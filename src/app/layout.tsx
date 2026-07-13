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
  title: "Alim'OVINS v5.1 — Rationnement des ovins",
  description: "Outil pédagogique de formulation de rations pour ovins : besoins des animaux, valeurs alimentaires des fourrages et concentrés, calcul de ration, bilan fourrager, suivi de pâturage. D'après Fabrice RANOUX, Lycée Agricole du Bourbonnais.",
  keywords: ["ovins", "brebis", "ration", "alimentation", "fourrage", "UFL", "PDI", "Agneaux", "Alim'OVINS"],
  authors: [{ name: "Fabrice RANOUX - Lycée Agricole du Bourbonnais" }],
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
