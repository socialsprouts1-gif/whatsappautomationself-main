"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Pencil, MoreVertical, Download, Sheet, Globe } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Chatbot {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  triggeredCount: number;
}

export default function ChatbotsPage() {
  const router = useRouter();
  const { data, refetch } = useApi<{ chatbots: Chatbot[] }>("/api/chatbots");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const chatbots = (data?.chatbots ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  async function toggle(cb: Chatbot) {
    await mutate(`/api/chatbots/${cb.id}`, "PATCH", { enabled: !cb.enabled });
    refetch();
  }

  async function create() {
    if (!newName.trim()) return;
    const res = await mutate<{ chatbot: Chatbot }>("/api/chatbots", "POST", { name: newName.trim() });
    setNewName("");
    setCreating(false);
    refetch();
    router.push(`/dashboard/chatbots/${res.chatbot.id}`);
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Chatbots" subtitle="Build and manage your WhatsApp chatbot flows" />

      <div className="p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-500">Manage Chatbots</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Sheet className="w-3.5 h-3.5" />
              Demo: Google Sheet
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Globe className="w-3.5 h-3.5" />
              Demo: HTTP Test
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5" />
              Import Chatbot
            </button>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
              style={{ background: "#16a34a" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Create Chatbot
            </button>
          </div>
        </div>

        {/* Create modal */}
        {creating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-base font-semibold text-gray-800 mb-4">Create New Chatbot</h3>
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="Chatbot name..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:border-green-500 mb-4"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setCreating(false); setNewName(""); }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={create}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: "#16a34a" }}
                >
                  Create & Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chatbots..."
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-1/2">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Chatbot ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {chatbots.map((cb) => (
                <tr
                  key={cb.id}
                  style={{ borderBottom: "1px solid #f8f8f8" }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <span
                      className="text-sm font-medium text-gray-800 cursor-pointer hover:text-green-600 transition-colors"
                      onClick={() => router.push(`/dashboard/chatbots/${cb.id}`)}
                    >
                      {cb.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-gray-400">{cb.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(cb)}
                      className={`relative w-10 rounded-full transition-colors flex-shrink-0`}
                      style={{
                        height: 22,
                        background: cb.enabled ? "#16a34a" : "#d1d5db",
                      }}
                    >
                      <span
                        className="absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white transition-all shadow-sm"
                        style={{ left: cb.enabled ? "calc(100% - 20px)" : "2px" }}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => router.push(`/dashboard/chatbots/${cb.id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {chatbots.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-gray-400">
                    No chatbots found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
