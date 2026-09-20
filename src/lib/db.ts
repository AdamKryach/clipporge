import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";

export type { User } from "@prisma/client";

// Global singleton pattern for the Prisma client across dev hot reloads
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Root folder under which all media lives (uploaded + rendered clips). */
export function mediaRoot(): string {
  const dir = process.env.MEDIA_STORAGE_DIR || path.join(process.cwd(), "media");
  return path.resolve(dir);
}

export async function ensureMediaRoot(): Promise<string> {
  const root = mediaRoot();
  await fs.mkdir(root, { recursive: true });
  return root;
}

/** Absolute filesystem path for a stored-relative path. */
export function absPath(relative: string): string {
  return path.join(mediaRoot(), relative);
}

/** Absolute filesystem path for a stored-relative directory. */
export function absDir(relative: string): string {
  return path.join(mediaRoot(), relative);
}

/** Convert a Prisma result (may contain BigInt) into JSON-safe plain data. */
export function toPlain<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
  );
}

/** Public URL served by the app for a stored-relative path. */
export function publicUrl(relative: string): string {
  return `/media/${relative.replace(/\\/g, "/")}`;
}