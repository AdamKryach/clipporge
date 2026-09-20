import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { id: string; jobId: string } }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const job = await prisma.processingJob.findFirst({
    where: { id: params.jobId, projectId: params.id, userId: user.id },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({
    id: job.id,
    stage: job.stage,
    status: job.status,
    progress: job.progress,
    message: job.message,
    error: job.error,
  });
}