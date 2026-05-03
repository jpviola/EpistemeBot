import { PrismaClient } from "../../generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";
import { pathToFileURL } from "node:url";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

if (!globalForPrisma.prisma) {
  const dbFile = path.resolve(process.cwd(), "dev.db");
  const url = pathToFileURL(dbFile).href;
  const adapter = new PrismaLibSql({ url });
  globalForPrisma.prisma = new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma;
