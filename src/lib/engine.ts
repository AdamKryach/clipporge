import { clamp } from "./ffmpeg";
import type { Transcript, TranscriptSegment } from "./transcription";

export type ContentStyle =
  | "funny"
  | "educational"
  | "motivational"
  | "podcast"
  | "gaming"
  | "storytelling"
  | "auto";

export interface ClipOptions {
  numClips: number;
  clipLength: number; // seconds
  style: ContentStyle;
  aspectRatio: string;
  durationSec: number;
}

export interface GeneratedClip {
  startSec: number;
  endSec: number;
  title: string;
  description: string;
  hashtags: string[];
  engagementScore: number;
  tags: string[];
  segments: TranscriptSegment[];
}

interface Window {
  start: number;
  end: number;
  score: number;
  segs: TranscriptSegment[];
}

const ENGAGEMENT_WORDS = [
  "wow", "amazing", "incredible", "insane", "secret", "worst", "never",
  "always", "secret", "shocking", "surprise", "important", "critical",
  "guaranteed", "instantly", "obviously", "watch this", "hold on", "tip",
  "hack", "free", "money", "easy", "unbelievable", "legendary", "iconic",
];
const QUESTION_WORDS = /what|why|how|when|where|\?/;
const STORY_WORDS = ["first", "then", "finally", "because", "suddenly", "after", "started", "until"];
const EMOTIONAL_WORDS = ["love", "hate", "afraid", "excited", "scared", "proud", "sad", "happy", "great", "cry", "laugh"];
const FUNNY_WORDS = ["haha", "funny", "joke", "seriously", "no way", "ridiculous"];
const INFO_WORDS = ["step", "tips", "tutorial", "guide", "explain", "method", "technique", "strategy", "process", "how to"];
const MOTIVATION_WORDS = ["believe", "never give up", "start", "achieve", "goal", "discipline", "push", "grow", "success"];
const GAMING_WORDS = ["win", "kill", "player", "match", "clutch", "score", "round", "gg"];

export async function generateHighlights(
  transcript: Transcript,
  envelope: number[],
  opts: ClipOptions
): Promise<GeneratedClip[]> {
  const { numClips, clipLength, durationSec } = opts;
  const segs =
    transcript.segments.length > 0
      ? transcript.segments
      : [{ start: 0, end: Math.max(clipLength, durationSec), text: transcript.text || "Featured moment" }];

  // Windows over the timeline, each ~clipLength.
  const windows = buildWindows(segs, envelope, opts);

  // Snap to sentence boundaries.
  const snapped = windows.map((w) => snapToSegments(w, segs, clipLength, durationSec));

  // Rank and pick non-overlapping top clips.
  snapped.sort((a, b) => b.score - a.score);
  const picked: Window[] = [];
  for (const w of snapped) {
    if (picked.some((p) => overlap(p.start, p.end, w.start, w.end))) continue;
    picked.push(w);
    if (picked.length >= numClips) break;
  }

  // Fallback: evenly spaced clips if scoring produced too few.
  for (let i = 0; picked.length < numClips && i < 50; i++) {
    const idealStart = (i * Math.max(1, durationSec - clipLength)) / numClips;
    const w: Window = {
      start: idealStart,
      end: Math.min(idealStart + clipLength, durationSec),
      score: 40,
      segs: segs.filter((s) => s.end > idealStart && s.start < idealStart + clipLength),
    };
    const s = snapToSegments(w, segs, clipLength, durationSec);
    if (picked.some((p) => overlap(p.start, p.end, s.start, s.end))) continue;
    picked.push(s);
  }

  return picked.slice(0, numClips).map((w) => toClip(w, opts));
}

function buildWindows(
  segs: TranscriptSegment[],
  envelope: number[],
  opts: ClipOptions
): Window[] {
  const { clipLength, durationSec } = opts;
  const windows: Window[] = [];
  const step = clipLength / 2;
  const lastStart = Math.max(0, durationSec - clipLength);
  for (let s = 0; s <= lastStart + 0.001; s += step) {
    const e = Math.min(s + clipLength, durationSec);
    const inSegs = segs.filter((sg) => sg.end > s && sg.start < e);
    const textScore = inSegs.length
      ? avg(inSegs.map((sg) => scoreSegment(sg, opts)))
      : 25;
    const audioScore = inSegs.length
      ? avg(inSegs.map((sg) => energyAt(sg.start, envelope)))
      : 0.3;
    const score = clamp(Math.round(textScore * 0.7 + audioScore * 30), 0, 100);
    windows.push({ start: s, end: e, score, segs: inSegs });
  }
  return windows;
}

function snapToSegments(
  w: Window,
  segs: TranscriptSegment[],
  clipLength: number,
  durationSec: number
): Window {
  const startSeg = segs.find((s) => s.end >= w.start && s.start <= w.end);
  const endSeg = segs.find((s) => s.start <= w.end && s.end >= w.end);
  const start = startSeg ? startSeg.start : w.start;
  const end = endSeg ? endSeg.end : w.end;
  const capped = {
    ...w,
    start: clamp(start, 0, Math.max(0, durationSec - clipLength)),
    end: clamp(end, clipLength, durationSec),
  };
  if (capped.end - capped.start > clipLength * 1.5) {
    capped.end = Math.min(capped.end, capped.start + clipLength);
  }
  return capped;
}

function scoreSegment(seg: TranscriptSegment, opts: ClipOptions): number {
  const text = seg.text.toLowerCase();
  let score = 40;
  ENGAGEMENT_WORDS.forEach((w) => {
    if (text.includes(w)) score += 7;
  });
  if (QUESTION_WORDS.test(text)) score += 5;
  if (text.includes("!")) score += 5;

  const style = opts.style;
  if (style === "funny" || style === "auto")
    score += FUNNY_WORDS.filter((w) => text.includes(w)).length * 12;
  if (style === "educational" || style === "auto")
    score += INFO_WORDS.filter((w) => text.includes(w)).length * 12;
  if (style === "motivational" || style === "auto")
    score += MOTIVATION_WORDS.filter((w) => text.includes(w)).length * 12;
  if (style === "storytelling" || style === "auto")
    score += STORY_WORDS.filter((w) => text.includes(w)).length * 8;
  if (style === "gaming")
    score += GAMING_WORDS.filter((w) => text.includes(w)).length * 12;
  if (style === "podcast") score += 6;
  if (EMOTIONAL_WORDS.some((w) => text.includes(w))) score += 7;
  return clamp(score, 0, 100);
}

function energyAt(t: number, envelope: number[]): number {
  if (!envelope.length) return 0.5;
  const idx = clamp(Math.floor(t / 0.5), 0, envelope.length - 1);
  return envelope[idx] ?? 0.5;
}

function avg(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}

function overlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2;
}

function toClip(w: Window, opts: ClipOptions): GeneratedClip {
  const text = w.segs.map((s) => s.text).join(" ").trim();
  const tags = classify(text);
  return {
    startSec: w.start,
    endSec: w.end,
    title: makeTitle(text),
    description: makeDescription(text),
    hashtags: makeHashtags(text),
    engagementScore: w.score,
    tags,
    segments: w.segs,
  };
}

function classify(text: string): string[] {
  const t = text.toLowerCase();
  const tags: string[] = [];
  if (QUESTION_WORDS.test(t) || ENGAGEMENT_WORDS.some((w) => t.includes(w))) tags.push("hook");
  if (EMOTIONAL_WORDS.some((w) => t.includes(w))) tags.push("emotional");
  if (FUNNY_WORDS.some((w) => t.includes(w))) tags.push("joke");
  if (INFO_WORDS.some((w) => t.includes(w))) tags.push("info");
  if (STORY_WORDS.some((w) => t.includes(w))) tags.push("story");
  if (!tags.length) tags.push("hook");
  return tags;
}

function makeTitle(text: string): string {
  if (!text) return "Your next highlight";
  const short = text.split(/\s+/).slice(0, 8).join(" ");
  const cap = short.charAt(0).toUpperCase() + short.slice(1);
  return cap.length > 60 ? cap.slice(0, 57) + "..." : cap;
}

function makeDescription(text: string): string {
  if (!text) return "An AI-selected highlight from your video.";
  return text.slice(0, 220) + (text.length > 220 ? "…" : "");
}

const HASHTAGS = ["shorts", "viral", "reels", "fyp", "trending", "clip", "highlight", "content"];

function makeHashtags(text: string): string[] {
  const out = new Set<string>();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  for (const w of words.slice(0, 4)) out.add(w);
  for (const h of HASHTAGS.slice(0, 4)) out.add(h);
  return Array.from(out);
}