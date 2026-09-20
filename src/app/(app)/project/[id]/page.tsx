import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, toPlain } from "@/lib/db";
import { ProjectClient } from "@/components/project-client";
import { getPlan } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: params.id, userId: uid },
    include: {
      sourceVideo: true,
      settings: true,
      clips: { orderBy: { createdAt: "asc" }, include: { video: true, segments: { orderBy: { index: "asc" } } } },
      transcript: true,
      jobs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!project) redirect("/dashboard");

  const sub = await prisma.subscription.findUnique({ where: { userId: uid } });
  const plan = getPlan(sub?.plan ?? "free");

  const serialized = toPlain({
    project,
    plan: { id: plan.id, name: plan.name, maxClipLengthSec: plan.maxClipLengthSec, watermarkFree: plan.watermarkFree },
  });

  return <ProjectClient initial={serialized} />;
}