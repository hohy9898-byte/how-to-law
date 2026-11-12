"use client";

import { useActionState, useState } from "react";
import { saveNoteAction, type NoteState } from "@/app/actions/article";

type Props = { lawId: string; articleKey: string; path: string; initial: string };

export function NoteEditor({ lawId, articleKey, path, initial }: Props) {
  const [state, action, pending] = useActionState<NoteState, FormData>(saveNoteAction, { body: initial });
  const [draft, setDraft] = useState(initial);
  const dirty = draft.trim() !== state.body;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="lawId" value={lawId} />
      <input type="hidden" name="articleKey" value={articleKey} />
      <input type="hidden" name="path" value={path} />
      <textarea
        name="body"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        maxLength={5000}
        placeholder="두문자, 관련 판례, 헷갈리는 점 등"
        aria-label="조문 메모"
        className="w-full rounded border border-border bg-transparent px-3 py-2 text-sm leading-6"
      />
      <div className="flex items-center gap-3 text-sm">
        <button
          disabled={pending || !dirty}
          className="rounded border border-border px-3 py-1 hover:text-accent disabled:opacity-50 disabled:hover:text-inherit"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
        <span className="text-muted">
          {dirty ? "저장하지 않은 변경이 있습니다." : state.savedAt ? `${state.savedAt}에 저장됨` : ""}
        </span>
      </div>
    </form>
  );
}
