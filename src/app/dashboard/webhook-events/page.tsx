"use client";

import { useState } from "react";
import { Send, ChevronDown, ChevronUp, CheckCircle, XCircle, Radio } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface WebhookEvent {
  id: string;
  source: string;
  event: string;
  summary: string;
  payload: unknown;
  status: "processed" | "failed";
  receivedAt: string;
}

const SOURCE_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  whatsapp: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  shopify:  { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  test:     { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" },
};
const SOURCE_FALLBACK = { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };

const STATUS_COLOR = {
  processed: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  failed:    { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
};

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default function WebhookEventsPage() {
  const { data, refetch } = useApi<{ events: WebhookEvent[] }>("/api/webhook-events");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);

  const events = [...(data?.events ?? [])].sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  async function sendTestEvent() {
    setSending(true);
    setConfirmMsg(null);
    try {
      const res = await mutate<{ ok: boolean; event: WebhookEvent }>("/api/webhook-events", "POST", {});
      refetch();
      if (res?.ok) {
        setConfirmMsg(`Test event "${res.event.event}" sent from ${res.event.source}.`);
        setTimeout(() => setConfirmMsg(null), 3000);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Webhook Events" subtitle="Live log of inbound webhook deliveries (WhatsApp, Shopify, and more)" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-500" /> {events.length} event{events.length === 1 ? "" : "s"}
          </h2>
          <div className="flex items-center gap-3">
            {confirmMsg && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <CheckCircle className="w-3.5 h-3.5" /> {confirmMsg}
              </span>
            )}
            <button
              onClick={sendTestEvent}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {sending ? "Sending…" : "Send test event"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {events.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No webhook events yet.</div>
          ) : (
            events.map((ev) => {
              const src = SOURCE_COLOR[ev.source.toLowerCase()] ?? SOURCE_FALLBACK;
              const st = STATUS_COLOR[ev.status] ?? STATUS_COLOR.processed;
              const expanded = expandedId === ev.id;
              return (
                <div key={ev.id} className="border-b border-gray-100 last:border-0">
                  <div
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expanded ? null : ev.id)}
                  >
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium flex-shrink-0"
                      style={{ background: src.bg, color: src.text, border: `1px solid ${src.border}` }}
                    >
                      {ev.source}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex-shrink-0">
                      {ev.event}
                    </span>
                    <span className="text-sm text-gray-600 truncate flex-1 min-w-0">{ev.summary}</span>
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium flex items-center gap-1 flex-shrink-0"
                      style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}
                    >
                      {ev.status === "processed" ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {ev.status}
                    </span>
                    <span className="text-[11px] text-gray-400 flex-shrink-0 w-16 text-right">{timeAgo(ev.receivedAt)}</span>
                    {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                  </div>
                  {expanded && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100">
                      <pre className="text-xs bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-x-auto">
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
