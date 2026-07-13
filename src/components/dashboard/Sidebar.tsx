"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Bell,
  LifeBuoy,
  GitBranch,
  ChevronRight,
  Plug,
  ShoppingBag,
  Image,
  MessageCircleQuestion,
  Bot,
  Sparkles,
  Building2,
  Code2,
  CreditCard,
  Settings,
  ChevronLeft,
  LogOut,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Inbox, label: "Inbox", href: "/dashboard/chat" },
  { icon: Bell, label: "Reminders", href: "/dashboard/reminders" },
  { icon: LifeBuoy, label: "My support", href: "/dashboard/support" },
  { icon: GitBranch, label: "Flows", href: "/dashboard/workflows" },
  {
    icon: ChevronRight,
    label: "Manage",
    href: "#",
    children: [
      { label: "WhatsApp Templates", href: "/dashboard/templates" },
      { label: "Groups", href: "/dashboard/groups" },
      { label: "Contacts", href: "/dashboard/crm" },
      { label: "Transactions", href: "/dashboard/transactions" },
      { label: "Campaigns", href: "/dashboard/campaigns" },
      { label: "WhatsApp Forms", href: "/dashboard/forms" },
      { label: "Canned Messages", href: "/dashboard/canned-messages" },
      { label: "Tags", href: "/dashboard/tags" },
      { label: "Columns", href: "/dashboard/columns" },
      { label: "Opts Management", href: "/dashboard/opt-management" },
      { label: "Webhook Events", href: "/dashboard/webhook-events" },
    ],
  },
  { icon: Plug, label: "Integrations", href: "/dashboard/integrations" },
  { icon: ShoppingBag, label: "Commerce", href: "/dashboard/commerce" },
  { icon: Image, label: "Gallery", href: "/dashboard/gallery" },
  { icon: MessageCircleQuestion, label: "FAQ Bot", href: "/dashboard/faq-bot" },
  { icon: Bot, label: "Chatbot", href: "/dashboard/chatbots" },
  { icon: Sparkles, label: "AI Assistant", href: "/dashboard/ai-assistant" },
  { icon: Building2, label: "Organizations", href: "/dashboard/organizations" },
  { icon: Code2, label: "API Endpoints", href: "/dashboard/api-keys" },
  { icon: CreditCard, label: "Billing", href: "/dashboard/billing" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
];

interface SidebarUser {
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
}

export default function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return href !== "#" && pathname.startsWith(href);
  }

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/auth/login");
      router.refresh();
    }
  }

  return (
    <aside
      className={`relative flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0 ${
        collapsed ? "w-16" : "w-60"
      }`}
      style={{ background: "#0B1628", borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 px-4 h-14 flex-shrink-0 ${collapsed ? "justify-center" : ""}`}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
          style={{ background: "#1a2a4a", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          NX
        </div>
        {!collapsed && (
          <span className="font-bold text-sm text-white whitespace-nowrap">
            WhatsFlow AI
          </span>
        )}
      </div>

      {/* Platform menu toggle label */}
      {!collapsed && (
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            Platform menu
          </span>
          <div
            className="w-7 h-4 rounded-full flex items-center px-0.5 cursor-pointer"
            style={{ background: "#16a34a" }}
          >
            <div className="w-3 h-3 rounded-full bg-white ml-auto" />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const isManage = item.label === "Manage";

          if (isManage) {
            const anyChildActive = item.children?.some((c) => c.href !== "#" && pathname.startsWith(c.href));
            return (
              <div key="manage">
                <button
                  onClick={() => !collapsed && setManageOpen(!manageOpen)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${collapsed ? "justify-center" : ""} ${
                    anyChildActive
                      ? "text-white"
                      : "hover:text-white"
                  }`}
                  style={{
                    background: anyChildActive ? "rgba(255,255,255,0.08)" : undefined,
                    color: anyChildActive ? "white" : "rgba(255,255,255,0.55)",
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: anyChildActive ? "white" : "rgba(255,255,255,0.45)" }}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${manageOpen ? "rotate-90" : ""}`}
                        style={{ color: "rgba(255,255,255,0.35)" }}
                      />
                    </>
                  )}
                </button>
                {!collapsed && manageOpen && (
                  <div className="ml-9 mt-0.5 space-y-0.5">
                    {item.children?.map((child) => {
                      const childActive = child.href !== "#" && pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href + child.label}
                          href={child.href}
                          className="block px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                          style={{
                            background: childActive ? "rgba(255,255,255,0.08)" : undefined,
                            color: childActive ? "white" : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center" : ""
              }`}
              style={{
                background: active ? "rgba(255,255,255,0.08)" : undefined,
                color: active ? "white" : "rgba(255,255,255,0.55)",
              }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className="w-4 h-4 flex-shrink-0"
                style={{ color: active ? "white" : "rgba(255,255,255,0.45)" }}
              />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom user card */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="p-3 flex-shrink-0">
        <div className={`flex items-center gap-2.5 px-2 py-2 rounded-lg ${collapsed ? "justify-center" : ""}`}>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: "#2563eb" }}
            title={fullName}
          >
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{fullName}</div>
                <div className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>{user.companyName || user.email}</div>
              </div>
              <button
                onClick={logout}
                disabled={loggingOut}
                title="Log out"
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity z-10"
        style={{ background: "#0B1628", border: "1px solid rgba(255,255,255,0.15)" }}
      >
        <ChevronLeft
          className={`w-3 h-3 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
          style={{ color: "rgba(255,255,255,0.6)" }}
        />
      </button>
    </aside>
  );
}
