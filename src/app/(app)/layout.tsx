import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login?callbackUrl=" + encodeURIComponent("/dashboard"));
  const user = session.user;
  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}