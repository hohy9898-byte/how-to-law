import { describe, expect, it } from "vitest";
import { hashPassword, validateCredentials, verifyPassword } from "./password";

describe("password", () => {
  it("해시와 검증", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong horse", stored)).toBe(false);
  });

  it("같은 비밀번호도 salt가 달라 해시가 다르다", async () => {
    expect(await hashPassword("same-password")).not.toBe(await hashPassword("same-password"));
  });

  it("형식이 깨진 저장값은 실패", async () => {
    expect(await verifyPassword("x", "plain-text")).toBe(false);
  });

  it("입력 검사", () => {
    expect(validateCredentials("a@b.co", "12345678")).toBeNull();
    expect(validateCredentials("not-email", "12345678")).toMatch(/이메일/);
    expect(validateCredentials("a@b.co", "short")).toMatch(/8자/);
  });
});
