import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AdminClient } from "@/components/admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = { name: session.user.name, email: session.user.email, role: (session.user as any).role };
  return <AdminClient user={user} envSnapshot={{ openai: !!process.env.OPENAI_API_KEY, stripe: !!process.env.STRIPE_SECRET_KEY, billing: process.env.BILLING_PROVIDER || "mock" }} />;
}