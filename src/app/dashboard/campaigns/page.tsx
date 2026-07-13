"use client";

import { useState } from "react";
import {
  Plus, Send, CheckCircle, Clock, Eye, MousePointer,
  Megaphone, Rocket, Trash2, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface CampaignStats { sent: number; delivered: number; read: number; failed: number; clicked: number }
interface Campaign {
  id: string; name: string; type: string; status: string; templateName?: string;
  audienceTag?: string; recipientCount: number; stats: CampaignStats;
}
interface Template { id: string; name: string; status: string }

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  sent:      { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  sending:   { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  scheduled: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  draft:     { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" },
  paused:    { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
};

export default function CampaignsPage() {
  const { data, refetch } = useApi<{ campaigns: Campaign[] }>("/api/campaigns");
  const { data: tplData } = useApi<{ templates: Template[] }>("/api/templates");
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", templateName: "", audienceTag: "" });

  const campaigns = data?.campaigns ?? [];
  const tags = ["", "lead", "customer", "active", "website", "abandoned-cart"];

  const totals = campaigns.reduce(
    (a, c) => ({ sent: a.sent + c.stats.sent, read: a.read + c.stats.read, clicked: a.clicked + c.stats.clicked }),
    { sent: 0, read: 0, clicked: 0 },
  );

  async function createAndSend(send: boolean) {
    if (!form.name) return;
    setBusy(true);
    await mutate("/api/campaigns", "POST", { ...form, send });
    setForm({ name: "", templateName: "", audienceTag: "" });
    setCreating(false);
    setBusy(false);
    refetch();
  }

  async function sendNow(id: string) {
    setBusy(true);
    await mutate(`/api/campaigns/${id}/send`, "POST");
    setBusy(false);
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Campaigns" subtitle="Broadcast messages to your audience" />
      <div className="p-6 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Campaigns", value: campaigns.length, icon: Megaphone, color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
            { label: "Messages Sent", value: totals.sent.toLocaleString(), icon: Send, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
            { label: "Read", value: totals.read.toLocaleString(), icon: Eye, color: "#0891b2", bg: "#f0f9ff", border: "#bae6fd" },
            { label: "Clicks", value: totals.clicked.toLocaleString(), icon: MousePointer, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-4" style={{ borderColor: s.border }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* New campaign button */}
        <div className="flex justify-end">
          <button onClick={() => setCreating(c => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 transition-colors">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h3 className="font-semibold text-gray-800 text-sm">Create broadcast</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Campaign name"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400" />
              <select value={form.templateName} onChange={e => setForm({ ...form, templateName: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 text-gray-700">
                <option value="">No template (text message)</option>
                {(tplData?.templates ?? []).filter(t => t.status === "approved").map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <select value={form.audienceTag} onChange={e => setForm({ ...form, audienceTag: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 text-gray-700">
                {tags.map(t => <option key={t} value={t}>{t === "" ? "All contacts" : `Tag: ${t}`}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => createAndSend(true)} disabled={busy || !form.name}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 disabled:opacity-50">
                <Rocket className="w-4 h-4" /> Send now
              </button>
              <button onClick={() => createAndSend(false)} disabled={busy || !form.name}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 disabled:opacity-50">
                Save as draft
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 py-2.5 rounded-xl text-sm border border-gray-100 text-gray-400 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Campaign list */}
        <div className="space-y-3">
          {campaigns.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
              No campaigns yet. Click "New Campaign" to create your first broadcast.
            </div>
          )}
          {campaigns.map(c => {
            const s = STATUS_STYLE[c.status] ?? STATUS_STYLE.draft;
            const openRate = c.stats.sent ? Math.round((c.stats.read / c.stats.sent) * 100) : 0;
            const isExpanded = expanded === c.id;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800">{c.name}</h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-full capitalize flex items-center gap-1 font-medium"
                          style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
                          {c.status === "sent" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {c.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {c.type} · {c.audienceTag ? `tag: ${c.audienceTag}` : "all contacts"}
                        {c.templateName ? ` · template: ${c.templateName}` : ""}
                        {c.recipientCount > 0 ? ` · ${c.recipientCount} recipients` : ""}
                      </div>
                    </div>

                    {/* Right-side actions */}
                    <div className="flex items-center gap-2">
                      {c.stats.sent > 0 ? (
                        <div className="hidden md:flex items-center gap-6">
                          {[
                            { l: "Sent", v: c.stats.sent },
                            { l: "Delivered", v: c.stats.delivered },
                            { l: `${openRate}% read`, v: c.stats.read },
                            { l: "Clicked", v: c.stats.clicked },
                          ].map(st => (
                            <div key={st.l} className="text-center">
                              <div className="text-sm font-bold text-gray-800">{st.v.toLocaleString()}</div>
                              <div className="text-[10px] text-gray-400">{st.l}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button onClick={() => sendNow(c.id)} disabled={busy}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border disabled:opacity-50"
                          style={{ background: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" }}>
                          <Send className="w-3.5 h-3.5" /> Send now
                        </button>
                      )}
                      <button onClick={() => refetch()}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setExpanded(isExpanded ? null : c.id)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {c.stats.sent > 0 && (
                    <div className="mt-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${(c.stats.delivered / c.stats.sent) * 100}%`, background: s.text }} />
                    </div>
                  )}
                </div>

                {/* Expanded stats */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                      {[
                        { l: "Sent", v: c.stats.sent, color: "#3b82f6" },
                        { l: "Delivered", v: c.stats.delivered, color: "#16a34a" },
                        { l: "Read", v: c.stats.read, color: "#7c3aed" },
                        { l: "Clicked", v: c.stats.clicked, color: "#d97706" },
                        { l: "Failed", v: c.stats.failed, color: "#e11d48" },
                      ].map(st => (
                        <div key={st.l} className="bg-white rounded-xl p-3 border border-gray-100">
                          <div className="text-lg font-black" style={{ color: st.color }}>{st.v.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">{st.l}</div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end mt-3">
                      <button className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700">
                        <Trash2 className="w-3.5 h-3.5" /> Delete campaign
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
