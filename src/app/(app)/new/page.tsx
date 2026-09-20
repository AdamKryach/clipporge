"use client";

import Link from "next/link";
import { UploadDropzone } from "@/components/upload-dropzone";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">New project</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload a long-form video and ClipForge will find the most engaging moments.
        </p>
      </div>
      <UploadDropzone />
      <div className="mt-6 rounded-2xl border border-white/10 bg-surface-900/60 p-5 text-sm text-slate-300">
        <p className="font-semibold text-slate-100">No video handy?</p>
        <p className="mt-1 text-slate-400">
          Run the <Link href="/dashboard" className="text-brand-400">demo</Link> to try the entire clipping workflow with a bundled sample clip — no upload needed.
        </p>
      </div>
    </div>
  );
}