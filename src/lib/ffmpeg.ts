import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs, existsSync } from "fs";
import path from "path";

const execFileAsync = promisify(execFile);

export interface MediaInfo {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
  fps: number;
}

interface ProbeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
}
interface ProbeResult {
  format?: { duration?: string };
  streams?: ProbeStream[];
}

/** Probe a media file with ffprobe. */
export async function probeMedia(input: string): Promise<MediaInfo> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    input,
  ]);
  const data = JSON.parse(stdout) as ProbeResult;
  const duration = data.format?.duration ? parseFloat(data.format.duration) : 0;
  const videoStream = data.streams?.find((s) => s.codec_type === "video");
  const audioStream = data.streams?.find((s) => s.codec_type === "audio");
  const fps = videoStream?.avg_frame_rate ? parseFps(videoStream.avg_frame_rate) : 30;
  return {
    durationSec: duration || 0,
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    hasAudio: !!audioStream,
    fps,
  };
}

function parseFps(rate: string): number {
  const [a, b] = rate.split("/").map(Number);
  if (!a || !b) return 30;
  return a / b;
}

/** Audio loudness envelope (0..1 per ~500ms window) used for engagement scoring. */
export async function audioEnvelope(input: string, durationSec: number): Promise<number[]> {
  const windowMs = 500;
  const n = Math.max(1, Math.ceil((durationSec * 1000) / windowMs));
  const env: number[] = [];
  for (let i = 0; i < n; i++) {
    const start = (i * windowMs) / 1000;
    try {
      const { stderr } = await execFileAsync(
        "ffmpeg",
        [
          "-v",
          "info",
          "-ss",
          String(start),
          "-t",
          String(windowMs / 1000),
          "-i",
          input,
          "-map",
          "a:0",
          "-vn",
          "-af",
          "volumedetect",
          "-f",
          "null",
          "-",
        ],
        { maxBuffer: 16 * 1024 * 1024 }
      );
      const meanMatch = stderr.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
      const maxMatch = stderr.match(/max_volume:\s*(-?[\d.]+)\s*dB/);
      const max = maxMatch ? parseFloat(maxMatch[1]) : -90;
      const mean = meanMatch ? parseFloat(meanMatch[1]) : -90;
      env.push(scoreWindow(mean, max));
    } catch {
      env.push(0.1);
    }
  }
  return env;
}

function scoreWindow(mean: number, max: number): number {
  const meanNorm = clamp((mean + 60) / 50, 0, 1); // -60..-10 -> 0..1
  const peak = clamp((max + 6) / 24, 0, 1); // -30..+6 -> 0..1
  return clamp(meanNorm * 0.6 + peak * 0.4, 0, 1);
}

/** Detect silence gaps (sentence-safe cut boundaries) via ffmpeg silencedetect. */
export async function detectSilence(
  input: string,
  durationSec: number,
  threshold = -35,
  minSilenceMs = 350
): Promise<Array<{ start: number; end: number }>> {
  const silence: Array<{ start: number; end: number }> = [];
  try {
    const { stderr } = await execFileAsync(
      "ffmpeg",
      ["-i", input, "-af", `silencedetect=noise=${threshold}dB:d=${minSilenceMs / 1000}`, "-f", "null", "-"],
      { maxBuffer: 32 * 1024 * 1024 }
    );
    let current: { start: number; end: number } | null = null;
    for (const line of stderr.split("\n")) {
      const startMatch = line.match(/silence_start:\s*([\d.]+)/);
      const endMatch = line.match(/silence_end:\s*([\d.]+)/);
      if (startMatch && endMatch) {
        silence.push({ start: parseFloat(startMatch[1]), end: parseFloat(endMatch[1]) });
      } else if (startMatch) {
        current = { start: parseFloat(startMatch[1]), end: durationSec };
      } else if (endMatch && current) {
        current.end = parseFloat(endMatch[1]);
        silence.push(current);
        current = null;
      }
    }
  } catch {
    // ignore: video-only files produce no silence data
  }
  return silence;
}

// ---------------------------------------------------------------------------
// Caption style presets (used for both ASS burn-in and editor styling)
// ---------------------------------------------------------------------------
export interface CaptionStyleSpec {
  color: string; // ASS colour &HAABBGGRR
  bold: number;
  outline: number;
  boxed: boolean;
  label: string;
}

export const CAPTION_STYLES: Record<string, CaptionStyleSpec> = {
  clean: { color: "&H00FFFFFF", bold: 0, outline: 3, boxed: false, label: "Clean" },
  bold: { color: "&H00FFFFFF", bold: 1, outline: 3, boxed: false, label: "Bold" },
  karaoke: { color: "&H00FFFFFF", bold: 0, outline: 3, boxed: false, label: "Karaoke" },
  highlight: { color: "&H00FFD700", bold: 1, outline: 3, boxed: false, label: "Highlight" },
  minimal: { color: "&H00FFFFFF", bold: 0, outline: 0, boxed: false, label: "Minimal" },
  modern: { color: "&H00FFFFFF", bold: 0, outline: 3, boxed: false, label: "Modern" },
};

export interface RenderOptions {
  start: number;
  end: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  width?: number;
  captions?: Array<{ start: number; end: number; text: string }>;
  captionStyle?: string;
  captionPosition?: "top" | "bottom";
  captionFontSize?: number;
  title?: string;
  titleOverlay?: boolean;
  watermark?: string;
  autoZoom?: boolean;
}

/**
 * Render a sub-clip with optional crop, caption burn-in, title and watermark.
 */
export async function renderClip(input: string, output: string, opts: RenderOptions): Promise<void> {
  const src = await probeMedia(input);
  const { start, end } = opts;
  const duration = Math.max(0, end - start);
  const targetWidth = opts.width || 1080;
  const targetAR = opts.aspectRatio || "9:16";
  const [aw, ah] = targetAR.split(":").map(Number);
  const targetH = Math.round((targetWidth * ah) / aw);
  const srcAR = src.width && src.height ? src.width / src.height : aw / ah;
  const dstAR = aw / ah;

  const vf: string[] = [];
  if (Math.abs(srcAR - dstAR) > 0.03) {
    if (srcAR > dstAR) {
      const cropW = Math.round((src.height * dstAR * src.width) / src.width);
      const cw = Math.round(src.height * dstAR);
      vf.push(`crop=${cw}:${src.height}:${Math.round((src.width - cw) / 2)}:0`);
    } else {
      const ch = Math.round(src.width / dstAR);
      vf.push(`crop=${src.width}:${ch}:0:${Math.round((src.height - ch) / 2)}`);
    }
  }
  vf.push(`scale=${targetWidth}:${targetH}:force_original_aspect_ratio=decrease`);
  vf.push(`pad=${targetWidth}:${targetH}:(ow-iw)/2:(oh-ih)/2:color=black`);

  const subtitleFile = output + ".ass";
  if (opts.captions?.length) {
    const ass = buildAss(opts.captions, {
      style: opts.captionStyle || "modern",
      position: opts.captionPosition || "bottom",
      fontSize: opts.captionFontSize || 18,
      width: targetWidth,
      height: targetH,
    });
    await fs.writeFile(subtitleFile, ass);
    vf.push(`ass=${escapeFilter(subtitleFile)}`);
  }
  if (opts.titleOverlay && opts.title) {
    vf.push(buildTitleOverlay(opts.title, targetWidth, targetH, opts.captionPosition));
  }
  if (opts.watermark) {
    vf.push(buildWatermark(opts.watermark, targetWidth, targetH));
  }

  const args = ["-y", "-ss", String(start)];
  if (duration > 0) args.push("-t", String(duration));
  args.push("-i", input);
  if (opts.autoZoom) {
    vf.push(`scale=${Math.round(targetWidth * 1.05)}:${Math.round(targetH * 1.05)}`);
    vf.push(`crop=${targetWidth}:${targetH}:(iw-ow)/2:(ih-oh)/2`);
  }
  if (vf.length) args.push("-vf", vf.join(","));
  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "21",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-shortest",
    output
  );
  await execFileAsync("ffmpeg", args, { maxBuffer: 64 * 1024 * 1024 });
}

function escapeFilter(p: string): string {
  return p.replace(/\\/g, "/").replace(/:/g, "\\:");
}

function escapeDrawText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/\n/g, " ");
}

function buildTitleOverlay(title: string, W: number, H: number, position?: string): string {
  const y = position === "top" ? Math.round(H * 0.08) : Math.round(H - H * 0.22);
  const fontSize = Math.max(24, Math.round(W * 0.05));
  return `drawtext=text='${escapeDrawText(title)}':x=(w-text_w)/2:y=${y}:fontsize=${fontSize}:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=14:fontfile=${defaultFont()}`;
}

function buildWatermark(text: string, W: number, H: number): string {
  const fontSize = Math.max(14, Math.round(W * 0.028));
  return `drawtext=text='${escapeDrawText(text)}':x=w-tw-24:y=h-th-24:fontsize=${fontSize}:fontcolor=white@0.5:box=1:boxcolor=black@0.35:boxborderw=8:fontfile=${defaultFont()}`;
}

let cachedFont: string | null = null;
export function defaultFont(): string {
  if (cachedFont) return cachedFont;
  const candidates = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
  ];
  for (const c of candidates) {
    if (existsSync(c)) {
      cachedFont = c;
      return c;
    }
  }
  cachedFont = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
  return cachedFont;
}

// ---------------------------------------------------------------------------
// ASS subtitle generation
// ---------------------------------------------------------------------------
function toAssTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const cs = Math.round((sec % 1) * 100);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function buildAss(
  cues: Array<{ start: number; end: number; text: string }>,
  opts: { style: string; position: string; fontSize: number; width: number; height: number }
): string {
  const spec = CAPTION_STYLES[opts.style] ?? CAPTION_STYLES.modern;
  const align = opts.position === "top" ? 8 : 2; // 8=top, 2=bottom-center
  const marginV = opts.position === "top" ? Math.round(opts.height * 0.12) : Math.round(opts.height * 0.06);
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${opts.width}
PlayResY: ${opts.height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,Inter,${opts.fontSize},${spec.color},&H000000FF,&H00000000,&H80000000,${spec.bold},0,0,0,100,100,0,0,1,${spec.outline},0,${align},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const body = cues
    .map((c) => `Dialogue: 0,${toAssTime(c.start)},${toAssTime(c.end)},Caption,,0,0,0,,${c.text.replace(/\n/g, "\\N")}`)
    .join("\n");
  return header + "\n" + body;
}

// ---------------------------------------------------------------------------
// Shared media helpers
// ---------------------------------------------------------------------------
export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function safeExtension(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return [".mp4", ".mov", ".webm", ".m4v"].includes(ext) ? ext : ".mp4";
}

export function formatDuration(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}