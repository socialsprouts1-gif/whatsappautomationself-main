"use client";

import { Bell } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      className="flex items-center justify-between h-14 px-6 sticky top-0 z-20"
      style={{
        background: "#ffffff",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      {/* Title */}
      <div>
        <h1 className="text-base font-semibold text-gray-800">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors hidden sm:block">
          Reminders
        </button>

        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4 text-gray-500" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: "#2563eb" }}
        >
          AA
        </div>
      </div>
    </header>
  );
}
