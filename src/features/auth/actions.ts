"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "./session";
import { authenticate, createUser } from "./users";

export type AuthState = { error?: string; email?: string };

/** 로그인 후 돌아갈 주소. 다른 사이트로 보내지 않도록 같은 사이트 경로만 허용 */
function safeNext(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (password !== String(form.get("passwordConfirm") ?? "")) return { error: "비밀번호 확인이 일치하지 않습니다.", email };
  const result = await createUser(email, password);
  if ("error" in result) return { error: result.error, email };
  await createSession(result.user.id);
  redirect(safeNext(form.get("next")));
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "");
  const user = await authenticate(email, String(form.get("password") ?? ""));
  if (!user) return { error: "이메일 또는 비밀번호가 틀립니다.", email };
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}
