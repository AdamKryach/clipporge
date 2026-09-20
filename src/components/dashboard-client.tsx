"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, Input, Select, Badge, EmptyState } from "@/components/ui";
import { useToast } from "@/components/toast";
import { formatDuration, statusLabel, cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
  status: string;
  totalClips: number;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  sourceVideo?: { storagePath?: string; durationSec?: number } | null;
};

export function DashboardClient({
  initialProjects,
  stats,
  planName,
}: {
  initialProjects: Project[];
  stats: { projects: number; processed: number; clips: number; remaining: number; maxVideos: number; plan: string };
  planName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [projects, setProjects] = useState(initialProjects);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [minClips, setMinClips] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [demoing, setDemoing] = useState(false);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (status && p.status !== status) return false;
      if (date) {
        const d = new Date(date);
        const pd = new Date(p.createdAt);
        if (pd.toDateString() !== d.toDateString()) return false;
      }
      if (minClips && p.totalClips < Number(minClips)) return false;
      return true;
    });
  }, [projects, q, status, date, minClips]);

  async function createProject() {
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await res.json();
    if (res.ok) router.push(`/project/${data.project.id}`);
    else toast(data.error || "Could not create project", "error");
  }

  async function runDemo() {
    setDemoing(true);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast("Demo started — generating sample clips");
        router.push(`/project/${data.projectId}`);
      } else toast(data.error || "Demo failed", "error");
    } catch {
      toast("Demo failed", "error");
    } finally {
      setDemoing(false);
    }
  }

  async function duplicate(id: string) {
    setBusy(id);
    const res = await fetch(`/api/projects/${id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setProjects((p) => [{ ...data.project, totalClips: 0 }, ...p]);
      toast("Project duplicated");
    } else toast("Could not duplicate", "error");
    setBusy(null);
  }

  async function del(id: string) {
    if (!confirm("Delete this project and all its clips?")) return;
    setBusy(id);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((p) => p.filter((x) => x.id !== id));
      toast("Project deleted");
    } else toast("Could not delete", "error");
    setBusy(null);
  }

  const statusTone = (s: string) =>
    s === "complete" ? "green" : s === "failed" ? "rose" : s === "processing" || s === "uploading" ? "amber" : "slate";

  const pct = stats.maxVideos ? Math.min(100, (stats.remaining / stats.maxVideos) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-400">Welcome back. {stats.remaining} video credits left this month.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" loading={demoing} onClick={runDemo}>▶ Try Demo</Button>
          <Button onClick={createProject}>＋ New Project</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Projects", value: stats.projects, icon: "🗂" },
          { label: "Videos processed", value: stats.processed, icon: "🎞" },
          { label: "Clips generated", value: stats.clips, icon: "✂️" },
          { label: "Credits left", value: `${stats.remaining}/${stats.maxVideos}`, icon: "⚡" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-2xl">{s.icon}</span>
              <Badge tone="brand">{planName}</Badge>
            </div>
            <p className="mt-3 text-3xl font-extrabold">{s.value}</p>
            <p className="text-sm text-slate-400">{s.label}</p>
            {s.label === "Credits left" && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Search / filter */}
      <div className="card p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Input placeholder="Search projects…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="processing">Processing</option>
            <option value="complete">Complete</option>
            <option value="failed">Failed</option>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Select value={minClips} onChange={(e) => setMinClips(e.target.value)}>
            <option value="">Any clips</option>
            <option value="1">1+ clips</option>
            <option value="3">3+ clips</option>
            <option value="5">5+ clips</option>
            <option value="10">10+ clips</option>
          </Select>
        </div>
      </div>

      {/* Projects list */}
      {filtered.length === 0 ? (
        <EmptyState
          title={projects.length ? "No projects match your filters" : "No projects yet"}
          description={projects.length ? "Try clearing your search or filters." : "Upload a video or run the demo to see your first clips."}
          action={<Button onClick={createProject}>＋ New Project</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <div key={p.id} className="card overflow-hidden transition hover:border-brand-500/40">
              <Link href={`/project/${p.id}`} className="block">
                <div className="relative flex aspect-video items-center justify-center bg-black/40">
                  {p.sourceVideo?.storagePath ? (
                    <video src={`/api/media/${p.sourceVideo.storagePath}`} className="h-full w-full object-cover" muted />
                  ) : (
                    <span className="text-4xl">🎬</span>
                  )}
                  <span className="absolute left-2 top-2"><Badge tone={statusTone(p.status)}>{statusLabel(p.status)}</Badge></span>
                  {p.status === "processing" && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="animate-spin text-2xl">⏳</span></div>}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/project/${p.id}`}>
                  <h3 className="truncate font-semibold hover:text-brand-300">{p.name}</h3>
                </Link>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>{p.totalClips} clips</span>
                  {p.sourceVideo?.durationSec != null && <span>· {formatDuration(p.sourceVideo.durationSec)} source</span>}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link href={`/project/${p.id}`} className="btn-secondary !px-3 !py-1.5 text-xs flex-1">Open</Link>
                  <button onClick={() => duplicate(p.id)} disabled={busy === p.id} className="btn-ghost !px-2.5 !py-1.5 text-xs" title="Duplicate">⧉</button>
                  <button onClick={() => del(p.id)} disabled={busy === p.id} className="btn-ghost !px-2.5 !py-1.5 text-xs hover:!text-rose-400" title="Delete">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}