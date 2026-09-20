import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, toPlain } from "@/lib/db";
import { getUsage } from "@/lib/billing";
import { DashboardClient } from "@/components/dashboard-client";
import { PLANS } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) redirect("/login");

  const [projects, usage, settings] = await Promise.all([
    prisma.project.findMany({
      where: { userId: uid },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { sourceVideo: true, _count: { select: { clips: true } } },
    }),
    getUsage(uid),
    prisma.userSettings.findUnique({ where: { userId: uid } }),
  ]);

  const clipsCount = await prisma.clip.count({ where: { userId: uid } });
  const processedCount = await prisma.project.count({ where: { userId: uid, status: "complete" } });

  const stats = {
    projects: projects.length,
    processed: processedCount,
    clips: clipsCount,
    remaining: usage.videosRemaining,
    maxVideos: usage.maxVideos,
    plan: usage.plan,
  };

  const planName = PLANS[(usage.plan as keyof typeof PLANS) ?? "free"]?.name ?? "Free";

  return (
    <DashboardClient
      initialProjects={toPlain(projects) as any}
      stats={stats}
      planName={planName}
    />
  );
}