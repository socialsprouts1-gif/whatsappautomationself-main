"use client";

import { useState } from "react";
import { Plus, Layers, CheckCircle, Clock, XCircle, Trash2, Copy } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Template {
  id: string; name: string; category: string; language: string;
  status: string; body: string; variableCount: number;
}

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; Icon: typeof CheckCircle }> = {
  approved: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0", Icon: CheckCircle },
  pending:  { bg: "#fffbeb", text: "#d97706", border: "#fde68a", Icon: Clock },
  rejected: { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3", Icon: XCircle },
};

const CAT_COLOR: Record<string, string> = {
  marketing: "#7c3aed", utility: "#2563eb", authentication: "#d97706",
};

export default function TemplatesPage() {
  const { data, refetch } = useApi<{ templates: Template[] }>("/api/templates");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", category: "utility", body: "" });
  const [copied, setCopied] = useState<string | null>(null);

  const templates = data?.templates ?? [];

  async function create() {
    if (!form.name || !form.body) return;
    await mutate("/api/templates", "POST", form);
    setForm({ name: "", category: "utility", body: "" });
    setCreating(false);
    refetch();
  }

  function copyBody(id: string, body: string) {
    navigator.clipboard.writeText(body).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  const counts = {
    approved: templates.filter(t => t.status === "approved").length,
    pending: templates.filter(t => t.status === "pending").length,
    rejected: templates.filter(t => t.status === "rejected").length,
  };

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Message Templates" subtitle="Pre-approved messages for sending outside the 24h window" />
      <div className="p-6 space-y-5">

        {/* Status summary */}
        <div className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 px-5 py-4">
          {(["approved", "pending", "rejected"] as const).map(s => {
            const st = STATUS_STYLE[s];
            return (
              <div key={s} className="flex items-center gap-2">
                <st.Icon className="w-4 h-4" style={{ color: st.text }} />
                <span className="text-sm font-semibold text-gray-800">{counts[s]}</span>
                <span className="text-sm text-gray-500 capitalize">{s}</span>
              </div>
            );
          })}
          <div className="ml-auto">
            <button onClick={() => setCreating(c => !c)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" /> New Template
            </button>
          </div>
        </div>

        {/* Create form */}
        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Create new template</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Template name (snake_case)"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700">
                <option value="utility">Utility</option>
                <option value="marketing">Marketing</option>
                <option value="authentication">Authentication</option>
              </select>
            </div>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={3}
              placeholder="Message body. Use {{1}}, {{2}} for variables."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
            <p className="text-xs text-gray-400">
              Variables detected: <strong className="text-gray-600">{(form.body.match(/\{\{\d+\}\}/g) ?? []).length}</strong>.
              Templates are created with "pending" status — approve them in Meta Business Manager.
            </p>
            <div className="flex gap-2">
              <button onClick={create} disabled={!form.name || !form.body}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                Submit for approval
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Template grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(t => {
            const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.pending;
            const catColor = CAT_COLOR[t.category] ?? "#6b7280";
            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4" style={{ color: catColor }} />
                    <span className="font-mono text-sm font-semibold text-gray-800">{t.name}</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 capitalize font-medium flex-shrink-0"
                    style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                    <st.Icon className="w-3 h-3" /> {t.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed flex-1 min-h-[60px]">{t.body}</p>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <span className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium"
                    style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}30` }}>
                    {t.category}
                  </span>
                  <span className="text-[11px] text-gray-400">{t.language}</span>
                  <span className="text-[11px] text-gray-400">· {t.variableCount} vars</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => copyBody(t.id, t.body)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                      title="Copy body">
                      <Copy className="w-3.5 h-3.5" style={{ color: copied === t.id ? "#16a34a" : undefined }} />
                    </button>
                    <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                      title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {templates.length === 0 && (
            <div className="col-span-3 py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
              No templates yet. Create your first template to send messages outside the 24h window.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
