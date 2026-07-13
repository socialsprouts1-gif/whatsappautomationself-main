"use client";

import { useEffect, useState } from "react";
import { Plus, Send, Check, LifeBuoy, MessageSquare } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

type TicketStatus = "open" | "pending" | "resolved";
type TicketPriority = "low" | "medium" | "high";

interface SupportReply {
  id: string;
  from: "user" | "agent";
  text: string;
  at: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  replies: SupportReply[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLOR: Record<TicketStatus, { bg: string; text: string; border: string }> = {
  open:     { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  pending:  { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  resolved: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
};

const PRIORITY_COLOR: Record<TicketPriority, { bg: string; text: string; border: string }> = {
  low:    { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  medium: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  high:   { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
};

const STATUS_OPTIONS: TicketStatus[] = ["open", "pending", "resolved"];

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export default function SupportPage() {
  const { data, refetch } = useApi<{ tickets: SupportTicket[] }>("/api/support");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", priority: "medium" as TicketPriority });
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const tickets = data?.tickets ?? [];
  const sorted = [...tickets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && sorted.length > 0) setSelectedId(sorted[0].id);
  }, [sorted, selectedId]);

  async function createTicket() {
    if (!form.subject || !form.message) return;
    const res = await mutate<{ ok: boolean; ticket: SupportTicket }>("/api/support", "POST", form);
    setForm({ subject: "", message: "", priority: "medium" });
    setCreating(false);
    refetch();
    if (res?.ticket) setSelectedId(res.ticket.id);
  }

  async function changeStatus(status: TicketStatus) {
    if (!selected) return;
    await mutate(`/api/support/${selected.id}`, "PATCH", { status });
    refetch();
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    try {
      await mutate(`/api/support/${selected.id}`, "PATCH", { reply: replyText.trim() });
      setReplyText("");
      refetch();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="My Support" subtitle="Get help from our team" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-blue-500" /> Tickets
          </h2>
          <button
            onClick={() => setCreating((c) => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New ticket
          </button>
        </div>

        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">New support ticket</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Subject"
                className="md:col-span-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700"
              >
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
              </select>
            </div>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={3}
              placeholder="Describe your issue…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={createTicket}
                disabled={!form.subject || !form.message}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> Submit
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: "60vh" }}>
          {/* Left pane: ticket list */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="max-h-[70vh] overflow-y-auto">
              {sorted.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm">No tickets yet.</div>
              ) : (
                sorted.map((t) => {
                  const sc = STATUS_COLOR[t.status];
                  const pc = PRIORITY_COLOR[t.priority];
                  const active = t.id === selectedId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 last:border-0 transition-colors ${
                        active ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-800 truncate">{t.subject}</div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}
                        >
                          {t.status}
                        </span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium"
                          style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}
                        >
                          {t.priority}
                        </span>
                        <span className="text-[11px] text-gray-400 ml-auto">{timeAgo(t.updatedAt)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right pane: thread */}
          <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
                Select a ticket to view the conversation.
              </div>
            ) : (
              <>
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">{selected.subject}</div>
                    <div className="text-[11px] text-gray-400">Updated {timeAgo(selected.updatedAt)}</div>
                  </div>
                  <select
                    value={selected.status}
                    onChange={(e) => changeStatus(e.target.value as TicketStatus)}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-400 capitalize flex-shrink-0"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-[55vh]">
                  {/* Original message */}
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm" style={{ background: "#eff6ff", color: "#1e3a8a" }}>
                      <div>{selected.message}</div>
                      <div className="text-[10px] text-blue-400 mt-1 text-right">{timeAgo(selected.createdAt)}</div>
                    </div>
                  </div>

                  {selected.replies.map((r) => (
                    <div key={r.id} className={`flex ${r.from === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          r.from === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                        }`}
                        style={
                          r.from === "user"
                            ? { background: "#eff6ff", color: "#1e3a8a" }
                            : { background: "#f3f4f6", color: "#374151" }
                        }
                      >
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-60">
                          {r.from === "agent" && <MessageSquare className="w-2.5 h-2.5" />}
                          {r.from === "user" ? "You" : "Agent"}
                        </div>
                        <div>{r.text}</div>
                        <div className={`text-[10px] mt-1 ${r.from === "user" ? "text-blue-400 text-right" : "text-gray-400"}`}>
                          {timeAgo(r.at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 p-4 flex items-end gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    placeholder="Type a reply…"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                  <button
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" /> Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
