import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/lib/language-context";
import { AuthSessionProvider } from "@/components/providers/session-provider";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OvinFormulation v1.0 — Sheep Feed Formulation | تركيب علائق الأغنام",
  description: "Professional sheep feed formulation platform: ration calculator, LP optimization, rumen simulator, AI assistant, feed mill management. FR/EN/AR.",
  keywords: ["ovins", "sheep", "ration", "feed formulation", "أغنام", "عليقة", "UFL", "PDI", "AgriSkills Academy"],
  authors: [{ name: "Abdelkader Atia - AgriSkills Academy" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OvinFormulation",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#047857",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="OvinFormulation" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        className={`${cairo.variable} font-cairo antialiased bg-background text-foreground`}
        style={{ fontFamily: "var(--font-cairo), system-ui, sans-serif" }}
      >
        <AuthSessionProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </AuthSessionProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('[PWA] ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('[PWA] ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
