"use client";

import { useState, Suspense, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Chrome, Wheat, ArrowLeft, Sparkles, Check, ShieldCheck, Globe, Lock } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

function AuthForm() {
  const { t, lang, setLang, isRTL } = useLanguage();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const error = searchParams.get("error");

  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | null>(null);
  const [sent, setSent] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Sync mode with URL param changes
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "signup" || m === "signin") {
      setMode(m);
    }
  }, [searchParams]);

  const isSignup = mode === "signup";

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading("email");
    // If signup, store the name temporarily so the user record can be enriched post-signin
    if (isSignup && name) {
      try {
        localStorage.setItem("ovinformulation:pendingName", name);
      } catch {}
    }
    await signIn("email", { email, callbackUrl, redirect: false });
    setLoading(null);
    setSent(true);
  };

  const handleGoogle = async () => {
    setLoading("google");
    if (isSignup && name) {
      try {
        localStorage.setItem("ovinformulation:pendingName", name);
      } catch {}
    }
    await signIn("google", { callbackUrl });
  };

  const switchMode = () => {
    const newMode = isSignup ? "signin" : "signup";
    setMode(newMode);
    setSent(false);
    // Update URL without full reload
    const url = new URL(window.location.href);
    url.searchParams.set("mode", newMode);
    window.history.replaceState({}, "", url.toString());
  };

  const langs = [
    { id: "fr", label: "Français", flag: "🇫🇷" },
    { id: "en", label: "English", flag: "🇬🇧" },
    { id: "ar", label: "العربية", flag: "🇩🇿" },
  ];
  const currentLang = langs.find((l) => l.id === lang) || langs[0];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white" dir={isRTL ? "rtl" : "ltr"}>
      {/* ───────────────────────────────────────────────────────────────
          LEFT — Marketing panel (desktop only)
          ─────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute top-20 right-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        {/* Top — back to home */}
        <div className="relative flex items-center justify-between">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-1.5 text-xs text-emerald-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 rtl-flip" />
            {t("auth_back_home")}
          </button>

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-100 hover:bg-emerald-700/50 transition-colors"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{currentLang.flag}</span>
              <span>{currentLang.label}</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 mt-1 w-36 rounded-md border border-emerald-700 bg-emerald-900 shadow-lg z-50 py-1">
                  {langs.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setLang(l.id as any); setLangOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-emerald-800 text-emerald-100",
                        lang === l.id && "bg-emerald-800 font-medium",
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
        </div>

        {/* Middle — branding + value prop */}
        <div className="relative space-y-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 shadow-xl shadow-emerald-900/50">
            <Wheat className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2 leading-tight">
              {isSignup ? t("auth_signup_title") : t("auth_signin_title")}
            </h1>
            <p className="text-emerald-200 text-sm leading-relaxed max-w-md">
              {isSignup ? t("auth_signup_subtitle") : t("auth_signin_subtitle")}
            </p>
          </div>

          {/* Bullet list of benefits */}
          <ul className="space-y-2.5">
            {(isSignup
              ? [
                  lang === "fr" ? "Configuration en 30 secondes" : lang === "ar" ? "إعداد في 30 ثانية" : "Setup in 30 seconds",
                  lang === "fr" ? "Tier Étudiant gratuit à vie" : lang === "ar" ? "فئة الطالب مجانية مدى الحياة" : "Free Student tier forever",
                  lang === "fr" ? "Aucune carte bancaire requise" : lang === "ar" ? "بدون بطاقة بنكية" : "No credit card required",
                ]
              : [
                  lang === "fr" ? "Accès à 22 modules" : lang === "ar" ? "الوصول إلى 22 وحدة" : "Access to 22 modules",
                  lang === "fr" ? "Vos rations sauvegardées" : lang === "ar" ? "علائقك المحفوظة" : "Your saved rations",
                  lang === "fr" ? "Synchronisé sur tous vos appareils" : lang === "ar" ? "متزامن على جميع أجهزتك" : "Synced across your devices",
                ]
            ).map((b, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-emerald-100">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/30">
                  <Check className="h-3 w-3 text-emerald-200" />
                </div>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — testimonial + trust */}
        <div className="relative space-y-3">
          <div className="rounded-xl bg-emerald-800/50 border border-emerald-700/50 p-4 backdrop-blur">
            <p className="text-sm text-emerald-100 italic leading-relaxed">
              "{t("landing_testimonials_1_quote")}"
            </p>
            <p className="text-xs text-emerald-300 mt-2 font-medium">
              — {t("landing_testimonials_1_author")}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-emerald-300">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>RGPD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              <span>{lang === "fr" ? "Chiffré" : lang === "ar" ? "مشفّر" : "Encrypted"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>FR · EN · AR</span>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────
          RIGHT — Form panel
          ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-stone-50 relative">
        {/* Mobile language switcher (top-right) */}
        <div className="absolute top-4 right-4 lg:hidden">
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:bg-stone-100"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{currentLang.flag}</span>
            </button>
            {langOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                <div className="absolute right-0 mt-1 w-36 rounded-md border border-stone-200 bg-white shadow-lg z-50 py-1">
                  {langs.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => { setLang(l.id as any); setLangOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-stone-50 text-stone-700",
                        lang === l.id && "bg-stone-50 font-medium",
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
        </div>

        {/* Mobile back link */}
        <button
          onClick={() => (window.location.href = "/")}
          className="absolute top-4 left-4 lg:hidden flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl-flip" />
          {t("auth_back_home")}
        </button>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8 mt-12">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 shadow-lg shadow-emerald-200 mb-3">
              <Wheat className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-stone-900">
              OvinFormulation <span className="text-emerald-700">v1.0</span>
            </h1>
          </div>

          {/* Title for desktop */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-stone-900 mb-1">
              {isSignup ? t("auth_signup_title") : t("auth_signin_title")}
            </h2>
            <p className="text-sm text-stone-500">
              {isSignup ? t("auth_signup_subtitle") : t("auth_signin_subtitle")}
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {error}
            </div>
          )}

          {sent ? (
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="p-6 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 mb-3">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  {lang === "fr" ? "Vérifiez votre boîte mail" : lang === "ar" ? "تحقق من بريدك" : "Check your inbox"}
                </h3>
                <p className="text-xs text-stone-600 mb-4 leading-relaxed">
                  {t("auth_check_email")}
                </p>
                <p className="text-[10px] text-stone-500">
                  {email}
                </p>
                <Button
                  onClick={() => setSent(false)}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  {lang === "fr" ? "Utiliser un autre email" : lang === "ar" ? "استخدم بريداً آخر" : "Use a different email"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Google */}
              <Button
                onClick={handleGoogle}
                disabled={loading !== null}
                variant="outline"
                className="w-full h-12 gap-2 bg-white border-stone-300 hover:bg-stone-50"
              >
                {loading === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Chrome className="h-4 w-4" />
                )}
                {t("auth_continue_google")}
              </Button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-[10px] uppercase tracking-wider text-stone-400">
                  {t("auth_or")}
                </span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* Email form */}
              <form onSubmit={handleEmail} className="space-y-3">
                {isSignup && (
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-xs text-stone-600">
                      {t("auth_name_label")}
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder={t("auth_name_placeholder")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-11"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs text-stone-600">
                    {t("auth_email_label")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("auth_email_placeholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
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
                  {t("auth_send_magic_link")}
                </Button>
              </form>

              {/* Terms */}
              <p className="text-[10px] text-stone-400 text-center pt-2 leading-relaxed">
                {t("auth_terms")}
              </p>

              {/* Switch signin/signup */}
              <div className="text-center pt-3 border-t border-stone-200 mt-4">
                <button
                  onClick={switchMode}
                  className="text-xs text-emerald-700 hover:text-emerald-800 hover:underline font-medium"
                >
                  {isSignup ? t("auth_switch_to_signin") : t("auth_switch_to_signup")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
