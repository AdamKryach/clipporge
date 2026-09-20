import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma, absPath } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clip = await prisma.clip.findFirst({
    where: { id: params.id, userId: user.id },
    include: { video: true },
  });
  if (!clip) return NextResponse.json({ error: "Clip not found" }, { status: 404 });
  const storage = clip.video?.storagePath || clip.outputPath;
  if (!storage) return NextResponse.json({ error: "Clip has no rendered file" }, { status: 404 });
  try {
    const buf = await fs.readFile(absPath(storage));
    const safeName = (clip.title || "clip").replace(/[^a-z0-9-_ ]/gi, "_").replace(/\s+/g, "_");
    return new NextResponse(new Blob([buf]), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safeName}.mp4"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Rendered file missing" }, { status: 404 });
  }
}