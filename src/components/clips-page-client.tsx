"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, EmptyState } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn, engagementColor, formatDuration } from "@/lib/utils";

type ClipT = {
  id: string;
  title: string;
  engagementScore: number;
  durationSec: number;
  aspectRatio: string;
  video?: { storagePath?: string } | null;
  project?: { id: string; name: string } | null;
};

export function ClipsPageClient({ initial }: { initial: ClipT[] }) {
  const toast = useToast();
  const [clips, setClips] = useState(initial);
  const [q, setQ] = useState("");
  const [ratio, setRatio] = useState("");

  const filtered = clips.filter((c) => {
    if (q && !(c.title || "").toLowerCase().includes(q.toLowerCase())) return false;
    if (ratio && c.aspectRatio !== ratio) return false;
    return true;
  });

  async function del(id: string) {
    if (!confirm("Delete this clip?")) return;
    const res = await fetch(`/api/clips/${id}`, { method: "DELETE" });
    if (res.ok) { setClips((c) => c.filter((x) => x.id !== id)); toast("Clip deleted"); }
    else toast("Could not delete", "error");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My clips</h1>
          <p className="text-sm text-slate-400">All clips you've generated across projects.</p>
        </div>
        <div className="flex gap-2">
          <input className="input max-w-xs" placeholder="Search clips…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="input max-w-[150px]" value={ratio} onChange={(e) => setRatio(e.target.value)}>
            <option value="">All ratios</option>
            <option value="9:16">9:16</option>
            <option value="16:9">16:9</option>
            <option value="1:1">1:1</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={clips.length ? "No clips match" : "No clips yet"}
          description="Generate clips from a project and they'll show up here."
          action={<Link href="/new" className="btn-primary">＋ New project</Link>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((c) => {
            const url = c.video?.storagePath ? `/api/media/${c.video.storagePath}` : "";
            return (
              <div key={c.id} className="card overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {url && <video src={url} className="h-full w-full object-contain" muted controls preload="metadata" />}
                </div>
                <div className="p-4">
                  <Link href={c.project ? `/project/${c.project.id}` : "#"} className="block truncate font-semibold hover:text-brand-300">{c.title}</Link>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{formatDuration(c.durationSec)} · {c.aspectRatio}</span>
                    <span className={cn("font-bold", engagementColor(c.engagementScore))}>{c.engagementScore}</span>
                  </div>
                  {c.project && <p className="mt-1 truncate text-xs text-slate-600">in {c.project.name}</p>}
                  <div className="mt-3 flex gap-2">
                    <a href={`/api/clips/${c.id}/download`} className="btn-secondary !px-2.5 !py-1.5 text-xs flex-1">Download</a>
                    <button onClick={() => del(c.id)} className="btn-ghost !px-2.5 !py-1.5 text-xs hover:!text-rose-400">🗑</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}