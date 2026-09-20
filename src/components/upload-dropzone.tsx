"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useToast } from "@/components/toast";
import { formatBytes } from "@/lib/utils";

const ACCEPT = ["mp4", "mov", "webm", "m4v", "mkv"];
const MAX_SIZE = 4 * 1024 * 1024 * 1024;

export function UploadDropzone({ onStarted }: { onStarted?: (projectId: string) => void }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  function validate(f: File): string | null {
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!ACCEPT.includes(ext)) return `Unsupported format ".${ext}". Use MP4, MOV or WebM.`;
    if (f.size > MAX_SIZE) return "File is larger than 4GB.";
    if (f.size <= 0) return "File is empty.";
    return null;
  }

  function startUpload(f: File) {
    const err = validate(f);
    if (err) {
      setError(err);
      setPhase("error");
      return;
    }
    setFile(f);
    setPhase("uploading");
    setProgress(0);
    setError("");

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("Content-Type", f.type || "video/mp4");
    xhr.setRequestHeader("x-file-name", encodeURIComponent(f.name));
    xhr.setRequestHeader("x-file-size", String(f.size));
    xhr.setRequestHeader("x-project-name", encodeURIComponent(f.name.replace(/\.[^.]+$/, "")));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        const data = JSON.parse(xhr.responseText || "{}");
        setPhase("idle");
        toast("Video uploaded — preparing your clips");
        if (data.projectId) {
          onStarted?.(data.projectId);
          router.push(`/project/${data.projectId}`);
        } else router.push("/dashboard");
      } else {
        setPhase("error");
        try {
          setError(JSON.parse(xhr.responseText).error || "Upload failed");
        } catch {
          setError("Upload failed. Please retry.");
        }
      }
    };
    xhr.onerror = () => {
      setPhase("error");
      setError("Network error during upload. Please retry.");
    };
    xhr.send(f);
  }

  function cancel() {
    xhrRef.current?.abort();
    setPhase("idle");
    setFile(null);
    setProgress(0);
    setError("");
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) startUpload(f); }}
        onClick={() => !file && phase !== "uploading" && inputRef.current?.click()}
        className={`relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
          drag ? "border-brand-400 bg-brand-500/10" : "border-white/15 bg-white/[0.02] hover:border-brand-500/40"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={[...ACCEPT.map((a) => "." + a), "video/*"].join(",")}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && startUpload(e.target.files[0])}
        />

        {phase === "uploading" && file ? (
          <div className="w-full max-w-md space-y-4">
            <div className="mx-auto text-4xl">⏳</div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-slate-400">{formatBytes(file.size)}</p>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-sm text-brand-300">{progress}% — uploading</p>
            <Button type="button" variant="secondary" onClick={cancel}>Cancel upload</Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 text-3xl">⬆️</div>
            <h3 className="text-lg font-semibold">Drag & drop your video</h3>
            <p className="mt-1 text-sm text-slate-400">or click to browse · MP4, MOV, WebM up to 4GB</p>
            <Button type="button" variant="secondary" className="mt-5">Choose video</Button>
          </>
        )}
      </div>

      {phase === "error" && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
          <button onClick={() => { setPhase("idle"); setError(""); }} className="ml-3 text-brand-300 underline">Retry</button>
        </div>
      )}
    </div>
  );
}