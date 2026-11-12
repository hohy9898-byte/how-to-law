"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { articleHref, articleName } from "../keys";
import type { TocRow } from "../toc";

type Node = { i: number; row: TocRow; children: Node[]; articleCount: number };

/** 평평한 행(depth 포함)을 트리로 */
function build(rows: TocRow[]): Node[] {
  const roots: Node[] = [];
  const stack: Node[] = [];
  rows.forEach((row, i) => {
    const node: Node = { i, row, children: [], articleCount: 0 };
    const depth = row[3];
    stack.length = depth;
    (depth === 0 ? roots : stack[depth - 1]?.children ?? roots).push(node);
    stack[depth] = node;
    if (row[2] === "A") stack.slice(0, depth).forEach((p) => p.articleCount++);
  });
  return roots;
}

const storageKey = (slug: string) => `toc-open:${slug}`;

/**
 * 목차. 펼친 편·장·절의 자식만 그린다.
 * 조문 1천여 개를 한 번에 그리지 않아서 처음 화면이 가볍다.
 * 펼친 상태는 sessionStorage에 남겨 조문을 보고 돌아와도 유지된다.
 */
export function TocTree({ slug, rows }: { slug: string; rows: TocRow[] }) {
  const tree = useMemo(() => build(rows), [rows]);
  const defaultOpen = useMemo(() => new Set(tree.map((n) => n.i)), [tree]);
  const [open, setOpen] = useState<Set<number>>(defaultOpen);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey(slug));
      if (saved) setOpen(new Set(JSON.parse(saved) as number[]));
    } catch {}
  }, [slug]);

  const update = (next: Set<number>) => {
    setOpen(next);
    try {
      sessionStorage.setItem(storageKey(slug), JSON.stringify([...next]));
    } catch {}
  };
  const toggle = (i: number) => {
    const next = new Set(open);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    update(next);
  };

  const renderList = (nodes: Node[]) => (
    <ul className="ml-4 border-l border-border pl-3">{nodes.map(renderItem)}</ul>
  );

  function renderItem(n: Node) {
    const [key, title, level, , deleted] = n.row;
    if (level === "A") {
      return (
        <li key={n.i}>
          <Link href={articleHref(slug, key)} className={`block py-0.5 hover:text-accent ${deleted ? "text-muted" : ""}`}>
            {articleName(key)}
            {title ? `(${title})` : deleted ? " 삭제" : ""}
          </Link>
        </li>
      );
    }
    const isOpen = open.has(n.i);
    return (
      <li key={n.i}>
        <button
          type="button"
          onClick={() => toggle(n.i)}
          aria-expanded={isOpen}
          className={`flex w-full items-baseline gap-1.5 py-1 text-left hover:text-accent ${level === "P" ? "font-semibold" : "font-medium"} ${deleted ? "text-muted" : ""}`}
        >
          <span className="w-3 shrink-0 text-xs text-muted">{isOpen ? "▾" : "▸"}</span>
          <span>
            {key} {title}
          </span>
          {n.articleCount > 0 && <span className="text-xs font-normal text-muted">{n.articleCount}</span>}
        </button>
        {isOpen && n.children.length > 0 && renderList(n.children)}
      </li>
    );
  }

  return (
    <div className="text-[15px]">
      <div className="mb-2 flex gap-3 text-sm text-muted">
        <button type="button" className="hover:text-accent" onClick={() => update(new Set(defaultOpen))}>
          모두 접기
        </button>
      </div>
      <ul>{tree.map(renderItem)}</ul>
    </div>
  );
}
