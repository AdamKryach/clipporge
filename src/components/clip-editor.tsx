"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Select, Field, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn, timeLabel } from "@/lib/utils";

const STYLE_OPTIONS = [
  { id: "clean", label: "Clean" },
  { id: "bold", label: "Bold" },
  { id: "karaoke", label: "Karaoke" },
  { id: "highlight", label: "Highlight" },
  { id: "minimal", label: "Minimal" },
];

type ClipT = {
  id: string;
  title: string;
  description: string;
  startSec: number;
  endSec: number;
  aspectRatio: string;
  captionStyle: string;
  captionPosition: string;
  captionFontSize: number;
  titleOverlay: boolean;
  watermarkText?: string | null;
  autoZoom: boolean;
  segments: { index: number; text: string; startSec: number; endSec: number }[];
};

export function ClipEditor({
  clip,
  sourceVideoPath,
  onClose,
  onSaved,
}: {
  clip: ClipT;
  sourceVideoPath?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const barRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(clip.startSec);

  const [startSec, setStartSec] = useState(clip.startSec);
  const [endSec, setEndSec] = useState(clip.endSec);
  const [aspectRatio, setAspectRatio] = useState(clip.aspectRatio);
  const [captionStyle, setCaptionStyle] = useState(clip.captionStyle);
  const [captionPosition, setCaptionPosition] = useState(clip.captionPosition as "top" | "bottom");
  const [captionFontSize, setCaptionFontSize] = useState(clip.captionFontSize);
  const [titleOverlay, setTitleOverlay] = useState(clip.titleOverlay);
  const [autoZoom, setAutoZoom] = useState(clip.autoZoom);
  const [watermark, setWatermark] = useState(clip.watermarkText || "");
  const [title, setTitle] = useState(clip.title);
  const [captions, setCaptions] = useState(clip.segments || []);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const [srcDur, setSrcDur] = useState(clip.endSec + 5);

  const previewUrl = sourceVideoPath ? `/api/media/${sourceVideoPath}` : "";
  const duration = Math.max(1, endSec - startSec);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => { if (v.duration && isFinite(v.duration)) setSrcDur(v.duration); };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, [previewUrl]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const bar = barRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const t = ratio * srcDur;
      if (dragging === "start") {
        if (t < endSec - 2) setStartSec(Math.round(t * 10) / 10);
      } else {
        if (t > startSec + 2) setEndSec(Math.round(t * 10) / 10);
      }
    };
    const onUp = () => setDragging(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, startSec, endSec, srcDur]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = startSec;
    const onTime = () => setCurrent(v.currentTime);
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [startSec]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (current < startSec) v.currentTime = startSec;
    if (current > endSec) v.currentTime = endSec;
  }, [current, startSec, endSec]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  }

  function updateCaption(index: number, text: string) {
    setCaptions((c) => c.map((s) => (s.index === index ? { ...s, text } : s)));
  }

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/clips/${clip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        startSec,
        endSec,
        aspectRatio,
        captionStyle,
        captionPosition,
        captionFontSize,
        titleOverlay,
        autoZoom,
        watermarkText: watermark.trim() || null,
        captionTexts: captions.map((c) => ({ index: c.index, text: c.text })),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast(data.error || "Could not save changes", "error"); return; }
    toast("Clip updated & re-rendered");
    onSaved();
  }

  const ratioClass =
    aspectRatio === "9:16" ? "aspect-[9/16]" : aspectRatio === "1:1" ? "aspect-square" : "aspect-video";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur sm:p-8">
      <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-surface-900 p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Edit clip</h2>
          <div className="flex gap-2">
            <a href={`/api/clips/${clip.id}/download`} className="btn btn-secondary">Download</a>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Preview + timeline */}
          <div>
            <div className={cn("relative mx-auto w-full max-w-[360px] overflow-hidden rounded-xl bg-black", ratioClass)}>
              <video ref={videoRef} src={previewUrl} muted preload="auto" playsInline className="h-full w-full object-contain" />
              {titleOverlay && title && (
                <div className="pointer-events-none absolute inset-x-0 top-[8%] flex justify-center">
                  <span className="max-w-[80%] rounded-lg bg-black/55 px-3 py-1 text-center text-sm font-semibold text-white backdrop-blur">{title}</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2">
                <button onClick={togglePlay} className="btn-primary !px-3 !py-1 text-xs">{playing ? "⏸" : "▶"}</button>
                <span className="text-xs text-white">{timeLabel(current)} / {timeLabel(endSec)}</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Start {timeLabel(startSec)}</span>
                <span>End {timeLabel(endSec)}</span>
              </div>
              <div className="relative mt-2 h-8 rounded-lg bg-white/5" ref={barRef}>
                <div className="absolute inset-y-0 rounded-lg bg-brand-500/25" style={{ left: `${(startSec / srcDur) * 100}%`, width: `${(duration / srcDur) * 100}%` }} />
                <div className="absolute inset-y-0 w-px bg-white" style={{ left: `${(current / srcDur) * 100}%` }} />
                <Handle pos={(startSec / srcDur) * 100} side="start" onDown={() => setDragging("start")} />
                <Handle pos={(endSec / srcDur) * 100} side="end" onDown={() => setDragging("end")} />
              </div>
              <ScrubBar duration={srcDur} value={current} onChange={(t) => { setCurrent(t); if (videoRef.current) videoRef.current.currentTime = t; }} />
              <div className="mt-3 flex items-center gap-2 text-xs">
                <Button size="sm" variant="secondary" onClick={() => setStartSec(current)}>Set start = playhead</Button>
                <Button size="sm" variant="secondary" onClick={() => setEndSec(current)}>Set end = playhead</Button>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            <Field label="Clip title">
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Aspect ratio">
                <Select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                  <option value="9:16">9:16</option>
                  <option value="16:9">16:9</option>
                  <option value="1:1">1:1</option>
                </Select>
              </Field>
              <Field label="Caption style">
                <Select value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)}>
                  {STYLE_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Caption position">
                <Select value={captionPosition} onChange={(e) => setCaptionPosition(e.target.value as any)}>
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                </Select>
              </Field>
              <Field label={`Font size (${captionFontSize})`}>
                <input type="range" min={14} max={48} value={captionFontSize} onChange={(e) => setCaptionFontSize(Number(e.target.value))} className="mt-4" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Toggle label="Title overlay" checked={titleOverlay} onChange={setTitleOverlay} />
              <Toggle label="Auto zoom (punch-in)" checked={autoZoom} onChange={setAutoZoom} />
            </div>

            <Field label="Watermark (leave empty for none)">
              <input className="input" value={watermark} onChange={(e) => setWatermark(e.target.value)} placeholder="e.g. @yourhandle" />
            </Field>

            {/* Captions */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Captions (edit text)</label>
                <Badge tone="brand">{captions.length}</Badge>
              </div>
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {captions.map((c) => (
                  <div key={c.index} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-xs text-slate-500">{timeLabel(c.startSec)}</span>
                    <input
                      className="input !py-1.5 text-sm"
                      value={c.text}
                      onChange={(e) => updateCaption(c.index, e.target.value)}
                    />
                  </div>
                ))}
                {captions.length === 0 && <p className="text-sm text-slate-500">No caption segments.</p>}
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/10 pt-4">
              <Button onClick={save} loading={saving} className="flex-1">💾 Save & re-render</Button>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="card flex items-center justify-between p-3 !rounded-xl">
      <span className="text-sm">{label}</span>
      <span className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-brand-500" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function Handle({ pos, side, onDown }: { pos: number; side: "start" | "end"; onDown: () => void }) {
  return (
    <div
      onMouseDown={onDown}
      className={cn("absolute top-0 h-full w-3 cursor-ew-resize bg-brand-400", side === "start" ? "left-0" : "right-0")}
      style={{ left: side === "start" ? `${pos}%` : undefined, right: side === "end" ? `${100 - pos}%` : undefined }}
    />
  );
}

function ScrubBar({ duration, value, onChange }: { duration: number; value: number; onChange: (t: number) => void }) {
  return (
    <input
      type="range"
      min={0}
      max={duration}
      step={0.1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="mt-2"
    />
  );
}