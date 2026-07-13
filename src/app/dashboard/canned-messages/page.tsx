"use client";

import { useState } from "react";
import { Plus, Copy, Trash2, Edit3, Check, X } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface CannedMessage {
  id: string;
  shortcut: string;
  text: string;
  category: string;
  createdAt: string;
}

function CannedCard({ m, onSave, onDelete }: {
  m: CannedMessage;
  onSave: (id: string, text: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.text);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(m.text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function save() {
    await onSave(m.id, text);
    setEditing(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3 gap-2">
        <span className="font-mono text-xs font-semibold px-2 py-1 rounded-lg bg-gray-100 text-gray-700 truncate">
          {m.shortcut}
        </span>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
          style={{ background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe" }}>
          {m.category}
        </span>
      </div>

      {editing ? (
        <div className="flex-1">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 resize-none" />
          <div className="flex gap-2 mt-2">
            <button onClick={save}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white">
              <Check className="w-3 h-3" /> Save
            </button>
            <button onClick={() => { setEditing(false); setText(m.text); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-600 leading-relaxed flex-1 min-h-[50px]">{m.text}</p>
      )}

      {!editing && (
        <>
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100 justify-end">
            <button onClick={copy}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Copy text">
              <Copy className="w-3.5 h-3.5" style={{ color: copied ? "#16a34a" : "#9ca3af" }} />
            </button>
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(m.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
              title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {copied && <div className="text-[11px] text-green-600 text-right mt-1">Copied!</div>}
        </>
      )}
    </div>
  );
}

export default function CannedMessagesPage() {
  const { data, refetch } = useApi<{ cannedMessages: CannedMessage[] }>("/api/canned-messages");
  const [creating, setCreating] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({ shortcut: "", category: "", text: "" });

  const messages = data?.cannedMessages ?? [];
  const categories = Array.from(new Set(messages.map(m => m.category))).sort();
  const filtered = categoryFilter === "all" ? messages : messages.filter(m => m.category === categoryFilter);

  async function create() {
    if (!form.shortcut || !form.text) return;
    const shortcut = form.shortcut.startsWith("/") ? form.shortcut : `/${form.shortcut}`;
    await mutate("/api/canned-messages", "POST", {
      shortcut, text: form.text, category: form.category || undefined,
    });
    setForm({ shortcut: "", category: "", text: "" });
    setCreating(false);
    refetch();
  }

  async function saveText(id: string, text: string) {
    await mutate("/api/canned-messages", "PATCH", { id, text });
    refetch();
  }

  async function remove(id: string) {
    await fetch(`/api/canned-messages?id=${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Canned Messages" subtitle="Quick reply shortcuts for your support team" />
      <div className="p-6 space-y-5">

        {/* Filter row + create button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            <button onClick={() => setCategoryFilter("all")}
              className="text-xs px-3 py-1.5 rounded-full font-medium border transition-colors"
              style={categoryFilter === "all"
                ? { background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }
                : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
              All
            </button>
            {categories.map(c => (
              <button key={c} onClick={() => setCategoryFilter(c)}
                className="text-xs px-3 py-1.5 rounded-full font-medium border transition-colors"
                style={categoryFilter === c
                  ? { background: "#eff6ff", color: "#2563eb", borderColor: "#bfdbfe" }
                  : { background: "white", color: "#6b7280", borderColor: "#e5e7eb" }}>
                {c}
              </button>
            ))}
          </div>
          <button onClick={() => setCreating(c => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Message
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">New canned message</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.shortcut} onChange={e => setForm({ ...form, shortcut: e.target.value })}
                placeholder="Shortcut (e.g. /thanks)"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-blue-400" />
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                placeholder="Category (optional)"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
            </div>
            <textarea value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} rows={3}
              placeholder="Message text"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
            <div className="flex gap-2">
              <button onClick={create} disabled={!form.shortcut || !form.text}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                Save
              </button>
              <button onClick={() => setCreating(false)}
                className="px-4 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(m => (
            <CannedCard key={m.id} m={m} onSave={saveText} onDelete={remove} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
              No canned messages yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
