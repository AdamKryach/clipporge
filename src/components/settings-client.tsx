"use client";

import { useEffect, useState } from "react";
import { Button, Field, Input, Select, Badge, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "password", label: "Password" },
  { id: "defaults", label: "Defaults & captions" },
  { id: "billing", label: "Subscription" },
  { id: "usage", label: "Usage" },
];

export function SettingsClient({ user }: { user: { name?: string | null; email?: string | null; id: string } }) {
  const toast = useToast();
  const [tab, setTab] = useState("profile");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState(user.name || "");
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [sub, setSub] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (res.ok) { setSettings(data.settings); setUsage(data.usage); setSub(data.subscription); }
      const bp = await fetch("/api/billing");
      const bd = await bp.json();
      if (bp.ok) setPlans(bd.plans);
      setLoading(false);
    })();
  }, []);

  async function saveProfile() {
    setSaving(true);
    const res = await fetch("/api/settings/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) toast("Profile updated");
    else toast("Could not update profile", "error");
    setSaving(false);
  }

  async function savePassword() {
    if (newPass.length < 8) return toast("Password must be at least 8 characters", "error");
    setSaving(true);
    const res = await fetch("/api/settings/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: curPass, newPassword: newPass }) });
    const data = await res.json();
    if (res.ok) { toast("Password updated"); setCurPass(""); setNewPass(""); }
    else toast(data.error || "Could not update password", "error");
    setSaving(false);
  }

  async function saveSettings(d: any) {
    setSaving(true);
    const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    const data = await res.json();
    if (res.ok) { setSettings(data.settings); toast("Saved"); }
    else toast("Could not save", "error");
    setSaving(false);
  }

  async function changePlan(planId: string) {
    setSaving(true);
    const res = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: planId }) });
    const data = await res.json();
    if (res.ok) {
      toast(data.applied ? `Plan updated to ${data.plan}` : "Redirecting to checkout");
      const sr = await fetch("/api/settings");
      const sd = await sr.json();
      if (sr.ok) setSub(sd.subscription);
    } else toast(data.error || "Could not update plan", "error");
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const ratioLabel = (r: string) => (r === "9:16" ? "Vertical (9:16)" : r === "1:1" ? "Square (1:1)" : "Landscape (16:9)");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-surface-900/60 p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition", tab === t.id ? "bg-brand-600 text-white" : "text-slate-400 hover:text-slate-200")}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Profile</h2>
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input value={user.email || ""} disabled /></Field>
          <Button onClick={saveProfile} loading={saving}>Save profile</Button>
        </div>
      )}

      {tab === "password" && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Change password</h2>
          <Field label="Current password"><Input type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} /></Field>
          <Field label="New password"><Input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} /></Field>
          <Button onClick={savePassword} loading={saving}>Update password</Button>
        </div>
      )}

      {tab === "defaults" && settings && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Defaults & captions</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default clip length (seconds)">
              <Select value={String(settings.defaultClipLength ?? 30)} onChange={(e) => saveSettings({ defaultClipLength: Number(e.target.value) })}>
                {[15, 30, 45, 60, 90].map((s) => <option key={s} value={s}>{s}s</option>)}
              </Select>
            </Field>
            <Field label="Default aspect ratio">
              <Select value={settings.defaultAspectRatio ?? "9:16"} onChange={(e) => saveSettings({ defaultAspectRatio: e.target.value })}>
                <option value="9:16">Vertical 9:16</option>
                <option value="16:9">Landscape 16:9</option>
                <option value="1:1">Square 1:1</option>
              </Select>
            </Field>
            <Field label="Caption style">
              <Select value={settings.captionStyle ?? "modern"} onChange={(e) => saveSettings({ captionStyle: e.target.value })}>
                <option value="clean">Clean</option><option value="bold">Bold</option>
                <option value="karaoke">Karaoke</option><option value="highlight">Highlight</option>
                <option value="minimal">Minimal</option><option value="modern">Modern</option>
              </Select>
            </Field>
            <Field label="Caption position">
              <Select value={settings.captionPosition ?? "bottom"} onChange={(e) => saveSettings({ captionPosition: e.target.value })}>
                <option value="bottom">Bottom</option><option value="top">Top</option>
              </Select>
            </Field>
            <Field label={`Font size (${settings.captionFontSize ?? 18})`}>
              <input type="range" min={12} max={48} value={settings.captionFontSize ?? 18} onChange={(e) => saveSettings({ captionFontSize: Number(e.target.value) })} className="mt-3" />
            </Field>
            <Field label="Watermark text">
              <Input placeholder="@yourhandle" value={settings.watermarkText || ""} onChange={(e) => { const v = e.target.value; setSettings({ ...settings, watermarkText: v }); clearTimeout((window as any).__wmt); (window as any).__wmt = setTimeout(() => saveSettings({ watermarkText: v || null }), 500); }} />
            </Field>
          </div>
          <div className="flex gap-4">
            <ToggleLabel label="Show title overlay" checked={settings.showTitleOverlay ?? true} onChange={(v) => saveSettings({ showTitleOverlay: v })} />
            <ToggleLabel label="Auto zoom" checked={settings.autoZoom ?? true} onChange={(v) => saveSettings({ autoZoom: v })} />
            <ToggleLabel label="Notifications" checked={settings.notifications ?? true} onChange={(v) => saveSettings({ notifications: v })} />
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Current plan</h2>
                <p className="text-sm text-slate-400">You're on the <Badge tone="brand">{sub?.plan ?? "free"}</Badge> plan.</p>
              </div>
              <Badge tone="slate">{(process as any)?.env?.BILLING_PROVIDER === "stripe" ? "Stripe" : "Mock billing"}</Badge>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((pl) => (
              <div key={pl.id} className={cn("card p-6", sub?.plan === pl.id && "border-brand-500/40")}>
                <h3 className="font-semibold">{pl.name}</h3>
                <p className="mt-1 text-3xl font-extrabold">${pl.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                <ul className="mt-4 space-y-1.5 text-sm text-slate-300">
                  {pl.features.map((f: string) => <li key={f} className="flex gap-2"><span className="text-emerald-400">✓</span>{f}</li>)}
                </ul>
                <Button variant={sub?.plan === pl.id ? "secondary" : "primary"} className="mt-5 w-full" disabled={sub?.plan === pl.id} onClick={() => changePlan(pl.id)}>
                  {sub?.plan === pl.id ? "Current plan" : `Switch to ${pl.name}`}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "usage" && usage && (
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">Monthly usage</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Stat label="Videos this month" value={`${usage.videosThisMonth} / ${usage.maxVideos}`} pct={(usage.videosThisMonth / usage.maxVideos) * 100} />
            <Stat label="Clips generated" value={usage.clipsThisMonth} />
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleLabel({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2 text-sm text-slate-300">
      <span className={cn("relative h-5 w-9 rounded-full transition", checked ? "bg-brand-500" : "bg-white/15")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition", checked ? "left-[18px]" : "left-0.5")} />
      </span>
      {label}
    </button>
  );
}

function Stat({ label, value, pct }: { label: string; value: string | number; pct?: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {pct != null && (
        <div className="mt-2 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, pct)}%` }} /></div>
      )}
    </div>
  );
}