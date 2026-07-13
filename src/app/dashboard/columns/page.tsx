"use client";

import { useState } from "react";
import { Plus, Trash2, Columns as ColumnsIcon } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

type CustomFieldType = "text" | "number" | "date" | "boolean";

interface CustomField {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  createdAt: string;
}

const TYPE_OPTIONS: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes/No" },
];

const TYPE_STYLE: Record<CustomFieldType, { bg: string; text: string; border: string }> = {
  text:    { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  number:  { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  date:    { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  boolean: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
};

function deriveKey(label: string): string {
  return label.toLowerCase().trim().replace(/\s+/g, "_");
}

export default function ColumnsPage() {
  const { data, refetch } = useApi<{ columns: CustomField[] }>("/api/columns");
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [type, setType] = useState<CustomFieldType>("text");

  const columns = data?.columns ?? [];

  async function create() {
    if (!label.trim()) return;
    await mutate("/api/columns", "POST", { label: label.trim(), type });
    setLabel("");
    setType("text");
    setCreating(false);
    refetch();
  }

  async function remove(id: string) {
    await fetch(`/api/columns?id=${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Columns" subtitle="Custom fields tracked on every contact" />
      <div className="p-6 space-y-5">

        <div className="flex items-center justify-end">
          <button onClick={() => setCreating(c => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Column
          </button>
        </div>

        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">New custom field</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Field label (e.g. Company Size)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                {label.trim() && (
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Key: <span className="font-mono text-gray-500">{deriveKey(label)}</span>
                  </p>
                )}
              </div>
              <select value={type} onChange={e => setType(e.target.value as CustomFieldType)}
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 text-gray-700">
                {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={create} disabled={!label.trim()}
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

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="col-span-5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Label</div>
            <div className="col-span-4 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Key</div>
            <div className="col-span-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Type</div>
            <div className="col-span-1"></div>
          </div>

          {columns.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
              <ColumnsIcon className="w-5 h-5 text-gray-300" />
              No custom columns yet.
            </div>
          ) : (
            columns.map(col => {
              const st = TYPE_STYLE[col.type] ?? TYPE_STYLE.text;
              return (
                <div key={col.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors items-center">
                  <div className="col-span-5 text-sm font-medium text-gray-800 truncate">{col.label}</div>
                  <div className="col-span-4">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{col.key}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium"
                      style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                      {col.type === "boolean" ? "Yes/No" : col.type}
                    </span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => remove(col.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                      title="Delete column">
                      <Trash2 className="w-3.5 h-3.5" />
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
