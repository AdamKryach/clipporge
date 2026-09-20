"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { Button, Input, Field, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { Logo } from "@/components/logo";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const callback = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    toast("Welcome back!");
    router.push(callback);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-900 p-8 shadow-card">
        <h1 className="text-2xl font-bold">Log in</h1>
        <p className="mt-1 text-sm text-slate-400">Welcome back to ClipForge.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Field label="Password">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </Field>
          <div className="flex justify-end">
            <Link href="/forgot" className="text-sm text-brand-400 hover:text-brand-300">Forgot password?</Link>
          </div>
          <Button type="submit" className="w-full" loading={loading} disabled={loading || !email || !password}>
            {loading ? <Spinner /> : "Log in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{" "}
          <Link href="/signup" className="text-brand-400 hover:text-brand-300">Sign up</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Spinner /></div>}>
      <LoginInner />
    </Suspense>
  );
}