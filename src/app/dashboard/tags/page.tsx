"use client";

import { useState } from "react";
import { Plus, Trash2, Tag as TagIcon } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  count: number;
}

const PRESET_COLORS = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#e11d48", "#0ea5e9", "#db2777", "#64748b"];

export default function TagsPage() {
  const { data, refetch } = useApi<{ tags: Tag[] }>("/api/tags");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  const tags = data?.tags ?? [];

  async function create() {
    if (!name.trim()) return;
    await mutate("/api/tags", "POST", { name: name.trim(), color });
    setName("");
    setColor(PRESET_COLORS[0]);
    setCreating(false);
    refetch();
  }

  async function remove(tag: Tag) {
    const ok = window.confirm(
      `Delete tag "${tag.name}"? It will be removed from ${tag.count} contact${tag.count === 1 ? "" : "s"}.`
    );
    if (!ok) return;
    await fetch(`/api/tags?id=${tag.id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Tags" subtitle="Organize contacts with custom tags" />
      <div className="p-6 space-y-5">

        <div className="flex items-center justify-end">
          <button onClick={() => setCreating(c => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" /> New Tag
          </button>
        </div>

        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">New tag</h3>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Tag name"
              className="w-full md:w-80 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
            <div>
              <div className="text-xs font-medium text-gray-500 mb-2">Color</div>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full transition-transform"
                    style={{
                      background: c,
                      boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none",
                    }}
                    title={c} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={create} disabled={!name.trim()}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {tags.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.color }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{t.name}</div>
                <div className="text-[11px] text-gray-400">{t.count} contact{t.count === 1 ? "" : "s"}</div>
              </div>
              <button onClick={() => remove(t)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                title="Delete tag">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {tags.length === 0 && (
            <div className="col-span-4 py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200 flex flex-col items-center gap-2">
              <TagIcon className="w-5 h-5 text-gray-300" />
              No tags yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
