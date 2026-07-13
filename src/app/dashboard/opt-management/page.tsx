"use client";

import { useState } from "react";
import { Search, UserCheck, UserX, Users } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  status: string;
  lastActiveAt: string;
  attributes: Record<string, string>;
}

export default function OptManagementPage() {
  const { data, refetch } = useApi<{ contacts: Contact[] }>("/api/contacts");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const contacts = data?.contacts ?? [];
  const filtered = contacts.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(query.trim());
  });

  const counts = {
    total: contacts.length,
    optedIn: contacts.filter((c) => c.attributes?.optedOut !== "true").length,
    optedOut: contacts.filter((c) => c.attributes?.optedOut === "true").length,
  };

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function setConsent(id: string, optedOut: boolean) {
    await mutate("/api/contacts", "PATCH", { id, attributes: { optedOut: optedOut ? "true" : "false" } });
    refetch();
  }

  async function bulkSetConsent(optedOut: boolean) {
    setBusy(true);
    try {
      for (const id of selected) {
        await mutate("/api/contacts", "PATCH", { id, attributes: { optedOut: optedOut ? "true" : "false" } });
      }
      refetch();
      setSelected(new Set());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Opts Management" subtitle="Manage WhatsApp messaging consent per contact" />
      <div className="p-6 space-y-5">

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "Total Contacts", value: counts.total, icon: Users, color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
            { label: "Opted In", value: counts.optedIn, icon: UserCheck, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
            { label: "Opted Out", value: counts.optedOut, icon: UserX, color: "#e11d48", bg: "#fff1f2", border: "#fecdd3" },
          ].map((s) => (
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

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2.5 max-w-md">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or phone…"
            className="flex-1 text-sm text-gray-700 focus:outline-none bg-transparent" />
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-gray-700">{selected.size} selected</span>
            <button onClick={() => bulkSetConsent(true)} disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ background: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3" }}>
              <UserX className="w-3.5 h-3.5" /> Opt out selected
            </button>
            <button onClick={() => bulkSetConsent(false)} disabled={busy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
              <UserCheck className="w-3.5 h-3.5" /> Opt in selected
            </button>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600">
              Clear selection
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="col-span-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400"></div>
            <div className="col-span-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Name</div>
            <div className="col-span-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Phone</div>
            <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Consent</div>
            <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400"></div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No contacts found.</div>
          ) : (
            filtered.map((c) => {
              const optedOut = c.attributes?.optedOut === "true";
              return (
                <div key={c.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-1">
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelected(c.id)} />
                  </div>
                  <div className="col-span-4 text-sm font-medium text-gray-800 truncate">{c.name}</div>
                  <div className="col-span-3 text-sm text-gray-500">+{c.phone}</div>
                  <div className="col-span-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                      style={optedOut
                        ? { background: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3" }
                        : { background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                      {optedOut ? "Opted out" : "Opted in"}
                    </span>
                  </div>
                  <div className="col-span-2 text-right">
                    <button onClick={() => setConsent(c.id, !optedOut)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                      {optedOut ? "Opt in" : "Opt out"}
                    </button>
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
