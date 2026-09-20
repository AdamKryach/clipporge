"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Input, Field } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { message: string; resetUrl?: string }>(null);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setLoading(false);
      setResult({ message: data.message || "Check your inbox.", resetUrl: data.resetUrl });
    } catch {
      setLoading(false);
      setError("Network error.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-900 p-8 shadow-card">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="mt-1 text-sm text-slate-400">We'll email you a secure reset link.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}
          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {result.message}
              {result.resetUrl && (
                <div className="mt-2">
                  <p className="text-xs text-emerald-300/70">Demo link (local):</p>
                  <a href={result.resetUrl} className="text-xs text-brand-300 underline break-all">{result.resetUrl}</a>
                </div>
              )}
            </div>
          )}
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </Field>
          <Button type="submit" className="w-full" loading={loading}>Send reset link</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Remembered it? <Link href="/login" className="text-brand-400 hover:text-brand-300">Log in</Link>
        </p>
      </div>
    </div>
  );
}