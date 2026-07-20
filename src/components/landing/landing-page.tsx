"use client";

import { useState, useEffect } from "react";
import {
  Wheat, Calculator, Zap, Sparkles, Atom, Factory, GraduationCap,
  ArrowRight, Play, Check, Globe, Menu, X, Star, ShieldCheck,
  ChevronDown, Quote, Lock,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ============================================================
// Landing page — full-screen marketing experience
// Shows when user is NOT signed in. Once authenticated, page.tsx
// redirects to the app.
// ============================================================

export function LandingPage({ onOpenApp }: { onOpenApp?: () => void }) {
  const { t, lang, setLang, isRTL } = useLanguage();
  const { data: session, status } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goToSignin = () => {
    window.location.href = "/auth/signin";
  };

  const handlePrimaryCta = () => {
    // If user is signed in, open the app. Otherwise, go to signup.
    if (status === "authenticated") {
      onOpenApp?.();
    } else {
      window.location.href = "/auth/signin?mode=signup";
    }
  };

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? "rtl" : "ltr"}>
      {/* ───────────────────────────────────────────────────────────────
          NAV BAR
          ─────────────────────────────────────────────────────────────── */}
      <nav
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm"
            : "bg-transparent",
        )}
      >
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm">
                <Wheat className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-stone-900">
                  OvinFormulation <span className="text-emerald-700">v1.0</span>
                </span>
                <span className="text-[9px] text-stone-500 uppercase tracking-wider">
                  {t("landing_hero_kicker")}
                </span>
              </div>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <a href="#features" className="text-stone-700 hover:text-emerald-700 transition-colors">
                {t("landing_nav_features")}
              </a>
              <a href="#pricing" className="text-stone-700 hover:text-emerald-700 transition-colors">
                {t("landing_nav_pricing")}
              </a>
              <a href="#faq" className="text-stone-700 hover:text-emerald-700 transition-colors">
                {t("landing_nav_faq")}
              </a>
            </div>

            {/* Right actions */}
            <div className="hidden md:flex items-center gap-2">
              <LanguageSwitcher lang={lang} setLang={setLang} />
              {status === "authenticated" ? (
                <Button
                  onClick={() => onOpenApp?.()}
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 gap-1.5"
                >
                  {t("landing_nav_open_app")}
                  <ArrowRight className="h-3.5 w-3.5 rtl-flip" />
                </Button>
              ) : (
                <>
                  <Button
                    onClick={goToSignin}
                    variant="ghost"
                    size="sm"
                    className="text-stone-700"
                  >
                    {t("landing_nav_signin")}
                  </Button>
                  <Button
                    onClick={handlePrimaryCta}
                    size="sm"
                    className="bg-emerald-700 hover:bg-emerald-800"
                  >
                    {t("landing_nav_get_started")}
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="flex md:hidden items-center gap-2">
              <LanguageSwitcher lang={lang} setLang={setLang} />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-stone-700 hover:bg-stone-100 rounded-md"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-stone-200 bg-white py-3 space-y-1">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                {t("landing_nav_features")}
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                {t("landing_nav_pricing")}
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                {t("landing_nav_faq")}
              </a>
              <div className="pt-2 px-4 flex flex-col gap-2">
                <Button
                  onClick={() => { setMobileMenuOpen(false); goToSignin(); }}
                  variant="outline"
                  size="sm"
                >
                  {t("landing_nav_signin")}
                </Button>
                <Button
                  onClick={() => { setMobileMenuOpen(false); handlePrimaryCta(); }}
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  {t("landing_nav_get_started")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* ───────────────────────────────────────────────────────────────
          HERO
          ─────────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 overflow-hidden">
        {/* Background gradient + decorative shapes */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-white to-amber-50" />
        <div className="absolute top-20 right-0 -z-10 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />

        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: text content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 mb-5">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                {t("landing_hero_kicker")}
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-stone-900 mb-5 tracking-tight">
                {t("landing_hero_title").split(" ").slice(0, -2).join(" ")}{" "}
                <span className="bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">
                  {t("landing_hero_title").split(" ").slice(-2).join(" ")}
                </span>
              </h1>
              <p className="text-base sm:text-lg text-stone-600 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">
                {t("landing_hero_subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button
                  onClick={handlePrimaryCta}
                  size="lg"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white shadow-lg shadow-emerald-200 gap-2 h-12 px-6"
                >
                  {t("landing_hero_cta_primary")}
                  <ArrowRight className="h-4 w-4 rtl-flip" />
                </Button>
                <Button
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                  variant="outline"
                  size="lg"
                  className="border-stone-300 text-stone-700 hover:bg-stone-50 gap-2 h-12 px-6"
                >
                  <Play className="h-4 w-4" />
                  {t("landing_hero_cta_secondary")}
                </Button>
              </div>

              {/* Trust indicators under CTA */}
              <div className="mt-6 flex items-center justify-center lg:justify-start gap-4 text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{lang === "fr" ? "Sans carte bancaire" : lang === "ar" ? "بدون بطاقة بنكية" : "No credit card"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{lang === "fr" ? "14 jours d'essai" : lang === "ar" ? "تجربة 14 يوماً" : "14-day trial"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{lang === "fr" ? "Annulation 1-clic" : lang === "ar" ? "إلغاء بنقرة" : "Cancel anytime"}</span>
                </div>
              </div>
            </div>

            {/* Right: visual mockup */}
            <HeroMockup />
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatCard value="3,200+" label={t("landing_hero_stats_users")} icon="👥" />
            <StatCard value="22" label={t("landing_hero_stats_modules")} icon="🧩" />
            <StatCard value="3" label={t("landing_hero_stats_languages")} icon="🌍" />
            <StatCard value="650+" label={t("landing_hero_stats_feeds")} icon="🌾" />
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          FEATURES
          ─────────────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 bg-stone-50">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <SectionHeader
            kicker={t("landing_features_kicker")}
            title={t("landing_features_title")}
            subtitle={t("landing_features_subtitle")}
          />

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Calculator className="h-6 w-6" />}
              title={t("landing_features_1_title")}
              desc={t("landing_features_1_desc")}
              color="emerald"
              index={1}
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title={t("landing_features_2_title")}
              desc={t("landing_features_2_desc")}
              color="amber"
              index={2}
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title={t("landing_features_3_title")}
              desc={t("landing_features_3_desc")}
              color="purple"
              index={3}
            />
            <FeatureCard
              icon={<Atom className="h-6 w-6" />}
              title={t("landing_features_4_title")}
              desc={t("landing_features_4_desc")}
              color="cyan"
              index={4}
            />
            <FeatureCard
              icon={<Factory className="h-6 w-6" />}
              title={t("landing_features_5_title")}
              desc={t("landing_features_5_desc")}
              color="orange"
              index={5}
            />
            <FeatureCard
              icon={<GraduationCap className="h-6 w-6" />}
              title={t("landing_features_6_title")}
              desc={t("landing_features_6_desc")}
              color="indigo"
              index={6}
            />
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          PRICING
          ─────────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 sm:py-28 bg-white">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <SectionHeader
            kicker={t("landing_pricing_kicker")}
            title={t("landing_pricing_title")}
            subtitle={t("landing_pricing_subtitle")}
          />

          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Student */}
            <PricingCard
              name={t("landing_pricing_student_name")}
              price={t("landing_pricing_student_price")}
              period=""
              desc={t("landing_pricing_student_desc")}
              features={[
                t("landing_pricing_student_feat_1"),
                t("landing_pricing_student_feat_2"),
                t("landing_pricing_student_feat_3"),
              ]}
              cta={t("landing_pricing_cta_student")}
              onClick={handlePrimaryCta}
              popular={false}
              color="stone"
            />

            {/* Farmer — popular */}
            <PricingCard
              name={t("landing_pricing_farmer_name")}
              price={t("landing_pricing_farmer_price")}
              period={t("landing_pricing_per_month")}
              desc={t("landing_pricing_farmer_desc")}
              features={[
                t("landing_pricing_farmer_feat_1"),
                t("landing_pricing_farmer_feat_2"),
                t("landing_pricing_farmer_feat_3"),
                t("landing_pricing_farmer_feat_4"),
              ]}
              cta={t("landing_pricing_cta_farmer")}
              onClick={handlePrimaryCta}
              popular
              color="emerald"
            />

            {/* Feed Mill */}
            <PricingCard
              name={t("landing_pricing_feedmill_name")}
              price={t("landing_pricing_feedmill_price")}
              period={t("landing_pricing_per_month")}
              desc={t("landing_pricing_feedmill_desc")}
              features={[
                t("landing_pricing_feedmill_feat_1"),
                t("landing_pricing_feedmill_feat_2"),
                t("landing_pricing_feedmill_feat_3"),
                t("landing_pricing_feedmill_feat_4"),
              ]}
              cta={t("landing_pricing_cta_feedmill")}
              onClick={() => (window.location.href = "mailto:contact@agriskills.academy?subject=Feed%20Mill%20tier%20inquiry")}
              popular={false}
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          TESTIMONIALS
          ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-700/50 px-3 py-1 text-xs font-medium text-emerald-100 mb-4">
              <Star className="h-3 w-3 fill-emerald-200" />
              {t("landing_testimonials_kicker")}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">{t("landing_testimonials_title")}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/10 backdrop-blur p-6 border border-white/20"
              >
                <Quote className="h-7 w-7 text-emerald-300 mb-3" />
                <p className="text-sm leading-relaxed text-emerald-50 mb-5">
                  "{t(`landing_testimonials_${i}_quote` as any)}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
                    {i === 1 ? "MB" : i === 2 ? "KM" : "SH"}
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-white">
                      {t(`landing_testimonials_${i}_author` as any)}
                    </div>
                    <div className="flex gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className="h-3 w-3 fill-amber-300 text-amber-300" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          FAQ
          ─────────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 sm:py-28 bg-stone-50">
        <div className="container mx-auto px-4 sm:px-6 max-w-3xl">
          <SectionHeader
            kicker={t("landing_faq_kicker")}
            title={t("landing_faq_title")}
          />

          <div className="mt-10 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  className="rounded-xl border border-stone-200 bg-white overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-stone-900 pr-3">
                      {t(`landing_faq_${i}_q` as any)}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-stone-500 flex-shrink-0 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm text-stone-600 leading-relaxed">
                      {t(`landing_faq_${i}_a` as any)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          FINAL CTA
          ─────────────────────────────────────────────────────────────── */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="container mx-auto px-4 sm:px-6 max-w-5xl">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-900 px-6 py-16 sm:px-12 sm:py-20 text-center shadow-2xl shadow-emerald-200">
            {/* Decorative shapes */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-emerald-500/30 blur-2xl" />
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-amber-400/20 blur-2xl" />

            <div className="relative">
              <Wheat className="h-10 w-10 text-emerald-200 mx-auto mb-4" />
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                {t("landing_cta_title")}
              </h2>
              <p className="text-emerald-100 text-base sm:text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                {t("landing_cta_subtitle")}
              </p>
              <Button
                onClick={handlePrimaryCta}
                size="lg"
                className="bg-white text-emerald-800 hover:bg-emerald-50 shadow-xl gap-2 h-12 px-8 text-base"
              >
                {t("landing_cta_button")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </Button>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-emerald-200">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>RGPD</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" />
                  <span>{lang === "fr" ? "Données chiffrées" : lang === "ar" ? "بيانات مشفرة" : "Encrypted data"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  <span>FR · EN · AR</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────────
          FOOTER
          ─────────────────────────────────────────────────────────────── */}
      <footer className="bg-stone-900 text-stone-400 py-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <Wheat className="h-4 w-4" />
                </div>
                <span className="text-sm font-bold text-white">
                  OvinFormulation <span className="text-emerald-400">v1.0</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed max-w-xs">
                {t("landing_footer_tagline") || (lang === "fr"
                  ? "OvinFormulation v1.0 — Rationnement des ovins. D'après Abdelkader Atia, AgriSkills Academy."
                  : lang === "ar"
                  ? "أوفين فورميولاسيون v1.0 — تركيب علائق الأغنام. وفقاً لعبد القادر عطية، أكاديمية أغري سكلز."
                  : "OvinFormulation v1.0 — Sheep feed formulation. After Abdelkader Atia, AgriSkills Academy.")}
              </p>
            </div>
            <FooterCol title={t("landing_footer_product") || "Product"} links={["Features", "Pricing", "Modules", "Demo"]} />
            <FooterCol title={t("landing_footer_company") || "Company"} links={["About", "Blog", "Careers", "Contact"]} />
            <FooterCol title={t("landing_footer_resources") || "Resources"} links={["Documentation", "API", "Community", "Status"]} />
          </div>
          <div className="border-t border-stone-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
            <p>© 2026 AgriSkills Academy. {t("landing_footer_rights") || "All rights reserved"}.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-emerald-400">Terms</a>
              <a href="#" className="hover:text-emerald-400">Privacy</a>
              <a href="#" className="hover:text-emerald-400">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function LanguageSwitcher({ lang, setLang }: { lang: string; setLang: (l: any) => void }) {
  const [open, setOpen] = useState(false);
  const langs = [
    { id: "fr", label: "Français", flag: "🇫🇷" },
    { id: "en", label: "English", flag: "🇬🇧" },
    { id: "ar", label: "العربية", flag: "🇩🇿" },
  ];
  const current = langs.find((l) => l.id === lang) || langs[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100 transition-colors"
      >
        <Globe className="h-3.5 w-3.5" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 rounded-md border border-stone-200 bg-white shadow-lg z-50 py-1">
            {langs.map((l) => (
              <button
                key={l.id}
                onClick={() => { setLang(l.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-stone-50",
                  lang === l.id && "bg-stone-50 font-medium text-emerald-700",
                )}
              >
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ value, label, icon }: { value: string; label: string; icon: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl sm:text-3xl font-bold text-stone-900">{value}</div>
      <div className="text-xs text-stone-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function SectionHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <div className="text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 mb-3 uppercase tracking-wider">
        {kicker}
      </div>
      <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-4 leading-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base text-stone-600 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

const FEATURE_COLORS = {
  emerald: { bg: "bg-emerald-50", icon: "text-emerald-700", hover: "hover:border-emerald-300 hover:shadow-emerald-100" },
  amber: { bg: "bg-amber-50", icon: "text-amber-700", hover: "hover:border-amber-300 hover:shadow-amber-100" },
  purple: { bg: "bg-purple-50", icon: "text-purple-700", hover: "hover:border-purple-300 hover:shadow-purple-100" },
  cyan: { bg: "bg-cyan-50", icon: "text-cyan-700", hover: "hover:border-cyan-300 hover:shadow-cyan-100" },
  orange: { bg: "bg-orange-50", icon: "text-orange-700", hover: "hover:border-orange-300 hover:shadow-orange-100" },
  indigo: { bg: "bg-indigo-50", icon: "text-indigo-700", hover: "hover:border-indigo-300 hover:shadow-indigo-100" },
} as const;

function FeatureCard({
  icon, title, desc, color, index,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: keyof typeof FEATURE_COLORS;
  index: number;
}) {
  const c = FEATURE_COLORS[color];
  return (
    <div
      className={cn(
        "group rounded-2xl border border-stone-200 bg-white p-6 transition-all hover:shadow-lg",
        c.hover,
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className={cn("inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4", c.bg, c.icon)}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
      <div className="mt-4 flex items-center gap-1 text-xs font-medium text-stone-400 group-hover:text-stone-600 transition-colors">
        <span>Learn more</span>
        <ArrowRight className="h-3 w-3 rtl-flip" />
      </div>
    </div>
  );
}

const PRICING_COLORS = {
  stone: { ring: "border-stone-200", btn: "bg-stone-900 hover:bg-stone-800", badge: "bg-stone-100 text-stone-700" },
  emerald: { ring: "border-emerald-400 ring-2 ring-emerald-100", btn: "bg-emerald-700 hover:bg-emerald-800", badge: "bg-emerald-100 text-emerald-800" },
  amber: { ring: "border-stone-200", btn: "bg-amber-700 hover:bg-amber-800", badge: "bg-amber-100 text-amber-800" },
} as const;

function PricingCard({
  name, price, period, desc, features, cta, onClick, popular, color,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  onClick: () => void;
  popular: boolean;
  color: keyof typeof PRICING_COLORS;
}) {
  const c = PRICING_COLORS[color];
  return (
    <div className={cn("relative rounded-2xl bg-white border-2 p-6 flex flex-col", c.ring)}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider shadow-md">
            ★ Popular
          </div>
        </div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-stone-900">{name}</h3>
        <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
      </div>
      <div className="mb-5">
        <span className="text-4xl font-bold text-stone-900">{price}</span>
        {period && <span className="text-sm text-stone-500 ml-1">{period}</span>}
      </div>
      <ul className="space-y-2.5 mb-6 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
            <Check className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={onClick}
        className={cn("w-full h-11", c.btn)}
        variant={popular ? "default" : "outline"}
      >
        {cta}
      </Button>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link}>
            <a href="#" className="text-xs text-stone-400 hover:text-emerald-400 transition-colors">
              {link}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// Hero mockup — visual representation of the dashboard
// ============================================================
function HeroMockup() {
  return (
    <div className="relative">
      {/* Main mockup card */}
      <div className="relative rounded-2xl bg-white shadow-2xl shadow-emerald-200/50 border border-stone-200 overflow-hidden">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-stone-100 border-b border-stone-200">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 mx-3">
            <div className="h-5 rounded bg-white border border-stone-200 px-2 flex items-center text-[9px] text-stone-400">
              ovinformulation.com
            </div>
          </div>
        </div>

        {/* App content — mini dashboard */}
        <div className="p-4 bg-stone-50">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center">
                <Wheat className="h-3 w-3 text-white" />
              </div>
              <div className="h-2 w-24 bg-stone-200 rounded" />
            </div>
            <div className="h-6 w-6 rounded-full bg-stone-200" />
          </div>

          {/* Hero card */}
          <div className="rounded-lg bg-gradient-to-br from-emerald-700 to-emerald-900 p-3 mb-3">
            <div className="h-2 w-20 bg-emerald-300/60 rounded mb-2" />
            <div className="h-3 w-32 bg-white/80 rounded mb-1" />
            <div className="h-2 w-40 bg-emerald-200/60 rounded" />
            <div className="mt-2 flex gap-1.5">
              <div className="h-5 w-16 bg-white rounded text-[8px] flex items-center justify-center text-emerald-800 font-bold">
                Start
              </div>
              <div className="h-5 w-16 bg-emerald-600/50 border border-emerald-400 rounded" />
            </div>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { v: "84", l: "Animals", c: "bg-amber-50 text-amber-700" },
              { v: "120", l: "Forages", c: "bg-lime-50 text-lime-700" },
              { v: "65", l: "Concent.", c: "bg-orange-50 text-orange-700" },
            ].map((s, i) => (
              <div key={i} className="rounded-md bg-white border border-stone-200 p-2">
                <div className={cn("text-lg font-bold", s.c.split(" ")[1])}>{s.v}</div>
                <div className="text-[8px] text-stone-500 uppercase">{s.l}</div>
              </div>
            ))}
          </div>

          {/* Module cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { i: <Calculator className="h-3.5 w-3.5" />, l: "Ration", c: "bg-emerald-50 text-emerald-700" },
              { i: <Zap className="h-3.5 w-3.5" />, l: "Optim.", c: "bg-amber-50 text-amber-700" },
              { i: <Sparkles className="h-3.5 w-3.5" />, l: "AI", c: "bg-purple-50 text-purple-700" },
              { i: <Atom className="h-3.5 w-3.5" />, l: "Rumen", c: "bg-cyan-50 text-cyan-700" },
            ].map((m, i) => (
              <div key={i} className="rounded-md bg-white border border-stone-200 p-2.5 flex items-center gap-2">
                <div className={cn("h-7 w-7 rounded-md flex items-center justify-center", m.c)}>
                  {m.i}
                </div>
                <div>
                  <div className="h-1.5 w-12 bg-stone-300 rounded mb-1" />
                  <div className="h-1.5 w-8 bg-stone-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="absolute -top-4 -right-4 rounded-xl bg-white shadow-lg border border-stone-200 p-3 max-w-[180px] hidden sm:block">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <span className="text-xs font-bold text-stone-900">AI Assistant</span>
        </div>
        <p className="text-[10px] text-stone-600 leading-tight">
          "50 brebis allaitantes, foin + orge…" → ration prête en 12s.
        </p>
      </div>

      <div className="absolute -bottom-4 -left-4 rounded-xl bg-white shadow-lg border border-stone-200 p-3 hidden sm:block">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-emerald-700" />
          </div>
          <div>
            <div className="text-xs font-bold text-stone-900">-18% coût</div>
            <div className="text-[10px] text-stone-500">vs ration actuelle</div>
          </div>
        </div>
      </div>
    </div>
  );
}
