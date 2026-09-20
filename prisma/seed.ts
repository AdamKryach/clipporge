import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@clipporge.app";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash("demo1234", 10);
    const user = await prisma.user.create({
      data: { email, name: "Demo Creator", passwordHash, role: "admin" },
    });
    await prisma.subscription.create({ data: { userId: user.id, plan: "pro" } });
    await prisma.userSettings.create({ data: { userId: user.id } });
    console.log("Seeded demo user:", email, "/ demo1234");
  } else {
    console.log("Demo user already exists.");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());