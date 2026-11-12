import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm, getCurrentUser } from "@/features/auth";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const raw = (await searchParams).next ?? "/";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
  if (await getCurrentUser()) redirect(next);
  return <AuthForm mode="login" next={next} />;
}
