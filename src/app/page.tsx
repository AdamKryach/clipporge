import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);

  const features = [
    { icon: "🧠", title: "AI Highlight Detection", desc: "Transcribes your video and scores every moment for hooks, emotion, surprises, jokes and useful info." },
    { icon: "✂️", title: "Auto Clips", desc: "Turn one long video into ready-to-post Shorts, Reels and TikToks with perfect sentence-safe cuts." },
    { icon: "💬", title: "Auto Captions", desc: "Synchronized, styled captions — Clean, Bold, Karaoke, Highlight and Minimal." },
    { icon: "🎨", title: "Built-in Editor", desc: "Trim, re-trim, change aspect ratio, add titles, watermarks and punch-in zoom." },
    { icon: "📤", title: "One-click Export", desc: "Download individual clips or your whole project as an HD-ready zip." },
    { icon: "⚡", title: "Demo Mode", desc: "No video? Try the entire workflow instantly with a bundled sample." },
  ];

  const steps = [
    { n: "01", title: "Upload", desc: "Drag in any long video — MP4, MOV, WebM. We validate and store it securely." },
    { n: "02", title: "AI Analyzes", desc: "We extract audio, transcribe, and score every moment for engagement potential." },
    { n: "03", title: "Pick your format", desc: "Choose clip count, length, style and aspect ratio for your platform." },
    { n: "04", title: "Review & Export", desc: "Edit captions and trims, then download your polished clips." },
  ];

  const plans = [
    { name: "Free", price: "$0", per: "/mo", cta: "Start free", featured: false, features: ["3 videos / month", "10 min per video", "Watermarked exports", "Standard captions"] },
    { name: "Pro", price: "$24", per: "/mo", cta: "Go Pro", featured: true, features: ["50 videos / month", "2 hrs per video", "No watermark", "HD exports", "All caption styles", "Karaoke"] },
    { name: "Business", price: "$79", per: "/mo", cta: "Contact sales", featured: false, features: ["500 videos / month", "6 hrs per video", "Priority processing", "Team seats", "API access"] },
  ];

  const faqs = [
    { q: "What video formats are supported?", a: "MP4, MOV, WebM, M4V and MKV." },
    { q: "How does the AI find highlights?", a: "ClipForge transcribes the audio and scores each moment for hooks, emotion, humor and useful information, then cuts on sentence boundaries so nothing is ever cut mid-word." },
    { q: "Do I need an API key to use it?", a: "No. ClipForge runs fully offline with a built-in engine. Optionally add an OpenAI key for even more accurate Whisper transcription." },
    { q: "Can I edit clips before exporting?", a: "Yes — trim start/end, change aspect ratio, edit captions and styles, add titles and watermarks, all before you export." },
  ];

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-surface-950/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#how" className="hover:text-white">How it works</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            {session ? (
              <Link href="/dashboard" className="btn btn-primary">Open dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">Log in</Link>
                <Link href="/signup" className="btn-primary">Sign up free</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="chip mb-6 !px-4 !py-1.5 text-brand-300">✨ AI-powered short-form clipping</span>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Upload a video and let AI find your{" "}
            <span className="bg-gradient-to-r from-brand-400 to-violet-400 bg-clip-text text-transparent">best moments</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
            Turn long-form video into scroll-stopping TikTok, Instagram Reels and YouTube Shorts in minutes — automatically.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary text-base !px-6 !py-3">Start clipping — free</Link>
            <Link href={session ? "/dashboard" : "/signup"} className="btn-secondary text-base !px-6 !py-3">▶ Watch how it works</Link>
          </div>
          <p className="mt-4 text-sm text-slate-500">No credit card required · No API key needed</p>
        </div>

        {/* Demo mockup */}
        <div className="mx-auto mt-14 max-w-4xl rounded-3xl border border-white/10 bg-surface-900/70 p-2 shadow-card">
          <div className="rounded-2xl border border-white/5 bg-surface-950 p-3 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
              <div className="relative overflow-hidden rounded-xl bg-black">
                <div className="aspect-video w-full shimmer" />
                <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-3">
                  {["First we find the moments", "Then we caption them", "And you export in a click"].map((t, i) => (
                    <span key={i} className="rounded-md bg-black/70 px-2 py-1 text-[10px] text-white backdrop-blur">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col justify-center gap-3 p-3">
                {[
                  { title: "“You won't believe this…”", score: 94, dur: "0:29" },
                  { title: "How the pros do it", score: 88, dur: "0:31" },
                  { title: "The step everyone skips", score: 81, dur: "0:27" },
                ].map((c) => (
                  <div key={c.title} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{c.title}</p>
                      <p className="text-xs text-slate-500">{c.dur} · 9:16 · captions</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-semibold text-emerald-300">{c.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Everything you need to clip</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-400">A complete short-form content workflow in one tool.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card p-6 transition hover:border-brand-500/30">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/15 text-2xl">{f.icon}</div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-white/10 bg-surface-900/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-white/10 bg-surface-900 p-6">
                <span className="text-sm font-bold text-brand-400">{s.n}</span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold">Simple pricing</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-400">Start free and upgrade when you need more.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={p.featured ? "card border-brand-500/40 p-6 shadow-glow" : "card p-6"}>
              {p.featured && <span className="mb-3 inline-block rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-300">Most popular</span>}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className="text-slate-500">{p.per}</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="text-emerald-400">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/signup" className={p.featured ? "btn-primary mt-6 w-full" : "btn-secondary mt-6 w-full"}>{p.cta}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/10 bg-surface-900/40 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold">Frequently asked</h2>
          <div className="mt-10 space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="card group p-5">
                <summary className="flex cursor-pointer items-center justify-between font-medium marker:content-none">
                  {f.q}
                  <span className="text-slate-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl border border-brand-500/30 bg-gradient-to-br from-brand-600/20 to-violet-600/10 p-10 text-center sm:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">Start clipping your best content</h2>
          <p className="mx-auto mt-3 max-w-md text-slate-300">Upload a video and see your highlights in minutes.</p>
          <Link href="/signup" className="btn-primary mt-8 text-base !px-8 !py-3">Get started free</Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} ClipForge. Built for creators.</p>
        </div>
      </footer>
    </div>
  );
}