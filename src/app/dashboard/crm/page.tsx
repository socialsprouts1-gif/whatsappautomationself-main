"use client";

import { useState } from "react";
import {
  Search, Plus, Phone, Mail, Tag, Trash2, Edit3, Check, X,
  ChevronDown, ChevronUp, MessageSquare, UserCheck, UserX, Users,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Contact {
  id: string; name: string; phone: string; email?: string; tags: string[];
  status: string; lastActiveAt: string; attributes: Record<string, string>;
}

const STATUS_OPTIONS = ["lead", "active", "customer", "blocked"] as const;
const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  lead:     { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  active:   { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  customer: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  blocked:  { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3" },
};

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

function ContactRow({ c, onUpdate, onDelete }: {
  c: Contact;
  onUpdate: (id: string, patch: object) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState(c.attributes?.notes ?? "");
  const col = STATUS_COLOR[c.status] ?? STATUS_COLOR.lead;
  const optedOut = c.attributes?.optedOut === "true";

  async function saveNotes() {
    await onUpdate(c.id, { attributes: { notes } });
    setEditNotes(false);
  }
  async function toggleOpt() {
    await onUpdate(c.id, { attributes: { optedOut: optedOut ? "false" : "true" } });
  }
  async function setStatus(s: string) {
    await onUpdate(c.id, { status: s });
  }

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div className="grid grid-cols-12 gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors items-center cursor-pointer"
        onClick={() => setExpanded(e => !e)}>
        {/* Avatar + name */}
        <div className="col-span-4 flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
            style={{ background: optedOut ? "#9ca3af" : "#3b82f6" }}>
            {c.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-800 truncate flex items-center gap-1.5">
              {c.name}
              {optedOut && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-normal">Opted out</span>}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center gap-2">
              <span className="flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />+{c.phone}</span>
              {c.email && <span className="flex items-center gap-0.5 truncate"><Mail className="w-2.5 h-2.5" />{c.email}</span>}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="col-span-3 flex flex-wrap gap-1">
          {c.tags.map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 bg-blue-50 text-blue-600 border border-blue-100">
              <Tag className="w-2.5 h-2.5" />{t}
            </span>
          ))}
        </div>

        {/* Status */}
        <div className="col-span-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium"
            style={{ background: col.bg, color: col.text, border: `1px solid ${col.border}` }}>
            {c.status}
          </span>
        </div>

        {/* Notes preview */}
        <div className="col-span-2 text-xs text-gray-400 truncate">
          {c.attributes?.notes ? <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 flex-shrink-0" />{c.attributes.notes}</span> : <span className="text-gray-300">No notes</span>}
        </div>

        {/* Last active + expand */}
        <div className="col-span-1 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{timeAgo(c.lastActiveAt)}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Notes */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold text-gray-600">Notes</span>
              {!editNotes && (
                <button onClick={() => setEditNotes(true)}
                  className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5">
                  <Edit3 className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            {editNotes ? (
              <div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none"
                  placeholder="Add notes about this contact…" />
                <div className="flex gap-2 mt-2">
                  <button onClick={saveNotes}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => { setEditNotes(false); setNotes(c.attributes?.notes ?? ""); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 bg-white border border-gray-100 rounded-lg px-3 py-2 min-h-[60px]">
                {notes || <span className="text-gray-300 italic">No notes yet. Click Edit to add.</span>}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Status change */}
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1.5">Change status</div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map(s => {
                  const sc = STATUS_COLOR[s];
                  return (
                    <button key={s} onClick={() => setStatus(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full capitalize font-medium border transition-all"
                      style={c.status === s
                        ? { background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }
                        : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opt-in management */}
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-1.5">Opt-in management</div>
              <button onClick={toggleOpt}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all"
                style={optedOut
                  ? { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" }
                  : { background: "#fff1f2", borderColor: "#fecdd3", color: "#e11d48" }}>
                {optedOut ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                {optedOut ? "Re-subscribe (opt in)" : "Opt out of messages"}
              </button>
            </div>

            {/* Attributes */}
            {Object.entries(c.attributes ?? {}).filter(([k]) => k !== "notes" && k !== "optedOut").length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1.5">Attributes</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(c.attributes).filter(([k]) => k !== "notes" && k !== "optedOut").map(([k, v]) => (
                    <span key={k} className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Delete */}
            <button onClick={() => onDelete(c.id)}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 mt-1">
              <Trash2 className="w-3.5 h-3.5" /> Delete contact
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CrmPage() {
  const { data, refetch } = useApi<{ contacts: Contact[] }>("/api/contacts");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", tags: "" });

  const contacts = (data?.contacts ?? []).filter(c => {
    const matchQ = !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query);
    const matchS = statusFilter === "all" || c.status === statusFilter;
    return matchQ && matchS;
  });

  const counts = {
    total: data?.contacts.length ?? 0,
    leads: data?.contacts.filter(c => c.status === "lead").length ?? 0,
    customers: data?.contacts.filter(c => c.status === "customer").length ?? 0,
    optedOut: data?.contacts.filter(c => c.attributes?.optedOut === "true").length ?? 0,
  };

  async function add() {
    if (!form.name || !form.phone) return;
    await mutate("/api/contacts", "POST", {
      name: form.name, phone: form.phone, email: form.email,
      tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setForm({ name: "", phone: "", email: "", tags: "" });
    setAdding(false);
    refetch();
  }

  async function updateContact(id: string, patch: object) {
    await mutate("/api/contacts", "PATCH", { id, ...patch });
    refetch();
  }

  async function deleteContact(id: string) {
    await fetch(`/api/contacts?id=${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Contacts & CRM" subtitle="Every WhatsApp contact in one place" />
      <div className="p-6 space-y-5">

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Contacts", value: counts.total, icon: Users, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
            { label: "Leads", value: counts.leads, icon: Tag, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
            { label: "Customers", value: counts.customers, icon: UserCheck, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: "Opted Out", value: counts.optedOut, icon: UserX, color: "#e11d48", bg: "#fff1f2", border: "#fecdd3" },
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

        {/* Filters + Add button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 flex-1 min-w-48">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or phone…"
              className="flex-1 text-sm text-gray-700 focus:outline-none bg-transparent" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none">
            <option value="all">All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button onClick={() => setAdding(a => !a)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> Add Contact
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">New contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone (intl digits)"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="Tags, comma separated"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={add} disabled={!form.name || !form.phone}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                <Check className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => setAdding(false)}
                className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            {["Contact", "Tags", "Status", "Notes", "Last active", ""].map((h, i) => (
              <div key={i} className={`text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
                i === 0 ? "col-span-4" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-2" : i === 4 ? "col-span-1" : ""
              }`}>{h}</div>
            ))}
          </div>

          {contacts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No contacts found.</div>
          ) : (
            contacts.map(c => (
              <ContactRow key={c.id} c={c} onUpdate={updateContact} onDelete={deleteContact} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
