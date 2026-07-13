"use client";

import { useState } from "react";
import { Plus, Users, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  status: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  contactIds: string[];
  createdAt: string;
  contacts: Contact[];
}

const AVATAR_COLORS = ["#3b82f6", "#7c3aed", "#16a34a", "#d97706", "#e11d48", "#0891b2"];

function avatarColor(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export default function GroupsPage() {
  const { data, refetch } = useApi<{ groups: Group[] }>("/api/groups");
  const { data: contactsData } = useApi<{ contacts: Contact[] }>("/api/contacts");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [managingId, setManagingId] = useState<string | null>(null);

  const groups = data?.groups ?? [];
  const allContacts = contactsData?.contacts ?? [];

  async function createGroup() {
    if (!form.name) return;
    await mutate("/api/groups", "POST", { name: form.name, description: form.description });
    setForm({ name: "", description: "" });
    setCreating(false);
    refetch();
  }

  async function toggleMember(group: Group, contactId: string) {
    const has = group.contactIds.includes(contactId);
    const contactIds = has
      ? group.contactIds.filter((id) => id !== contactId)
      : [...group.contactIds, contactId];
    await mutate("/api/groups", "PATCH", { id: group.id, contactIds });
    refetch();
  }

  async function deleteGroup(id: string) {
    if (!confirm("Delete this group? This cannot be undone.")) return;
    await fetch(`/api/groups?id=${id}`, { method: "DELETE" });
    refetch();
  }

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Groups" subtitle="Organize contacts into custom groups for targeted campaigns" />
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> {groups.length} group{groups.length === 1 ? "" : "s"}
          </h2>
          <button
            onClick={() => setCreating((c) => !c)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Group
          </button>
        </div>

        {creating && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h3 className="font-semibold text-gray-800 text-sm">Create new group</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Group name"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={createGroup}
                disabled={!form.name}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" /> Save
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

        {groups.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            No groups yet. Create your first group to organize contacts for campaigns.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groups.map((g) => {
              const expanded = managingId === g.id;
              const shown = g.contacts.slice(0, 5);
              const extra = g.contacts.length - shown.length;
              return (
                <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{g.name}</div>
                      {g.description && <div className="text-xs text-gray-400 mt-0.5 truncate">{g.description}</div>}
                    </div>
                    <button
                      onClick={() => deleteGroup(g.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Delete group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 mb-2">
                    {g.contacts.length} member{g.contacts.length === 1 ? "" : "s"}
                  </div>

                  <div className="flex items-center -space-x-2 mb-4">
                    {shown.map((c) => (
                      <div
                        key={c.id}
                        title={c.name}
                        className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: avatarColor(c.name) }}
                      >
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                    ))}
                    {extra > 0 && (
                      <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-semibold text-gray-500 bg-gray-100 flex-shrink-0">
                        +{extra}
                      </div>
                    )}
                    {g.contacts.length === 0 && <span className="text-xs text-gray-300 italic">No members yet</span>}
                  </div>

                  <button
                    onClick={() => setManagingId(expanded ? null : g.id)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 mt-auto"
                  >
                    Manage members
                    {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 max-h-64 overflow-y-auto space-y-1">
                      {allContacts.length === 0 ? (
                        <div className="text-xs text-gray-300 italic py-2">No contacts available.</div>
                      ) : (
                        allContacts.map((c) => {
                          const checked = g.contactIds.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMember(g, c.id)}
                                className="w-3.5 h-3.5 accent-blue-600 flex-shrink-0"
                              />
                              <span className="text-xs text-gray-700 truncate">{c.name}</span>
                              <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">+{c.phone}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
