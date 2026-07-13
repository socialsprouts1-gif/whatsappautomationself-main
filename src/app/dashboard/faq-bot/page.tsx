"use client";

import { useState } from "react";
import { Plus, Trash2, HelpCircle, Check, X } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  enabled: boolean;
  triggeredCount: number;
  createdAt: string;
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative w-11 rounded-full transition-colors flex-shrink-0"
      style={{ height: 24, background: on ? "#16a34a" : "#d1d5db" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: on ? "calc(100% - 22px)" : "2px" }}
      />
    </button>
  );
}

export default function FaqBotPage() {
  const { data, refetch } = useApi<{ faqs: Faq[] }>("/api/faq-bot");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ question: "", answer: "", category: "" });

  const faqs = data?.faqs ?? [];
  const categories = Array.from(new Set(faqs.map((f) => f.category))).sort();
  const filtered = categoryFilter === "all" ? faqs : faqs.filter((f) => f.category === categoryFilter);

  async function create() {
    if (!form.question || !form.answer) return;
    await mutate("/api/faq-bot", "POST", {
      question: form.question, answer: form.answer, category: form.category || undefined,
    });
    setForm({ question: "", answer: "", category: "" });
    setCreating(false);
    refetch();
  }

  async function toggleEnabled(f: Faq) {
    await mutate("/api/faq-bot", "PATCH", { id: f.id, enabled: !f.enabled });
    refetch();
  }

  async function remove(id: string) {
    if (!confirm("Delete this FAQ? This cannot be undone.")) return;
    await fetch(`/api/faq-bot?id=${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="FAQ Bot" subtitle="Automated answers to common customer questions" />
      <div className="p-6 space-y-5">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                categoryFilter === "all" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}>
              All
            </button>
            {categories.map((c) => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  categoryFilter === c ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => setCreating((c) => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New FAQ
          </button>
        </div>

        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Create new FAQ</h3>
            <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })}
              placeholder="Question"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
            <textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} rows={3}
              placeholder="Answer"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Category (optional, defaults to General)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
            <div className="flex gap-2">
              <button onClick={create} disabled={!form.question || !form.answer}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => setCreating(false)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="py-12 text-center text-gray-400 text-sm">No FAQs yet.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((f) => (
              <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold text-gray-800 text-sm">{f.question}</span>
                  </div>
                  <Toggle on={f.enabled} onClick={() => toggleEnabled(f)} />
                </div>
                <p className="text-sm text-gray-500 flex-1">{f.answer}</p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe" }}>
                    {f.category}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe" }}>
                    Triggered {f.triggeredCount} times
                  </span>
                  <button onClick={() => remove(f.id)}
                    className="ml-auto p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
