import { PrismaClient } from "@prisma/client";

// 개발 서버가 핫 리로드될 때 연결이 계속 늘어나지 않도록 하나만 쓴다.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
