import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number | bigint | null | undefined): string {
  if (bytes == null) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDuration(sec: number | null | undefined): string {
  if (sec == null || !isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function timeLabel(sec: number): string {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export function initialOf(name?: string | null): string {
  return (name || "U").trim().charAt(0).toUpperCase();
}

export function engagementColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-lime-400";
  if (score >= 40) return "text-amber-400";
  return "text-rose-400";
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    uploading: "Uploading",
    queued: "Queued",
    processing: "Processing",
    complete: "Complete",
    failed: "Failed",
    canceled: "Canceled",
  };
  return map[status] ?? status;
}