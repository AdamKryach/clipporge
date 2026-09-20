import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import path from "path";
import { absPath } from "./db";

const execFileAsync = promisify(execFile);

/**
 * Generate a bundled sample video (colorbars + test pattern + tone) so the
 * entire clipping workflow can be tested without the user uploading anything.
 * The pipeline treats it exactly like a real upload.
 */
export async function ensureDemoVideo(destRel: string): Promise<string> {
  const out = absPath(destRel);
  await fs.mkdir(path.dirname(out), { recursive: true });
  // Always regenerate so a stale/partial file is never reused.
  const tmp = out + ".part.mp4";
  await fs.rm(tmp, { force: true });
  // 30s, vertical-ish 720x1280 test source with a changing pattern
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-f", "lavfi",
      "-i", "testsrc2=size=720x1280:rate=30:duration=34",
      "-f", "lavfi",
      "-i", "sine=frequency=440:sample_rate=44100:duration=34",
      "-filter_complex",
      "[0:v]drawbox=x=iw/4:y=ih/3:w=iw/2:h=ih/6:color=white@0.8:t=fill," +
        "drawtext=text='ClipForge Demo':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=h/2:fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" +
        " [v]",
      "-map", "[v]", "-map", "1:a",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "96k",
      "-t", "30",
      "-movflags", "+faststart",
      tmp,
    ],
    { maxBuffer: 64 * 1024 * 1024 }
  );
  await fs.rename(tmp, out);
  return out;
}