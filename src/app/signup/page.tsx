"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button, Input, Field, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error || "Could not create account.");
      await signIn("credentials", { email, password, redirect: false });
      toast("Account created — signing you in");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8"><Logo /></Link>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface-900 p-8 shadow-card">
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-400">Start clipping your best content for free.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</div>}
          <Field label="Name">
            <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Creator" autoComplete="name" />
          </Field>
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Field label="Password" hint="At least 8 characters.">
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="Confirm password">
            <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Button type="submit" className="w-full" loading={loading}>{loading ? <Spinner /> : "Create account"}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-brand-400 hover:text-brand-300">Log in</Link>
        </p>
      </div>
    </div>
  );
}