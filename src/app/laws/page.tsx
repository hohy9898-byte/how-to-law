import type { Metadata } from "next";
import { LawCards } from "@/features/law";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "법령" };

export default function LawsPage() {
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">법령</h1>
      <LawCards />
    </div>
  );
}
