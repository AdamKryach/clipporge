import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsClient } from "@/components/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = { name: session.user.name, email: session.user.email, id: (session.user as any).id };
  return <SettingsClient user={user} />;
}