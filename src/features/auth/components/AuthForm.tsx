"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type AuthState } from "../actions";

const input = "w-full rounded border border-border bg-transparent px-3 py-2";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, {});
  const isSignup = mode === "signup";
  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">{isSignup ? "회원가입" : "로그인"}</h1>
      <input type="hidden" name="next" value={next} />
      <label className="block text-sm">
        이메일
        <input name="email" type="email" required autoComplete="email" defaultValue={state.email} className={`${input} mt-1`} />
      </label>
      <label className="block text-sm">
        비밀번호{isSignup && <span className="text-muted"> (8자 이상)</span>}
        <input
          name="password"
          type="password"
          required
          minLength={isSignup ? 8 : undefined}
          autoComplete={isSignup ? "new-password" : "current-password"}
          className={`${input} mt-1`}
        />
      </label>
      {isSignup && (
        <label className="block text-sm">
          비밀번호 확인
          <input name="passwordConfirm" type="password" required autoComplete="new-password" className={`${input} mt-1`} />
        </label>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="w-full rounded bg-accent py-2 text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "처리 중…" : isSignup ? "가입하기" : "로그인"}
      </button>
      <p className="text-center text-sm text-muted">
        {isSignup ? "이미 계정이 있나요? " : "계정이 없나요? "}
        <Link href={`/${isSignup ? "login" : "signup"}${nextQuery}`} className="text-accent hover:underline">
          {isSignup ? "로그인" : "회원가입"}
        </Link>
      </p>
    </form>
  );
}
