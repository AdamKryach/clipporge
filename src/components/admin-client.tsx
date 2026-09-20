"use client";

import { useState } from "react";
import { Button, Field, Badge } from "@/components/ui";
import { useToast } from "@/components/toast";

interface FieldSpec { key: string; secret?: boolean; value?: string }
interface Integration {
  id: string; name: string; purpose: string; docs: string;
  status: (env: EnvSnap) => string; tone: (env: EnvSnap) => string; fields: FieldSpec[];
}
type EnvSnap = { openai: boolean; stripe: boolean; billing: string };

const INTEGRATIONS: Integration[] = [
  {
    id: "openai",
    name: "OpenAI Whisper",
    purpose: "Accurate AI transcription (also powers highlight quality).",
    docs: "Put a key in your .env.local as OPENAI_API_KEY. Without it, ClipForge uses its built-in offline engine.",
    status: (env: any) => (env.openai ? "Connected" : "Not set"),
    tone: (env: any) => (env.openai ? "green" : "amber"),
    fields: [{ key: "OPENAI_API_KEY", secret: true }, { key: "OPENAI_WHISPER_MODEL", value: "whisper-1" }],
  },
  {
    id: "stripe",
    name: "Stripe",
    purpose: "Production billing for Pro / Business plans.",
    docs: "Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in .env.local and BILLING_PROVIDER=stripe. Until then billing runs in mock mode.",
    status: (env: any) => (env.stripe ? "Connected" : "Not set (mock mode)"),
    tone: (env: any) => (env.stripe ? "green" : "amber"),
    fields: [{ key: "STRIPE_SECRET_KEY", secret: true }, { key: "STRIPE_WEBHOOK_SECRET", secret: true }, { key: "BILLING_PROVIDER", value: "stripe" }],
  },
  {
    id: "storage",
    name: "Media storage",
    purpose: "Where uploaded videos and rendered clips are stored.",
    docs: "MEDIA_STORAGE_DIR (default ./media). For production point this at S3/object storage and back up the database.",
    status: () => "Local (./media)",
    tone: () => "brand",
    fields: [{ key: "MEDIA_STORAGE_DIR", value: "./media" }],
  },
];

export function AdminClient({ user, envSnapshot }: { user: { name?: string | null; email?: string | null; role?: string }; envSnapshot: { openai: boolean; stripe: boolean; billing: string } }) {
  const toast = useToast();
  const [which, setWhich] = useState("openai");
  const [busy, setBusy] = useState(false);

  async function testKey(keyName: string) {
    setBusy(true);
    const res = await fetch("/api/admin/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ which: keyName }) });
    const data = await res.json();
    setBusy(false);
    if (res.ok) toast(data.message || "Connected");
    else toast(data.error || "Not connected", "error");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API keys & integrations</h1>
        <p className="mt-1 text-sm text-slate-400">
          Configure the services ClipForge uses. Keys are read from your server's environment (<code className="rounded bg-white/10 px-1">.env.local</code>) and are never exposed to the browser.
        </p>
      </div>

      <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-4 text-sm">
        <Badge tone="brand">Security note</Badge>
        <p className="mt-2 text-slate-300">
          No API keys are stored in the database or shipped to the frontend. This page simply verifies which services are configured on the server.
        </p>
      </div>

      {INTEGRATIONS.map((intg) => (
        <div key={intg.id} className="card space-y-4 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold">{intg.name}</h2>
              <p className="mt-1 text-sm text-slate-400">{intg.purpose}</p>
            </div>
            <Badge tone={(intg.tone as any)(envSnapshot) as any}>{intg.status(envSnapshot)}</Badge>
          </div>
          <p className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">{intg.docs}</p>
          <div className="flex flex-wrap gap-2">
            {intg.fields.map((f) => (
              <code key={f.key} className="rounded-lg bg-black/40 px-2 py-1 text-xs text-brand-200">{f.key}={f.secret ? "…secret…" : (f.value ?? "…")}</code>
            ))}
          </div>
        </div>
      ))}

      <div className="card space-y-4 p-6">
        <h2 className="font-semibold">Test a connection</h2>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Integration">
            <select className="input max-w-[220px]" value={which} onChange={(e) => setWhich(e.target.value)}>
              <option value="openai">openai</option>
              <option value="stripe">stripe</option>
            </select>
          </Field>
          <Button onClick={() => testKey(which)} loading={busy}>Run test</Button>
        </div>
        <p className="text-xs text-slate-500">If a key is present, ClipForge will report the real connection status.</p>
      </div>

      {user.role === "admin" && (
        <div className="card p-6">
          <h2 className="font-semibold">Administrator</h2>
          <p className="mt-1 text-sm text-slate-400">Signed in as administrator ({user.email}).</p>
        </div>
      )}
    </div>
  );
}