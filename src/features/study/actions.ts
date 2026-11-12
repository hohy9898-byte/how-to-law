"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth";
import { toggleBookmark } from "./bookmarks";
import { saveNote } from "./notes";

async function requireUser(path: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  return user;
}

function readRef(form: FormData) {
  return {
    lawId: String(form.get("lawId") ?? ""),
    articleKey: String(form.get("articleKey") ?? ""),
    path: String(form.get("path") ?? "/"),
  };
}

export async function toggleBookmarkAction(form: FormData) {
  const { lawId, articleKey, path } = readRef(form);
  const user = await requireUser(path);
  await toggleBookmark({ userId: user.id, lawId, articleKey });
  revalidatePath(path);
}

export type NoteState = { body: string; savedAt?: string; error?: string };

export async function saveNoteAction(_: NoteState, form: FormData): Promise<NoteState> {
  const { lawId, articleKey, path } = readRef(form);
  const user = await requireUser(path);
  const body = await saveNote({ userId: user.id, lawId, articleKey }, String(form.get("body") ?? ""));
  return { body, savedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
}
