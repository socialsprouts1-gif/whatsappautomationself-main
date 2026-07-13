"use client";

import { useState } from "react";
import { CreditCard, Calendar, CheckCircle2, Clock, XCircle, Receipt } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface BillingInfo {
  plan: string; priceMonthly: number; currency: string; renewalDate: string;
  messagesUsed: number; messagesLimit: number; paymentMethodLast4: string;
}
interface Invoice {
  id: string; amount: number; currency: string; status: "paid" | "due" | "failed"; date: string; planLabel: string;
}
interface BillingResponse { billing: BillingInfo; invoices: Invoice[] }

const PLAN_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Starter: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  Growth: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  Agency: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
};

const INVOICE_STATUS_STYLE: Record<string, { bg: string; text: string; border: string; Icon: typeof CheckCircle2 }> = {
  paid: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0", Icon: CheckCircle2 },
  due: { bg: "#fffbeb", text: "#d97706", border: "#fde68a", Icon: Clock },
  failed: { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3", Icon: XCircle },
};

const PLANS: { name: "Starter" | "Growth" | "Agency"; price: number; features: string[] }[] = [
  { name: "Starter", price: 29, features: ["1,000 messages / month", "1 WhatsApp number", "Email support"] },
  { name: "Growth", price: 79, features: ["25,000 messages / month", "3 WhatsApp numbers", "Priority support", "AI Assistant included"] },
  { name: "Agency", price: 199, features: ["Unlimited messages", "Unlimited WhatsApp numbers", "Dedicated account manager", "White-label branding"] },
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function BillingPage() {
  const { data, refetch } = useApi<BillingResponse>("/api/billing");
  const [switching, setSwitching] = useState<string | null>(null);

  const billing = data?.billing;
  const invoices = data?.invoices ?? [];

  async function changePlan(plan: string) {
    setSwitching(plan);
    await mutate("/api/billing", "POST", { plan });
    await refetch();
    setSwitching(null);
  }

  if (!billing) {
    return (
      <div className="min-h-full" style={{ background: "#f8f9fa" }}>
        <Header title="Billing" subtitle="Plan, usage and invoice history" />
      </div>
    );
  }

  const usagePct = Math.min(100, Math.round((billing.messagesUsed / billing.messagesLimit) * 100));
  const planStyle = PLAN_STYLE[billing.plan] ?? { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" };

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Billing" subtitle="Plan, usage and invoice history" />
      <div className="p-6 space-y-6">

        {/* Current plan card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
                style={{ background: planStyle.bg, color: planStyle.text, border: `1px solid ${planStyle.border}` }}>
                {billing.plan} plan
              </span>
              <span className="text-lg font-bold text-gray-800">
                ${billing.priceMonthly}<span className="text-sm font-normal text-gray-400">/mo</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="w-4 h-4 text-gray-400" /> Renews {fmtDate(billing.renewalDate)}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Messages this month</span>
              <span className="font-medium text-gray-700">
                {billing.messagesUsed.toLocaleString()} / {billing.messagesLimit.toLocaleString()} messages
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${usagePct}%`, background: usagePct > 90 ? "#e11d48" : "#2563eb" }} />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-gray-100 text-sm text-gray-600">
            <CreditCard className="w-4 h-4 text-gray-400" />
            Payment method: <span className="font-medium text-gray-800">•••• {billing.paymentMethodLast4}</span>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((p) => {
            const isCurrent = p.name === billing.plan;
            const label = isCurrent ? "Current plan" : p.price > billing.priceMonthly ? "Upgrade" : "Downgrade";
            return (
              <div key={p.name}
                className="bg-white rounded-xl p-5 flex flex-col"
                style={isCurrent ? { border: "2px solid #2563eb", boxShadow: "0 0 0 3px #eff6ff" } : { border: "1px solid #e5e7eb" }}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-800">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                      Current
                    </span>
                  )}
                </div>
                <div className="text-2xl font-black text-gray-800 mb-3">
                  ${p.price}<span className="text-sm font-normal text-gray-400">/mo</span>
                </div>
                <ul className="space-y-1.5 mb-5 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && changePlan(p.name)}
                  disabled={isCurrent || switching !== null}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                    isCurrent ? "border border-gray-200 text-gray-400" : "text-white bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {switching === p.name ? "Updating…" : label}
                </button>
              </div>
            );
          })}
        </div>

        {/* Invoice history */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-gray-500" /> Invoice history
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              {["Date", "Plan", "Amount", "Status"].map((h, i) => (
                <div key={i} className={`text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
                  i === 0 ? "col-span-3" : i === 1 ? "col-span-5" : i === 2 ? "col-span-2" : "col-span-2"
                }`}>{h}</div>
              ))}
            </div>
            {invoices.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No invoices yet.</div>
            ) : (
              invoices.map((inv) => {
                const st = INVOICE_STATUS_STYLE[inv.status] ?? INVOICE_STATUS_STYLE.due;
                return (
                  <div key={inv.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50 transition-colors">
                    <div className="col-span-3 text-sm text-gray-600">{fmtDate(inv.date)}</div>
                    <div className="col-span-5 text-sm text-gray-700">{inv.planLabel}</div>
                    <div className="col-span-2 text-sm font-medium text-gray-800">{inv.amount} {inv.currency}</div>
                    <div className="col-span-2">
                      <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 w-fit capitalize font-medium"
                        style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                        <st.Icon className="w-3 h-3" /> {inv.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
