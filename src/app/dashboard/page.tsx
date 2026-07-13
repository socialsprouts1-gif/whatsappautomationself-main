"use client";

import {
  Send, Users, Megaphone, MessageCircle, Bot, Zap, TrendingUp, Activity,
  CheckCircle, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import Header from "@/components/dashboard/Header";
import { useApi } from "@/lib/use-api";
import { useCallback } from "react";

interface Overview {
  stats: {
    messagesSent: number;
    contacts: number;
    activeCampaigns: number;
    unreadConversations: number;
    activeRules: number;
    automationsRun: number;
    activeChatbots: number;
    totalChatbots: number;
    chatbotTriggers: number;
    whatsappConnected: boolean;
  };
  spark: number[];
  recentConversations: Array<{
    id: string;
    lastMessagePreview: string;
    lastMessageAt: string;
    contact?: { name: string };
  }>;
  activity: Array<{ id: string; type: string; text: string; timestamp: string }>;
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DashboardPage() {
  const { data, refetch } = useApi<Overview>("/api/overview");
  const stats = data?.stats;
  const spark = (data?.spark ?? []).map((v, i) => ({ day: days[i % 7], v }));

  const handleRefresh = useCallback(() => refetch(), [refetch]);

  const kpiCards = [
    {
      label: "Messages Sent",
      value: stats ? fmt(stats.messagesSent) : "—",
      icon: Send,
      bg: "#eff6ff",
      iconColor: "#3b82f6",
      border: "#bfdbfe",
    },
    {
      label: "Contacts",
      value: stats ? fmt(stats.contacts) : "—",
      icon: Users,
      bg: "#f0fdf4",
      iconColor: "#16a34a",
      border: "#bbf7d0",
    },
    {
      label: "Active Chatbots",
      value: stats ? `${stats.activeChatbots}/${stats.totalChatbots}` : "—",
      icon: Bot,
      bg: "#faf5ff",
      iconColor: "#9333ea",
      border: "#e9d5ff",
    },
    {
      label: "Chatbot Triggers",
      value: stats ? fmt(stats.chatbotTriggers) : "—",
      icon: Zap,
      bg: "#fffbeb",
      iconColor: "#d97706",
      border: "#fde68a",
    },
    {
      label: "Active Campaigns",
      value: stats?.activeCampaigns ?? "—",
      icon: Megaphone,
      bg: "#fff1f2",
      iconColor: "#e11d48",
      border: "#fecdd3",
    },
    {
      label: "Unread Chats",
      value: stats?.unreadConversations ?? "—",
      icon: MessageCircle,
      bg: "#f0f9ff",
      iconColor: "#0284c7",
      border: "#bae6fd",
    },
  ];

  return (
    <div style={{ background: "#f8f9fa" }} className="min-h-full">
      <Header title="Dashboard" subtitle="Your WhatsApp automation at a glance" />

      <div className="p-6 space-y-6">
        {/* Connection status banner */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: stats?.whatsappConnected ? "#f0fdf4" : "#fffbeb",
            border: `1px solid ${stats?.whatsappConnected ? "#bbf7d0" : "#fde68a"}`,
            color: stats?.whatsappConnected ? "#16a34a" : "#d97706",
          }}
        >
          {stats?.whatsappConnected ? (
            <>
              <Wifi className="w-4 h-4" />
              WhatsApp connected — live messages flowing
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              WhatsApp not connected — go to{" "}
              <a href="/dashboard/settings" className="underline font-semibold">
                Settings
              </a>{" "}
              to connect your number
            </>
          )}
          <button onClick={handleRefresh} className="ml-auto opacity-60 hover:opacity-100">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpiCards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl p-4"
              style={{ background: "#fff", border: "1px solid #e5e7eb" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                <c.icon className="w-4 h-4" style={{ color: c.iconColor }} />
              </div>
              <div className="text-2xl font-black text-gray-800">{c.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Volume chart */}
          <div
            className="rounded-xl p-6 lg:col-span-2"
            style={{ background: "#fff", border: "1px solid #e5e7eb" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" /> Message Volume
                </h3>
                <p className="text-xs text-gray-400">Last 7 days</p>
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={spark}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#374151" }}
                    itemStyle={{ color: "#3b82f6" }}
                  />
                  <Area type="monotone" dataKey="v" stroke="#3b82f6" strokeWidth={2} fill="url(#blueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity feed */}
          <div
            className="rounded-xl p-6"
            style={{ background: "#fff", border: "1px solid #e5e7eb" }}
          >
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-purple-500" /> Recent Activity
            </h3>
            <div className="space-y-3">
              {(data?.activity ?? []).slice(0, 8).map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{
                      background:
                        a.type === "chatbot" ? "#9333ea" :
                        a.type === "message" ? "#3b82f6" :
                        a.type === "automation" ? "#16a34a" :
                        "#d97706",
                    }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-700 leading-snug">{a.text}</p>
                    <p className="text-[10px] text-gray-400">{timeAgo(a.timestamp)}</p>
                  </div>
                </div>
              ))}
              {!data?.activity?.length && (
                <p className="text-xs text-gray-400">No activity yet. Send a message to see it here.</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent conversations */}
        <div
          className="rounded-xl p-6"
          style={{ background: "#fff", border: "1px solid #e5e7eb" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-blue-500" /> Recent Conversations
            </h3>
            <a
              href="/dashboard/chat"
              className="text-xs text-blue-500 hover:text-blue-700 font-medium"
            >
              View all →
            </a>
          </div>
          <div className="space-y-2">
            {(data?.recentConversations ?? []).map((c) => (
              <a
                key={c.id}
                href="/dashboard/chat"
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 text-white"
                  style={{ background: "#3b82f6" }}
                >
                  {c.contact?.name?.charAt(0) ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{c.contact?.name}</div>
                  <div className="text-xs text-gray-400 truncate">{c.lastMessagePreview}</div>
                </div>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(c.lastMessageAt)}</span>
              </a>
            ))}
            {!data?.recentConversations?.length && (
              <p className="text-sm text-gray-400 py-4 text-center">No conversations yet</p>
            )}
          </div>
        </div>

        {/* Chatbot stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="rounded-xl p-5"
            style={{ background: "#fff", border: "1px solid #e5e7eb" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-purple-500" />
              <span className="font-semibold text-gray-800 text-sm">Chatbot Status</span>
            </div>
            <div className="text-3xl font-black text-gray-800 mb-1">
              {stats?.activeChatbots ?? 0}
              <span className="text-base font-medium text-gray-400">/{stats?.totalChatbots ?? 0}</span>
            </div>
            <p className="text-xs text-gray-500">chatbots active on your number</p>
            <a
              href="/dashboard/chatbots"
              className="mt-3 inline-block text-xs text-purple-500 hover:text-purple-700 font-medium"
            >
              Manage chatbots →
            </a>
          </div>

          <div
            className="rounded-xl p-5"
            style={{ background: "#fff", border: "1px solid #e5e7eb" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="font-semibold text-gray-800 text-sm">Automations Running</span>
            </div>
            <div className="text-3xl font-black text-gray-800 mb-1">
              {stats?.activeRules ?? 0}
            </div>
            <p className="text-xs text-gray-500">keyword rules active</p>
            <p className="text-xs text-gray-400 mt-1">
              {fmt(stats?.automationsRun ?? 0)} total triggers all time
            </p>
          </div>

          <div
            className="rounded-xl p-5"
            style={{ background: "#fff", border: "1px solid #e5e7eb" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-red-500" />
              <span className="font-semibold text-gray-800 text-sm">Campaigns</span>
            </div>
            <div className="text-3xl font-black text-gray-800 mb-1">
              {stats?.activeCampaigns ?? 0}
            </div>
            <p className="text-xs text-gray-500">campaigns currently sending</p>
            <a
              href="/dashboard/campaigns"
              className="mt-3 inline-block text-xs text-red-500 hover:text-red-700 font-medium"
            >
              View campaigns →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
