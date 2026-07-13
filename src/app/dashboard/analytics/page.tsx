"use client";

import {
  Send, CheckCircle, Eye, Users, TrendingUp, Activity,
  BarChart2, MessageCircle,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import Header from "@/components/dashboard/Header";
import { useApi } from "@/lib/use-api";

interface Analytics {
  kpis: { totalSent: number; delivered: number; deliveryRate: number; readRate: number; inbound: number; contacts: number; activeCampaigns: number };
  trend: Array<{ label: string; sent: number; delivered: number; read: number }>;
  funnel: Array<{ stage: string; value: number }>;
  topRules: Array<{ name: string; triggered: number }>;
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
const FUNNEL_COLORS = ["#3b82f6", "#16a34a", "#7c3aed", "#d97706"];

export default function AnalyticsPage() {
  const { data } = useApi<Analytics>("/api/analytics");
  const k = data?.kpis;

  const kpiCards = [
    { label: "Total Sent", value: k ? fmt(k.totalSent) : "—", icon: Send, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Delivery Rate", value: k ? `${k.deliveryRate}%` : "—", icon: CheckCircle, color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    { label: "Read Rate", value: k ? `${k.readRate}%` : "—", icon: Eye, color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
    { label: "Contacts", value: k ? fmt(k.contacts) : "—", icon: Users, color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    { label: "Inbound Messages", value: k ? fmt(k.inbound) : "—", icon: MessageCircle, color: "#0891b2", bg: "#f0f9ff", border: "#bae6fd" },
    { label: "Active Campaigns", value: k?.activeCampaigns ?? "—", icon: Activity, color: "#e11d48", bg: "#fff1f2", border: "#fecdd3" },
  ];

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Analytics" subtitle="Performance across messages, campaigns and automations" />
      <div className="p-6 space-y-5">

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map(c => (
            <div key={c.label} className="bg-white rounded-xl border p-4" style={{ borderColor: c.border }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                <c.icon className="w-4 h-4" style={{ color: c.color }} />
              </div>
              <div className="text-2xl font-black" style={{ color: c.color }}>{c.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Volume trend chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-800">Message volume — last 14 days</h3>
            <div className="ml-auto flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded inline-block bg-blue-500" />Sent</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded inline-block bg-purple-500" />Read</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.trend ?? []}>
                <defs>
                  <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: "#374151" }} />
                <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} fill="url(#gSent)" />
                <Area type="monotone" dataKey="read" stroke="#7c3aed" strokeWidth={2} fill="url(#gRead)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Delivery funnel */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 className="w-4 h-4 text-green-500" />
              <h3 className="font-semibold text-gray-800">Delivery funnel</h3>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.funnel ?? []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 12, fill: "#6b7280" }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, fontSize: 12 }}
                    cursor={{ fill: "#f9fafb" }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {(data?.funnel ?? []).map((_, i) => (
                      <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top automation rules */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-gray-800">Top automation rules</h3>
            </div>
            <div className="space-y-4">
              {(data?.topRules ?? []).map((r, i) => {
                const max = data?.topRules[0]?.triggered || 1;
                const color = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
                return (
                  <div key={r.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-700 font-medium">{r.name}</span>
                      <span className="text-gray-400 tabular-nums">{r.triggered.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${(r.triggered / max) * 100}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
              {!data?.topRules?.length && (
                <p className="text-sm text-gray-400 text-center py-8">No automation rules triggered yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
