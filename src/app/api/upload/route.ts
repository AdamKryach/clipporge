import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma, absDir } from "@/lib/db";
import { ensureSubscription } from "@/lib/billing";
import { getPlan } from "@/lib/plan";

const ALLOWED = [".mp4", ".mov", ".webm", ".m4v", ".mkv"];

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sub = await ensureSubscription(user.id);
  const plan = getPlan(sub.plan);

  const fileName = req.headers.get("x-file-name") || "video.mp4";
  const fileSize = Number(req.headers.get("x-file-size") || "0");
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED.includes(ext)) {
    return NextResponse.json({ error: `Unsupported format "${ext}". Use MP4, MOV, WebM, M4V or MKV.` }, { status: 415 });
  }
  const mime = req.headers.get("content-type") || "";
  if (fileSize <= 0) {
    return NextResponse.json({ error: "Empty upload." }, { status: 400 });
  }

  // Basic size sanity check
  if (fileSize > 4 * 1024 * 1024 * 1024) {
    return NextResponse.json({ error: "File is larger than the 4GB limit." }, { status: 413 });
  }

  const projectName = (req.headers.get("x-project-name") || path.parse(fileName).name).slice(0, 80);

  // Create project + upload video record
  const project = await prisma.project.create({
    data: { userId: user.id, name: projectName, status: "uploading" },
  });
  await prisma.projectSettings.create({
    data: { projectId: project.id },
  });
  const relDir = `users/${user.id}/projects/${project.id}`;
  const relPath = `${relDir}/${project.id}${ext}`;
  await fs.mkdir(absDir(relDir), { recursive: true });
  const outAbs = path.join(absDir(relDir), `${project.id}${ext}`);

  const video = await prisma.video.create({
    data: {
      projectId: project.id,
      userId: user.id,
      originalName: fileName,
      storagePath: relPath,
      mimeType: mime || "video/mp4",
      sizeBytes: BigInt(fileSize),
      kind: "upload",
    },
  });
  await prisma.project.update({ where: { id: project.id }, data: { sourceVideoId: video.id } });

  // Stream request body to disk incrementally
  const ws = await fs.open(outAbs, "w");
  let received = 0;
  try {
    const reader = req.body?.getReader();
    if (!reader) throw new Error("No body");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      await ws.write(value);
      received += value.byteLength;
    }
  } catch (e) {
    await ws.close();
    await prisma.project.update({ where: { id: project.id }, data: { status: "failed", error: "Upload interrupted" } });
    return NextResponse.json({ error: "Upload interrupted. Please retry." }, { status: 500 });
  }
  await ws.close();

  // re-probe duration via a separate probe in the processing step
  return NextResponse.json({ ok: true, projectId: project.id, videoId: video.id, bytes: received });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}