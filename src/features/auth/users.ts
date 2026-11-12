// 가입·로그인
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/db";
import { hashPassword, validateCredentials, verifyPassword } from "./password";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function createUser(email: string, password: string) {
  const e = normalizeEmail(email);
  const invalid = validateCredentials(e, password);
  if (invalid) return { error: invalid } as const;
  try {
    const user = await prisma.user.create({ data: { email: e, passwordHash: await hashPassword(password) } });
    return { user } as const;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "이미 가입된 이메일입니다." } as const;
    }
    throw err;
  }
}

/** 이메일·비밀번호가 맞으면 사용자, 아니면 null */
export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return user;
}
