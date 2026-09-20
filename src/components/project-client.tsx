"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Select, Badge, Field } from "@/components/ui";
import { useToast } from "@/components/toast";
import { UploadDropzone } from "@/components/upload-dropzone";
import { ClipEditor } from "@/components/clip-editor";
import { formatDuration, statusLabel, engagementColor, timeLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STYLES = [
  { id: "auto", label: "Auto-detect" },
  { id: "funny", label: "Funny" },
  { id: "educational", label: "Educational" },
  { id: "motivational", label: "Motivational" },
  { id: "podcast", label: "Podcast" },
  { id: "gaming", label: "Gaming" },
  { id: "storytelling", label: "Storytelling" },
];

const STAGES = [
  { id: "uploading", label: "Uploading" },
  { id: "preparing", label: "Preparing video" },
  { id: "transcribing", label: "Transcribing audio" },
  { id: "finding_highlights", label: "Finding highlights" },
  { id: "creating_clips", label: "Creating clips" },
  { id: "adding_captions", label: "Adding captions" },
  { id: "rendering", label: "Rendering" },
  { id: "complete", label: "Complete" },
];

type ClipT = {
  id: string;
  title: string;
  description: string;
  hashtags: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  engagementScore: number;
  tags: string;
  status: string;
  aspectRatio: string;
  captionStyle: string;
  captionPosition: string;
  captionFontSize: number;
  titleOverlay: boolean;
  autoZoom: boolean;
  watermarkText?: string | null;
  video?: { storagePath?: string } | null;
  outputPath?: string | null;
  segments: { index: number; text: string; startSec: number; endSec: number }[];
};

export function ProjectClient({
  initial,
}: {
  initial: {
    project: any;
    plan: { id: string; name: string; maxClipLengthSec: number; watermarkFree: boolean };
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [p, setP] = useState(initial.project);
  const plan = initial.plan;
  const srcUrl = p.sourceVideo?.storagePath ? `/api/media/${p.sourceVideo.storagePath}` : null;
  const srcDuration = p.sourceVideo?.durationSec ?? 0;

  const [options, setOptions] = useState({
    numClips: p.settings?.numClips || 5,
    clipLength: p.settings?.clipLength || 30,
    style: p.settings?.style || "auto",
    aspectRatio: p.settings?.aspectRatio || "9:16",
  });
  const [job, setJob] = useState<null | { id: string; stage: string; progress: number; message?: string; error?: string }>(null);
  const [renaming, setRenaming] = useState(false);
  const [editClip, setEditClip] = useState<ClipT | null>(null);

  const isProcessing = p.status === "processing" || p.status === "uploading";
  const isComplete = p.status === "complete" && p.clips?.length;

  const poll = useCallback(async (jobId: string) => {
    const res = await fetch(`/api/projects/${p.id}/jobs/${jobId}`);
    const data = await res.json();
    if (!res.ok) return;
    setJob(data);
    if (data.status === "complete" || data.status === "failed") {
      await refreshProject();
    } else {
      setTimeout(() => poll(jobId), 1200);
    }
  }, [p.id]);

  async function refreshProject() {
    const res = await fetch(`/api/projects/${p.id}`);
    const data = await res.json();
    if (res.ok) setP(data.project);
  }

  const startProcessing = useCallback(async () => {
    const res = await fetch(`/api/projects/${p.id}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || "Could not start processing", "error");
      return;
    }
    toast("Processing started");
    setP((prev: any) => ({ ...prev, status: "processing" }));
    poll(data.jobId);
  }, [p.id, options]);

  async function rename(name: string) {
    setRenaming(true);
    const res = await fetch(`/api/projects/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      setP((prev: any) => ({ ...prev, name: data.project.name }));
      toast("Renamed");
    } else toast("Could not rename", "error");
    setRenaming(false);
  }

  async function del() {
    if (!confirm("Delete this project and all clips?")) return;
    const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    if (res.ok) { toast("Project deleted"); router.push("/dashboard"); }
    else toast("Could not delete", "error");
  }

  async function duplicate() {
    const res = await fetch(`/api/projects/${p.id}/duplicate`, { method: "POST" });
    if (res.ok) { const d = await res.json(); router.push(`/project/${d.project.id}`); }
    else toast("Could not duplicate", "error");
  }

  async function deleteClip(id: string) {
    const res = await fetch(`/api/clips/${id}`, { method: "DELETE" });
    if (res.ok) { setP((prev: any) => ({ ...prev, clips: prev.clips.filter((c: any) => c.id !== id) })); toast("Clip deleted"); }
    else toast("Could not delete", "error");
  }

  async function duplicateClip(id: string) {
    const res = await fetch(`/api/clips/${id}/duplicate`, { method: "POST" });
    if (res.ok) { await refreshProject(); toast("Clip duplicated"); }
    else toast("Could not duplicate", "error");
  }

  const stageIdx = useMemo(() => STAGES.findIndex((s) => s.id === job?.stage) + 1, [job?.stage]);
  const jobProgress = job?.progress ?? (isComplete ? 100 : 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          {renaming ? (
            <RenameForm initial={p.name} onSave={rename} onCancel={() => setRenaming(false)} />
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{p.name}</h1>
              <button onClick={() => setRenaming(true)} className="text-slate-500 hover:text-brand-300" title="Rename">✏️</button>
            </div>
          )}
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-400">
            <Link href="/dashboard" className="hover:text-brand-300">← Dashboard</Link>
            <span>·</span>
            <Badge tone={p.status === "complete" ? "green" : p.status === "failed" ? "rose" : "amber"}>{statusLabel(p.status)}</Badge>
            {srcDuration > 0 && <span>· {formatDuration(srcDuration)} source</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={duplicate}>⧉ Duplicate</Button>
          <Button variant="danger" onClick={del}>🗑 Delete</Button>
        </div>
      </div>

      {/* Processing progress */}
      {(isProcessing || job) && !isComplete && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{job?.message || "Processing your video…"}</h2>
            <span className="text-sm text-brand-300">{jobProgress}%</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all" style={{ width: `${jobProgress}%` }} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STAGES.filter((s) => s.id !== "uploading").map((s, i) => (
              <div key={s.id} className={cn("rounded-xl border px-3 py-2 text-xs", i < stageIdx - 1 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : i === stageIdx - 1 ? "border-brand-500/40 bg-brand-500/10 text-brand-200" : "border-white/10 text-slate-500")}>
                {i < stageIdx - 1 ? "✓ " : ""}{s.label}
              </div>
            ))}
          </div>
          {job?.error && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{job.error}</div>
          )}
        </div>
      )}

      {/* Failed */}
      {p.status === "failed" && !isProcessing && (
        <div className="card border-rose-500/30 p-6">
          <h2 className="font-semibold text-rose-300">Processing failed</h2>
          <p className="mt-1 text-sm text-slate-400">{p.error || "An unknown error occurred."}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={startProcessing}>↻ Retry</Button>
          </div>
        </div>
      )}

      {/* No source -> upload */}
      {!p.sourceVideo && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">1 · Upload your video</h2>
          <UploadDropzone />
        </div>
      )}

      {/* Source present, not processed -> options */}
      {p.sourceVideo && !isComplete && !isProcessing && p.status !== "failed" && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold">2 · Choose how to clip</h2>
          <p className="mb-5 mt-1 text-sm text-slate-400">Pick your format and let the AI find the best moments.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Number of clips">
              <Select value={String(options.numClips)} onChange={(e) => setOptions({ ...options, numClips: Number(e.target.value) })}>
                <option value="3">3 clips</option>
                <option value="5">5 clips</option>
                <option value="10">10 clips</option>
                <option value="2">Custom (2)</option>
              </Select>
            </Field>
            <Field label="Clip length">
              <Select value={String(options.clipLength)} onChange={(e) => setOptions({ ...options, clipLength: Number(e.target.value) })}>
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
              </Select>
            </Field>
            <Field label="Content style">
              <Select value={options.style} onChange={(e) => setOptions({ ...options, style: e.target.value })}>
                {STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </Field>
            <Field label="Aspect ratio">
              <Select value={options.aspectRatio} onChange={(e) => setOptions({ ...options, aspectRatio: e.target.value })}>
                <option value="9:16">9:16 · Vertical</option>
                <option value="16:9">16:9 · Landscape</option>
                <option value="1:1">1:1 · Square</option>
              </Select>
            </Field>
          </div>
          <div className="mt-6 flex items-center gap-3">
            <Button onClick={startProcessing} size="lg">✨ Generate clips</Button>
            <p className="text-xs text-slate-500">Max clip length on {plan.name}: {plan.maxClipLengthSec}s</p>
          </div>
        </div>
      )}

      {/* Results grid */}
      {isComplete && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{p.clips.length} clips ready</h2>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={startProcessing}>↻ Re-generate</Button>
              <ExportAll project={p} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.clips.map((clip: any) => {
              const url = clip.video?.storagePath ? `/api/media/${clip.video.storagePath}` : "";
              const tags = JSON.parse(clip.tags || "[]");
              return (
                <div key={clip.id} className="card overflow-hidden">
                  <div className="relative aspect-video bg-black">
                    {url && <video src={url} className="h-full w-full object-contain" muted controls preload="metadata" />}
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold backdrop-blur">{clip.aspectRatio}</span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold leading-snug">{clip.title}</h3>
                      <span className={cn("shrink-0 rounded-full bg-black/40 px-2 py-0.5 text-xs font-bold", engagementColor(clip.engagementScore))}>{clip.engagementScore}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{formatDuration(clip.durationSec)} · {timeLabel(clip.startSec)}–{timeLabel(clip.endSec)}</div>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map((t: string) => <span key={t} className="chip !px-2 !py-0.5 text-[10px]">{t}</span>)}
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setEditClip(clip)}>Edit</Button>
                      <a href={`/api/clips/${clip.id}/download`} className="btn btn-secondary btn-sm !px-2 !py-1.5 text-xs">Download</a>
                      <button onClick={() => duplicateClip(clip.id)} className="btn-ghost !px-2 !py-1.5 text-xs" title="Duplicate">⧉</button>
                      <button onClick={() => deleteClip(clip.id)} className="btn-ghost !px-2 !py-1.5 text-xs hover:!text-rose-400" title="Delete">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editClip && (
        <ClipEditor
          clip={editClip}
          sourceVideoPath={p.sourceVideo?.storagePath}
          onClose={() => setEditClip(null)}
          onSaved={() => { setEditClip(null); refreshProject(); }}
        />
      )}
    </div>
  );
}

function RenameForm({ initial, onSave, onCancel }: { initial: string; onSave: (n: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex items-center gap-2">
      <input className="input max-w-xs" value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      <Button size="sm" onClick={() => onSave(v)}>Save</Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
    </div>
  );
}

function ExportAll({ project }: { project: any }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolution: 1080 }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error || "Export failed", "error");
        setBusy(false);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${project.name || "project"}-clips.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Export complete");
    } catch {
      toast("Export failed", "error");
    }
    setBusy(false);
  }
  return <Button variant="primary" loading={busy} onClick={go}>📦 Download all (.zip)</Button>;
}