"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Button, Input, Field } from "@/components/ui";
import { useToast } from "@/components/toast";
import { Logo } from "@/components/logo";

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error || "Could not reset password.");
    setDone(true);
    toast("Password updated");
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-900 p-8 text-center shadow-card">
          <div className="mb-4 text-4xl">✅</div>
          <h1 className="text-2xl font-bold">Password updated</h1>
          <p className="mt-2 text-sm text-slate-400">You can now log in with your new password.</p>
          <Link href="/login" className="btn-primary mt-6 w-full">Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-900 p-8 shadow-card">
        <h1 className="text-2xl font-bold">Choose a new password</h1>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}
          <Field label="New password">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          <Field label="Confirm new password">
            <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
          </Field>
          <Button type="submit" className="w-full" loading={loading}>Update password</Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ResetInner />
    </Suspense>
  );
}