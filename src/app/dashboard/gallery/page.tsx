"use client";

import { useState, useRef } from "react";
import { Image as ImageIcon, Upload, Search, File, Film, Music, FileText } from "lucide-react";
import Header from "@/components/dashboard/Header";
import { useApi, mutate } from "@/lib/use-api";

interface MediaFile {
  id: string;
  filename: string;
  type: "image" | "video" | "document" | "audio";
  size: number;
  url: string;
  createdAt: string;
}

type Tab = "all" | "image" | "video" | "document" | "audio";

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function TypeIcon({ type }: { type: MediaFile["type"] }) {
  if (type === "image") return <ImageIcon className="w-8 h-8 text-blue-400" />;
  if (type === "video") return <Film className="w-8 h-8 text-purple-400" />;
  if (type === "audio") return <Music className="w-8 h-8 text-green-400" />;
  return <FileText className="w-8 h-8 text-orange-400" />;
}

export default function GalleryPage() {
  const { data, refetch } = useApi<{ media: MediaFile[] }>("/api/gallery");
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const all = data?.media ?? [];
  const filtered = all.filter((m) => {
    if (tab !== "all" && m.type !== tab) return false;
    if (search && !m.filename.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const typeMap: Record<string, MediaFile["type"]> = {
      jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image",
      mp4: "video", mov: "video", avi: "video",
      mp3: "audio", wav: "audio", m4a: "audio",
      pdf: "document", doc: "document", docx: "document", xlsx: "document",
    };
    await mutate("/api/gallery", "POST", {
      filename: file.name,
      type: typeMap[ext] ?? "document",
      size: file.size,
      url: "",
    });
    refetch();
    e.target.value = "";
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "image", label: "Images" },
    { key: "video", label: "Videos" },
    { key: "document", label: "Documents" },
    { key: "audio", label: "Audio" },
  ];

  return (
    <div className="min-h-full" style={{ background: "#f8f9fa" }}>
      <Header title="Gallery" subtitle="Media files for your chatbot flows" />

      <div className="p-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700">Media Library</span>
            <span className="text-xs text-gray-400 ml-1">({all.length} files)</span>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: "#16a34a" }}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Media
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-200 mb-4">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media..."
              className="flex-1 text-sm text-gray-700 placeholder-gray-400 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: tab === t.key ? "#16a34a" : "#fff",
                color: tab === t.key ? "#fff" : "#6b7280",
                border: tab === t.key ? "none" : "1px solid #e5e7eb",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
            <File className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No media files found</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 text-sm font-medium"
              style={{ color: "#16a34a" }}
            >
              Upload your first file
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((file) => (
              <div
                key={file.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              >
                {/* Thumbnail area */}
                <div
                  className="h-36 flex items-center justify-center"
                  style={{ background: "#f8f9fa" }}
                >
                  {file.type === "image" && file.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.url}
                      alt={file.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <TypeIcon type={file.type} />
                  )}
                </div>
                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-gray-700 truncate">{file.filename}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatSize(file.size)} &bull; {formatDate(file.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
