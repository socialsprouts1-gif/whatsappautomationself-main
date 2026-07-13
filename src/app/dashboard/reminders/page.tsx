"use client";

import { useState } from "react";
import { Plus, Trash2, Check, Circle, Bell } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Reminder {
  id: string;
  title: string;
  note?: string;
  dueAt: string;
  done: boolean;
  createdAt: string;
}

function relativeTime(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);

  let label: string;
  if (mins < 60) label = `${mins || 1}m`;
  else if (hours < 24) label = `${hours}h`;
  else label = `${days}d`;

  return diffMs >= 0 ? `in ${label}` : `${label} overdue`;
}

function statusFor(r: Reminder, now: number): { label: string; bg: string; text: string; border: string } {
  if (r.done) return { label: "Done", bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" };
  const due = new Date(r.dueAt).getTime();
  if (due < now) return { label: "Overdue", bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" };
  if (due - now <= 24 * 3600000) return { label: "Due soon", bg: "#fffbeb", text: "#d97706", border: "#fde68a" };
  return { label: "Upcoming", bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
}

export default function RemindersPage() {
  const { data, refetch } = useApi<{ reminders: Reminder[] }>("/api/reminders");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", note: "", dueAt: "" });

  const now = Date.now();
  const reminders = [...(data?.reminders ?? [])].sort(
    (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );

  async function add() {
    if (!form.title || !form.dueAt) return;
    await mutate("/api/reminders", "POST", {
      title: form.title,
      note: form.note || undefined,
      dueAt: new Date(form.dueAt).toISOString(),
    });
    setForm({ title: "", note: "", dueAt: "" });
    setAdding(false);
    refetch();
  }

  async function toggleDone(r: Reminder) {
    await mutate("/api/reminders", "PATCH", { id: r.id, done: !r.done });
    refetch();
  }

  async function remove(id: string) {
    await fetch(`/api/reminders?id=${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Reminders" subtitle="Keep track of follow-ups and to-dos" />
      <div className="p-6 space-y-5">

        {/* Add button */}
        <div className="flex items-center justify-end">
          <button onClick={() => setAdding(a => !a)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Reminder
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">New reminder</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <input type="datetime-local" value={form.dueAt} onChange={e => setForm({ ...form, dueAt: e.target.value })}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700" />
            </div>
            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={2}
              placeholder="Note (optional)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
            <div className="flex gap-2">
              <button onClick={add} disabled={!form.title || !form.dueAt}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => setAdding(false)}
                className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {reminders.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No reminders yet.</div>
          ) : (
            reminders.map(r => {
              const st = statusFor(r, now);
              return (
                <div key={r.id} className="flex items-start gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <button onClick={() => toggleDone(r)} className="mt-0.5 flex-shrink-0" title={r.done ? "Mark as not done" : "Mark as done"}>
                    {r.done
                      ? <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#16a34a" }}>
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      : <Circle className="w-5 h-5 text-gray-300 hover:text-blue-400 transition-colors" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium text-gray-800 ${r.done ? "line-through text-gray-400" : ""}`}>
                        {r.title}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                        {st.label}
                      </span>
                    </div>
                    {r.note && <p className="text-xs text-gray-400 mt-0.5">{r.note}</p>}
                    <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                      <Bell className="w-3 h-3" />
                      {new Date(r.dueAt).toLocaleString()} &middot; {relativeTime(r.dueAt)}
                    </div>
                  </div>

                  <button onClick={() => remove(r.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                    title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
