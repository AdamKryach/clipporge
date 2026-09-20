import { prisma } from "./db";
import { absPath } from "./db";
import { probeMedia, renderClip, audioEnvelope, detectSilence, safeExtension } from "./ffmpeg";
import { transcribeAudio } from "./transcription";
import { generateHighlights, ClipOptions } from "./engine";
import { consumeUsage } from "./billing";
import { promises as fs } from "fs";
import path from "path";

/**
 * The asynchronous clipping pipeline. Each stage updates the ProcessingJob so
 * the frontend can show real, meaningful processing states:
 *
 * UPLOAD -> store -> extract/analyze audio -> transcribe -> analyze ->
 * find highlights -> render clips -> add captions -> save -> complete
 */
export async function runAnalysisPipeline(
  jobId: string,
  projectId: string,
  sourceVideoId: string,
  options: ClipOptions
): Promise<void> {
  const job = await prisma.processingJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  const userId = job.userId;

  const setStage = (stage: string, progress: number, message: string) =>
    prisma.processingJob.update({
      where: { id: jobId },
      data: { stage, progress, message, updatedAt: new Date() },
    });

  try {
    const video = await prisma.video.findUnique({ where: { id: sourceVideoId } });
    if (!video) throw new Error("Source video not found");

    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: "running", startedAt: new Date() },
    });
    await setStage("preparing", 8, "Preparing video");

    const input = absPath(video.storagePath);
    await fs.access(input);
    const info = await probeMedia(input);
    if (video.durationSec == null) {
      await prisma.video.update({ where: { id: sourceVideoId }, data: { durationSec: info.durationSec, width: info.width, height: info.height } });
    }
    const duration = video.durationSec || info.durationSec || 30;

    // --- Transcribe ---
    await setStage("transcribing", 25, "Transcribing audio");
    const transcript = await transcribeAudio(input, video.originalName);
    await prisma.transcript.upsert({
      where: { projectId },
      create: { projectId, language: transcript.language, text: transcript.text, segments: JSON.stringify(transcript.segments), durationSec: duration, provider: transcript.provider },
      update: { language: transcript.language, text: transcript.text, segments: JSON.stringify(transcript.segments), durationSec: duration, provider: transcript.provider },
    });

    // --- Analyze audio envelope + silence for engagement ---
    await setStage("finding_highlights", 45, "Analyzing audio for highlights");
    const [envelope, silence] = await Promise.all([
      audioEnvelope(input, duration),
      detectSilence(input, duration),
    ]);

    // --- Identify + score candidate moments ---
    const highlights = await generateHighlights(transcript, envelope, {
      numClips: options.numClips,
      clipLength: options.clipLength,
      style: options.style,
      aspectRatio: options.aspectRatio,
      durationSec: duration,
    });

    await setStage("creating_clips", 62, "Creating clip timestamps");
    await setStage("adding_captions", 74, "Adding captions");

    const settings = await prisma.projectSettings.findUnique({ where: { projectId } });
    const clipCount = highlights.length;
    const rendered: string[] = [];

    for (let i = 0; i < clipCount; i++) {
      const h = highlights[i];
      const progress = Math.round(78 + (i / Math.max(1, clipCount)) * 21);
      await setStage("rendering", progress, `Rendering clip ${i + 1} of ${clipCount}`);

      const fileName = `clip-${projectId.slice(0, 8)}-${Date.now()}-${i}${safeExtension(video.originalName)}`;
      const relDir = `users/${userId}/projects/${projectId}`;
      const relPath = `${relDir}/${fileName}`;
      await fs.mkdir(absPath(relDir), { recursive: true });
      const outAbs = absPath(relPath);

      const clip = await prisma.clip.create({
        data: {
          projectId,
          userId,
          title: h.title,
          description: h.description,
          hashtags: JSON.stringify(h.hashtags),
          startSec: h.startSec,
          endSec: h.endSec,
          durationSec: h.endSec - h.startSec,
          engagementScore: h.engagementScore,
          tags: JSON.stringify(h.tags),
          status: "processing",
          aspectRatio: settings?.aspectRatio ?? options.aspectRatio,
          captionStyle: settings?.captionStyle ?? "modern",
          captionPosition: settings?.captionPosition ?? "bottom",
          captionFontSize: settings?.captionFontSize ?? 18,
          titleOverlay: settings?.showTitleOverlay ?? true,
          watermarkText: settings?.watermarkText,
          autoZoom: settings?.autoZoom ?? true,
        },
      });

      await renderClip(input, outAbs, {
        start: h.startSec,
        end: h.endSec,
        aspectRatio: (settings?.aspectRatio as any) ?? options.aspectRatio,
        captions: h.segments.map((s) => ({ start: s.start, end: s.end, text: s.text })),
        captionStyle: settings?.captionStyle ?? "modern",
        captionPosition: (settings?.captionPosition as any) ?? "bottom",
        captionFontSize: settings?.captionFontSize ?? 18,
        title: h.title,
        titleOverlay: settings?.showTitleOverlay ?? true,
        watermark: settings?.watermarkText ?? undefined,
        autoZoom: settings?.autoZoom ?? true,
      });

      const clipVideo = await prisma.video.create({
        data: {
          projectId,
          userId,
          originalName: fileName,
          storagePath: relPath,
          mimeType: "video/mp4",
          kind: "clip",
          durationSec: h.endSec - h.startSec,
          width: 0,
          height: 0,
          processedByClipId: clip.id,
        },
      });

      await prisma.clip.update({ where: { id: clip.id }, data: { videoId: clipVideo.id, outputPath: relPath, status: "ready" } });
      if (h.segments.length) {
        await prisma.clipSegment.createMany({
          data: h.segments.map((s, idx) => ({ clipId: clip.id, text: s.text, startSec: s.start, endSec: s.end, index: idx })),
        });
      }
      rendered.push(clip.id);
    }

    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: "complete", stage: "complete", progress: 100, message: "Complete", finishedAt: new Date() },
    });
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "complete", totalClips: rendered.length, error: null },
    });
    await consumeUsage(userId, "video", 1);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Processing failed";
    await prisma.processingJob.update({
      where: { id: jobId },
      data: { status: "failed", stage: "failed", error: msg, finishedAt: new Date() },
    });
    await prisma.project.update({ where: { id: projectId }, data: { status: "failed", error: msg } });
    throw err;
  }
}

export function clipOptionsFrom(input: { numClips?: number; clipLength?: number; style?: string; aspectRatio?: string; durationSec?: number }): ClipOptions {
  return {
    numClips: input.numClips && input.numClips > 0 ? Math.min(Math.floor(input.numClips), 10) : 5,
    clipLength: input.clipLength && input.clipLength > 0 ? input.clipLength : 30,
    style: (input.style as ClipOptions["style"]) || "auto",
    aspectRatio: input.aspectRatio || "9:16",
    durationSec: input.durationSec || 30,
  };
}