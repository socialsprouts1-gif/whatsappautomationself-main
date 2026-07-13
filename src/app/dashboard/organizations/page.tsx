"use client";

import { useState } from "react";
import {
  Building2, Users, Pencil, Check, X, Crown, UserPlus, Trash2,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

type OrgRole = "owner" | "admin" | "member";

interface OrgMember {
  id: string; name: string; email: string; role: OrgRole; joinedAt: string;
}
interface Organization {
  id: string; name: string; plan: string; members: OrgMember[]; createdAt: string;
}

const PLAN_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  Starter: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
  Growth: { bg: "#f5f3ff", text: "#7c3aed", border: "#ddd6fe" },
  Agency: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
};

const AVATAR_COLORS = ["#3b82f6", "#7c3aed", "#16a34a", "#d97706", "#e11d48", "#0891b2"];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function OrgCard({ org, refetch }: { org: Organization; refetch: () => void }) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(org.name);
  const [inviting, setInviting] = useState(false);
  const [invite, setInvite] = useState({ name: "", email: "", role: "member" as "admin" | "member" });

  const planStyle = PLAN_STYLE[org.plan] ?? { bg: "#f3f4f6", text: "#6b7280", border: "#e5e7eb" };

  async function saveName() {
    if (!nameDraft.trim()) return;
    await mutate("/api/organizations", "POST", { orgId: org.id, name: nameDraft.trim() });
    setEditingName(false);
    refetch();
  }

  async function changeRole(memberId: string, role: OrgRole) {
    await mutate("/api/organizations", "PATCH", { orgId: org.id, memberId, role });
    refetch();
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/organizations?orgId=${org.id}&memberId=${memberId}`, { method: "DELETE" });
    refetch();
  }

  async function sendInvite() {
    if (!invite.name || !invite.email) return;
    await mutate("/api/organizations", "POST", {
      orgId: org.id, name: invite.name, email: invite.email, role: invite.role,
    });
    setInvite({ name: "", email: "", role: "member" });
    setInviting(false);
    refetch();
  }

  return (
    <div className="space-y-5">
      {/* Org header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    autoFocus
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-gray-800 focus:outline-none focus:border-blue-400"
                  />
                  <button onClick={saveName} className="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Save">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setEditingName(false); setNameDraft(org.name); }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" title="Cancel">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800 truncate">{org.name}</h3>
                  <button onClick={() => { setNameDraft(org.name); setEditingName(true); }}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-500" title="Rename organization">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-0.5">Created {fmtDate(org.createdAt)}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
              style={{ background: planStyle.bg, color: planStyle.text, border: `1px solid ${planStyle.border}` }}>
              {org.plan} plan
            </span>
            <span className="flex items-center gap-1.5 text-sm text-gray-500">
              <Users className="w-4 h-4 text-gray-400" /> {org.members.length} member{org.members.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
          {["Member", "Email", "Role", ""].map((h, i) => (
            <div key={i} className={`text-[11px] font-semibold uppercase tracking-wide text-gray-400 ${
              i === 0 ? "col-span-4" : i === 1 ? "col-span-4" : i === 2 ? "col-span-3" : "col-span-1"
            }`}>{h}</div>
          ))}
        </div>

        {org.members.map((m) => (
          <div key={m.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 last:border-0 items-center hover:bg-gray-50 transition-colors">
            <div className="col-span-4 flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: avatarColor(m.name) }}>
                {m.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-800 truncate">{m.name}</span>
            </div>
            <div className="col-span-4 text-sm text-gray-500 truncate">{m.email}</div>
            <div className="col-span-3">
              {m.role === "owner" ? (
                <span className="text-[11px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit bg-gray-100 text-gray-500 border border-gray-200">
                  <Crown className="w-3 h-3" /> Owner
                </span>
              ) : (
                <select
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value as OrgRole)}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:border-blue-400 capitalize"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
              )}
            </div>
            <div className="col-span-1 flex justify-end">
              {m.role !== "owner" && (
                <button onClick={() => removeMember(m.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors" title="Remove member">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Invite form / button */}
        <div className="px-4 py-4">
          {inviting ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                  placeholder="Full name"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                <input value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                  placeholder="Email address"
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as "admin" | "member" })}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={sendInvite} disabled={!invite.name || !invite.email}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-50">
                  <Check className="w-3.5 h-3.5" /> Send invite
                </button>
                <button onClick={() => setInviting(false)}
                  className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setInviting(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">
              <UserPlus className="w-4 h-4" /> Invite member
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrganizationsPage() {
  const { data, refetch } = useApi<{ organizations: Organization[] }>("/api/organizations");
  const organizations = data?.organizations ?? [];

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Organizations" subtitle="Manage your workspace and team members" />
      <div className="p-6 space-y-8">
        {organizations.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            No organizations yet.
          </div>
        ) : (
          organizations.map((org) => <OrgCard key={org.id} org={org} refetch={refetch} />)
        )}
      </div>
    </div>
  );
}
