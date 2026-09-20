import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, toPlain } from "@/lib/db";
import { ClipsPageClient } from "@/components/clips-page-client";

export const dynamic = "force-dynamic";

export default async function ClipsPage() {
  const session = await getServerSession(authOptions);
  const uid = (session?.user as any)?.id;
  if (!uid) redirect("/login");

  const clips = await prisma.clip.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { video: true, project: { select: { id: true, name: true } } },
  });
  const serialized = toPlain(clips) as any;
  return <ClipsPageClient initial={serialized} />;
}