"use client";

import { useState } from "react";
import { Plus, Wallet, Clock, XCircle, RotateCcw, Check } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

type TxnStatus = "paid" | "pending" | "failed" | "refunded";

interface Transaction {
  id: string;
  contactId?: string;
  contactName: string;
  amount: number;
  currency: string;
  status: TxnStatus;
  method: string;
  reference: string;
  createdAt: string;
}

const STATUS_COLOR: Record<TxnStatus, { bg: string; text: string; border: string }> = {
  paid:     { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  pending:  { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  failed:   { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
  refunded: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
};

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function TransactionsPage() {
  const { data, refetch } = useApi<{ transactions: Transaction[] }>("/api/transactions");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    contactName: "", amount: "", currency: "USD", method: "Card", status: "paid" as TxnStatus,
  });

  const transactions = [...(data?.transactions ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const paidTxns = transactions.filter((t) => t.status === "paid");
  const totalPaid = paidTxns.reduce((s, t) => s + t.amount, 0);
  const totalPaidCurrency = paidTxns[0]?.currency ?? "USD";
  const counts = {
    pending: transactions.filter((t) => t.status === "pending").length,
    failed: transactions.filter((t) => t.status === "failed").length,
    refunded: transactions.filter((t) => t.status === "refunded").length,
  };

  async function logTransaction() {
    const amountNum = parseFloat(form.amount);
    if (!form.contactName || !amountNum || amountNum <= 0) return;
    await mutate("/api/transactions", "POST", {
      contactName: form.contactName,
      amount: amountNum,
      currency: form.currency,
      method: form.method,
      status: form.status,
    });
    setForm({ contactName: "", amount: "", currency: "USD", method: "Card", status: "paid" });
    setCreating(false);
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Transactions" subtitle="Payment activity across your WhatsApp store" />
      <div className="p-6 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Paid", value: formatMoney(totalPaid, totalPaidCurrency), icon: Wallet, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: "Pending", value: counts.pending, icon: Clock, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
            { label: "Failed", value: counts.failed, icon: XCircle, color: "#e11d48", bg: "#fff1f2", border: "#fecdd3" },
            { label: "Refunded", value: counts.refunded, icon: RotateCcw, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: s.border }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={() => setCreating((c) => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Log transaction
          </button>
        </div>

        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Log manual transaction</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                placeholder="Contact name"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Amount"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
              </select>
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700"
              >
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TxnStatus })}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700 w-full md:w-48"
            >
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={logTransaction}
                disabled={!form.contactName || !form.amount}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            {["Date", "Contact", "Amount", "Method", "Reference", "Status"].map((h, i) => (
              <div
                key={i}
                className={`text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
                  i === 0 ? "col-span-2" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-2" : i === 4 ? "col-span-2" : "col-span-1"
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No transactions yet.</div>
          ) : (
            transactions.map((t) => {
              const sc = STATUS_COLOR[t.status] ?? STATUS_COLOR.pending;
              return (
                <div key={t.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-2 text-xs text-gray-500">{formatDate(t.createdAt)}</div>
                  <div className="col-span-3 text-sm font-medium text-gray-800 truncate">{t.contactName}</div>
                  <div className="col-span-2 text-sm font-semibold text-gray-800">{formatMoney(t.amount, t.currency)}</div>
                  <div className="col-span-2 text-sm text-gray-600">{t.method}</div>
                  <div className="col-span-2 text-xs font-mono text-gray-500 truncate">{t.reference}</div>
                  <div className="col-span-1">
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium"
                      style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                    >
                      {t.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
