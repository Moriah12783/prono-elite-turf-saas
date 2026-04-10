import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient | undefined;
}

export function getPrisma() {
  if (!global.__prisma__) {
    global.__prisma__ = new PrismaClient();
  }

  return global.__prisma__;
}
