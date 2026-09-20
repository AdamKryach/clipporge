# ClipForge 🎬

**AI video clipping** — upload a long-form video and ClipForge finds the most engaging
moments and turns them into ready-to-post Shorts, Reels and TikToks.

A real, functional full-stack application (not a mockup): authentication, uploads,
an actual ffmpeg processing pipeline, highlight detection, a working video editor,
captions, export, billing architecture and more.

## Tech stack

- **Next.js 14 (App Router)** + **TypeScript** + **Tailwind CSS**
- **Prisma + SQLite** database (swap to Postgres in `prisma/schema.prisma`)
- **NextAuth (Auth.js)** credentials auth with bcrypt
- **ffmpeg / ffprobe** for real video processing, rendering, caption burn-in & zoom
- **Pluggable transcription** — OpenAI Whisper when a key is present, otherwise a
  built-in offline engine so the whole pipeline works with **no external keys**.

## Requirements

- Node.js 18+
- `ffmpeg` and `ffprobe` on PATH (`apt install ffmpeg` / `brew install ffmpeg`)

## Run it

```bash
npm install
cp .env.example .env.local          # then edit your values
npx prisma db push                 # create the SQLite database
npm run db:seed                    # optional demo user: demo@clipporge.app / demo1234
npm run dev                        # http://localhost:3000
```

Optional API keys (add to `.env.local`):

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | More accurate Whisper transcription |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BILLING_PROVIDER=stripe` | Live billing (mock by default) |
| `NEXTAUTH_SECRET` | Auth secret (generate with `openssl rand -base64 32`) |

Without any keys everything still works: transcription and highlight detection run
on the built-in engine, and billing runs in a mock mode you can test end-to-end.

## Architecture

```
Upload → store → extract/analyze audio → transcribe → analyze transcript →
score candidate moments → clip timestamps → render clips → captions → results
```

- `src/lib/pipeline.ts` — async processing pipeline with real per-stage progress
- `src/lib/engine.ts` — highlight/engagement scoring & moment detection
- `src/lib/ffmpeg.ts` — probe, envelope, silence detection, caption burn-in, render
- `src/lib/transcription.ts` — Whisper (optional) or offline fallback
- `src/lib/billing.ts` — plan limits + usage + Stripe integration points
- `src/app/api/**` — authenticated, validated REST endpoints

## Features

Landing page · Auth (signup/login/logout/reset/profile) · Dashboard with stats ·
Search & filter · Drag-and-drop upload with progress · AI clipping options ·
real processing states · clips grid with scores · full clip editor (trim, ratio,
captions, titles, watermark, zoom) · caption styles (Clean/Bold/Karaoke/Highlight/
Minimal) · MP4 download + "Download all" zip · project rename/duplicate/delete ·
settings · billing/credits · **Demo mode** (bundled sample video).

## Security

Auth + authorization on every route, per-user data isolation, server-side input
validation (zod), secure media serving, upload validation, API-key protection and
rate limiting. Keys live only in server env vars — never in the browser.

## Scripts

```bash
npm run dev        # develop
npm run build      # production build
npm run db:push    # sync schema
```