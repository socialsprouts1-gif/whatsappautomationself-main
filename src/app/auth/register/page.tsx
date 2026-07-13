"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

const perks = [
  "14-day free trial, no credit card",
  "AI chatbots included",
  "Unlimited workflows",
  "Full CRM access",
  "Cancel anytime",
];

const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+91", flag: "🇮🇳" },
  { code: "+55", flag: "🇧🇷" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  const canSubmit = firstName.trim() && lastName.trim() && email.trim() && password.length >= 8 && agreed && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          companyName: companyName.trim(),
          phone: phoneLocal.trim() ? `${countryCode}${phoneLocal.trim()}` : undefined,
          password,
        }),
      });
      const json = await res.json() as { ok: boolean; error?: string };
      if (!json.ok) {
        setError(json.error ?? "Could not create your account.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] flex relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#00FF87]/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#00D4FF]/5 rounded-full blur-[120px]" />

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00FF87] to-[#00D4FF] flex items-center justify-center shadow-[0_0_24px_rgba(0,255,135,0.5)]">
            <Zap className="w-4 h-4 text-[#050508]" />
          </div>
          <span className="font-bold text-lg">WhatsFlow <span className="gradient-text-green">AI</span></span>
        </Link>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-black leading-tight mb-4">
              Start automating your WhatsApp{" "}
              <span className="gradient-text-green">business today</span>
            </h2>
            <p className="text-white/60 leading-relaxed">
              Join 50,000+ businesses using WhatsFlow AI to automate customer support,
              generate leads, and grow revenue on WhatsApp.
            </p>
          </div>

          <div className="space-y-3">
            {perks.map((perk) => (
              <div key={perk} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#00FF87]/15 border border-[#00FF87]/30 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-3 h-3 text-[#00FF87]" />
                </div>
                <span className="text-sm text-white/70">{perk}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="glass-card p-5">
            <p className="text-sm text-white/70 italic mb-4">
              &ldquo;WhatsFlow AI helped us 3x our conversions in 30 days. The AI chatbot
              handles 90% of our customer queries automatically.&rdquo;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00FF87]/20 flex items-center justify-center text-sm font-bold text-[#00FF87]">S</div>
              <div>
                <div className="text-xs font-semibold">Sarah Mitchell</div>
                <div className="text-xs text-white/40">Founder, StyleHouse</div>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-400 text-xs">★</span>)}
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-white/30">
          © 2024 WhatsFlow AI · Privacy · Terms
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex justify-center mb-6 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00FF87] to-[#00D4FF] flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#050508]" />
              </div>
              <span className="font-bold text-lg">WhatsFlow <span className="gradient-text-green">AI</span></span>
            </Link>
          </div>

          <div className="glass-card p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold mb-2">Create your account</h1>
              <p className="text-white/50 text-sm">Start your 14-day free trial — no credit card needed</p>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Alex"
                    className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Johnson"
                    className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Work Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Your Company Ltd."
                  className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Phone Number</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-white/5 border border-white/12 rounded-xl px-3 py-3 text-sm text-white/70 focus:outline-none focus:border-[#00FF87]/50 transition-all w-24"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="555 0100"
                    className="flex-1 bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#00FF87]/50 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-3 py-1">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#00FF87]"
                />
                <label htmlFor="terms" className="text-xs text-white/50 leading-relaxed cursor-pointer">
                  I agree to the Terms of Service and Privacy Policy
                </label>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl text-sm bg-red-500/10 border border-red-500/25 text-red-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary w-full justify-center py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    Create Free Account
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-white/50 mt-5">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#00FF87] font-medium hover:text-[#00CC6A] transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
