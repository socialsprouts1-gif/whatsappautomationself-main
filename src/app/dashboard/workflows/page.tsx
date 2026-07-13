"use client";

import { useState } from "react";
import {
  GitBranch, Plus, Clock, Zap, ArrowDown, PlayCircle, Trash2,
  ToggleLeft, ToggleRight, X, Check, ChevronDown, ChevronUp,
  Bell, Webhook, Loader2, Activity,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface FlowStep { delayMinutes: number; message: string }
interface Flow {
  id: string; name: string; enabled: boolean; trigger: string; keywords: string[];
  steps: FlowStep[]; enrolledCount: number; completedCount: number;
}
interface Job { id: string; flowName: string; message: string; runAt: string; status: string }

function fmtDelay(min: number): string {
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / 1440)}d`;
}
function fmtWhen(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const m = Math.round(diff / 60000);
  if (m <= 0) return "due now";
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  return h < 24 ? `in ${h}h` : `in ${Math.round(h / 24)}d`;
}

const TRIGGER_OPTIONS = [
  { value: "on_new_contact",     label: "New contact added" },
  { value: "keyword",            label: "Keyword match" },
  { value: "on_opt_in",          label: "Contact opts in" },
  { value: "campaign_reply",     label: "Replies to campaign" },
  { value: "inactivity_7d",      label: "7 days inactive" },
  { value: "inactivity_30d",     label: "30 days inactive" },
];

const DELAY_OPTIONS = [
  { value: 5,    label: "5 minutes" },
  { value: 60,   label: "1 hour" },
  { value: 360,  label: "6 hours" },
  { value: 1440, label: "1 day" },
  { value: 4320, label: "3 days" },
  { value: 10080,label: "7 days" },
];

/* ─── New Flow modal ─────────────────────────────────────────────────────── */
function NewFlowModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("on_new_contact");
  const [keywords, setKeywords] = useState("");
  const [steps, setSteps] = useState<FlowStep[]>([{ delayMinutes: 60, message: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function addStep() {
    setSteps(s => [...s, { delayMinutes: 1440, message: "" }]);
  }
  function removeStep(i: number) {
    setSteps(s => s.filter((_, idx) => idx !== i));
  }
  function patchStep(i: number, patch: Partial<FlowStep>) {
    setSteps(s => s.map((st, idx) => idx === i ? { ...st, ...patch } : st));
  }

  async function save() {
    if (!name.trim()) { setError("Flow name is required"); return; }
    if (steps.some(s => !s.message.trim())) { setError("All steps need a message"); return; }
    setSaving(true);
    const res = await mutate("/api/flows", "POST", {
      name: name.trim(),
      trigger,
      keywords: trigger === "keyword" ? keywords.split(",").map(k => k.trim()).filter(Boolean) : [],
      steps,
    }) as { ok?: boolean; error?: string } | null;
    setSaving(false);
    if (res?.ok) { onCreated(); onClose(); }
    else setError(res?.error ?? "Failed to save flow");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
            <GitBranch className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">New Drip Flow</h2>
            <p className="text-xs text-gray-400">Automated message sequence</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Flow name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Welcome sequence"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400" />
          </div>

          {/* Trigger */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Trigger</label>
            <select value={trigger} onChange={e => setTrigger(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 text-gray-700">
              {TRIGGER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Keywords */}
          {trigger === "keyword" && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Keywords (comma separated)</label>
              <input value={keywords} onChange={e => setKeywords(e.target.value)}
                placeholder="hi, hello, start"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400" />
            </div>
          )}

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-600">Messages ({steps.length})</label>
              <button onClick={addStep}
                className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium">
                <Plus className="w-3 h-3" /> Add step
              </button>
            </div>
            <div className="space-y-3">
              {steps.map((s, i) => (
                <div key={i}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-px bg-gray-100" />
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <select value={s.delayMinutes}
                          onChange={e => patchStep(i, { delayMinutes: Number(e.target.value) })}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-amber-600 bg-amber-50 focus:outline-none">
                          {DELAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <span className="text-xs text-gray-400">after previous</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>
                  )}
                  {i === 0 && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                      <Bell className="w-3 h-3" />
                      Sends <strong className="text-gray-600">{fmtDelay(s.delayMinutes)}</strong> after trigger
                      <select value={s.delayMinutes}
                        onChange={e => patchStep(i, { delayMinutes: Number(e.target.value) })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 ml-1 focus:outline-none">
                        {DELAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <textarea value={s.message} onChange={e => patchStep(i, { message: e.target.value })}
                      rows={2} placeholder={`Step ${i + 1} message`}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 resize-none" />
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(i)}
                        className="self-start p-2 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <X className="w-3 h-3" /> {error}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 ml-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Saving…" : "Create Flow"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function WorkflowsPage() {
  const { data, refetch } = useApi<{ flows: Flow[]; jobs: Job[] }>("/api/flows");
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"flows" | "scheduled" | "events">("flows");

  const flows = data?.flows ?? [];
  const pendingJobs = (data?.jobs ?? []).filter(j => j.status === "pending");

  async function toggleFlow(id: string, enabled: boolean) {
    await mutate("/api/flows", "PATCH", { id, enabled });
    refetch();
  }

  async function processDue() {
    setBusy(true);
    await mutate("/api/cron/process", "POST");
    setBusy(false);
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      {showNew && <NewFlowModal onClose={() => setShowNew(false)} onCreated={refetch} />}

      <Header title="Workflows" subtitle="Time-delayed drip sequences and follow-up reminders" />
      <div className="p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Flows", value: flows.length, icon: GitBranch, color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
            { label: "Active Flows", value: flows.filter(f => f.enabled).length, icon: Activity, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: "Queued Jobs", value: pendingJobs.length, icon: Clock, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
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

        {/* Tab nav + actions */}
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
            {(["flows", "scheduled", "events"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
                style={tab === t ? { background: "#7c3aed", color: "#fff" } : { color: "#6b7280" }}>
                {t === "scheduled" ? "Scheduled" : t === "events" ? "Events" : "Flows"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            {tab === "scheduled" && (
              <button onClick={processDue} disabled={busy}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-purple-200 text-purple-600 bg-purple-50 hover:bg-purple-100 disabled:opacity-50">
                <PlayCircle className="w-4 h-4" />
                {busy ? "Running…" : "Run due jobs now"}
              </button>
            )}
            {tab === "flows" && (
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4" /> New Flow
              </button>
            )}
          </div>
        </div>

        {/* ── Flows tab ── */}
        {tab === "flows" && (
          <div className="space-y-3">
            {flows.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 py-12 text-center text-gray-400 text-sm">
                No flows yet. Click "New Flow" to create your first drip sequence.
              </div>
            )}
            {flows.map(f => {
              const isExpanded = expanded === f.id;
              return (
                <div key={f.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-800">{f.name}</h4>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${f.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Trigger: {TRIGGER_OPTIONS.find(o => o.value === f.trigger)?.label ?? f.trigger}
                          {f.keywords.length > 0 && ` · keywords: ${f.keywords.join(", ")}`}
                          {" · "}{f.steps.length} step{f.steps.length !== 1 ? "s" : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center hidden md:block">
                          <div className="text-sm font-bold text-blue-600">{f.enrolledCount}</div>
                          <div className="text-[10px] text-gray-400">enrolled</div>
                        </div>
                        <div className="text-center hidden md:block">
                          <div className="text-sm font-bold text-green-600">{f.completedCount}</div>
                          <div className="text-[10px] text-gray-400">completed</div>
                        </div>

                        {/* Toggle */}
                        <button onClick={() => toggleFlow(f.id, !f.enabled)}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition-all"
                          style={f.enabled
                            ? { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" }
                            : { background: "#f9fafb", borderColor: "#e5e7eb", color: "#9ca3af" }}>
                          {f.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {f.enabled ? "Active" : "Paused"}
                        </button>

                        <button onClick={() => setExpanded(isExpanded ? null : f.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Steps */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-2">
                      {f.steps.map((s, idx) => (
                        <div key={idx}>
                          <div className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold flex-shrink-0 pt-0.5">
                              <Clock className="w-3 h-3" /> +{fmtDelay(s.delayMinutes)}
                            </div>
                            <p className="text-sm text-gray-700 leading-snug">{s.message}</p>
                          </div>
                          {idx < f.steps.length - 1 && (
                            <div className="flex justify-center py-1"><ArrowDown className="w-3.5 h-3.5 text-gray-300" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Scheduled jobs tab ── */}
        {tab === "scheduled" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {pendingJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-400">
                No pending jobs. Enroll a contact via the inbox simulator to see drips queue here.
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                  {["Scheduled", "Flow", "Message"].map((h, i) => (
                    <div key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${i === 0 ? "col-span-2" : i === 1 ? "col-span-3" : "col-span-7"}`}>{h}</div>
                  ))}
                </div>
                {pendingJobs.map(j => (
                  <div key={j.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 items-start">
                    <div className="col-span-2 text-xs font-semibold text-amber-600">{fmtWhen(j.runAt)}</div>
                    <div className="col-span-3 text-xs text-gray-500 font-medium truncate">{j.flowName}</div>
                    <div className="col-span-7 text-sm text-gray-700 leading-snug">{j.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Events tab (webhook events log) ── */}
        {tab === "events" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <Webhook className="w-4 h-4 text-blue-500" />
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Webhook Event Log</h3>
                <p className="text-xs text-gray-400">Inbound messages and status updates received from Meta</p>
              </div>
            </div>
            <WebhookEvents />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Webhook events (inbound messages) ──────────────────────────────────── */
interface InboundMsg {
  id: string; text: string; timestamp: string;
  contact?: { name: string; phone: string };
  via?: string; type?: string;
}

function WebhookEvents() {
  const { data } = useApi<{ conversations: Array<{ id: string; lastMessagePreview: string; lastMessageAt: string; contact?: { name: string; phone: string } }> }>("/api/conversations");

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading events…
      </div>
    );
  }

  const events = (data?.conversations ?? []).slice(0, 20);

  if (events.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-400">
        No webhook events yet. Send a WhatsApp message to your connected number to see events here.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
        {["Time", "Contact", "Last message"].map((h, i) => (
          <div key={h} className={`text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${i === 0 ? "col-span-2" : i === 1 ? "col-span-3" : "col-span-7"}`}>{h}</div>
        ))}
      </div>
      {events.map(e => {
        const ago = (() => {
          const m = Math.floor((Date.now() - new Date(e.lastMessageAt).getTime()) / 60000);
          if (m < 1) return "just now";
          if (m < 60) return `${m}m ago`;
          const h = Math.floor(m / 60);
          return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
        })();
        return (
          <div key={e.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 items-center">
            <div className="col-span-2 text-[11px] text-gray-400">{ago}</div>
            <div className="col-span-3 text-sm font-medium text-gray-700 truncate">
              {e.contact?.name ?? `+${e.contact?.phone ?? "unknown"}`}
            </div>
            <div className="col-span-7 text-sm text-gray-500 truncate">{e.lastMessagePreview}</div>
          </div>
        );
      })}
    </div>
  );
}
