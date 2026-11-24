import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { saveDoc } from "../actions";
import DocForm from "../DocForm";

export default async function NewDoc() {
  await requireAdmin();
  return (
    <main className="wrap" style={{ maxWidth: 900 }}>
      <Link href="/library" className="k" style={{ textDecoration: "none" }}>Library</Link>
      <h1>New document</h1>
      <DocForm action={saveDoc} />
    </main>
  );
}
