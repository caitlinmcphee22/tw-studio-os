import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { sql } from "@/lib/db";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { acknowledge, saveDoc } from "../actions";
import DocForm from "../DocForm";

export default async function DocPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const { edit } = await searchParams;
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();
  const [doc] = await sql<{ id: number; category: string; title: string; body: string; owner: string; version: number; requires_ack: boolean; updated_at: string }>`
    select id, category, title, body, owner, version, requires_ack, updated_at from documents where id = ${n}`;
  if (!doc) notFound();
  const [mine] = await sql<{ acked_at: string }>`select acked_at from acknowledgements where doc_id = ${n} and version = ${doc.version} and email = ${me.email}`;
  const isAdmin = me.role === "admin";
  const status = isAdmin && doc.requires_ack
    ? await sql<{ name: string; email: string; acked_at: string | null }>`
        select p.name, p.email, a.acked_at from people p
        left join acknowledgements a on a.email = p.email and a.doc_id = ${n} and a.version = ${doc.version}
        where p.active order by a.acked_at nulls first, p.name`
    : [];
  if (isAdmin && edit) {
    return (
      <main className="wrap" style={{ maxWidth: 900 }}>
        <Link href={`/library/${n}`} className="k" style={{ textDecoration: "none" }}>Cancel</Link>
        <h1>Edit document</h1>
        <DocForm action={saveDoc} doc={doc} />
      </main>
    );
  }
  return (
    <main className="wrap">
      <Link href="/library" className="k" style={{ textDecoration: "none" }}>Library</Link>
      <section className="split">
        <article className="main">
          <p className="k">{doc.category}</p>
          <h1>{doc.title}</h1>
          <p className="m small">{doc.owner} · version {doc.version} · updated {fmtDate(doc.updated_at)}</p>
          <div className="prose" style={{ borderTop: "1px solid var(--rule)", paddingTop: 20, maxWidth: 760 }}>{doc.body}</div>
        </article>
        <aside className="side">
          {doc.requires_ack && (
            <div className="card">
              <p className="k">Read and acknowledge</p>
              {mine ? (
                <p style={{ margin: 0 }}>You acknowledged version {doc.version} on {fmtDateTime(mine.acked_at)}.</p>
              ) : (
                <form action={acknowledge}>
                  <input type="hidden" name="id" value={doc.id} />
                  <button className="btn" type="submit">I've read this version</button>
                </form>
              )}
            </div>
          )}
          {isAdmin && <Link className="btn ghost" href={`/library/${n}?edit=1`}>Edit</Link>}
          {isAdmin && doc.requires_ack && (
            <div className="card" style={{ background: "transparent", border: "1px solid var(--rule)" }}>
              <p className="k">Who has acknowledged</p>
              {status.map((s) => (
                <div key={s.email} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{s.name || s.email}</span>
                  <span className={s.acked_at ? "m small" : "flag small"}>{s.acked_at ? fmtDate(s.acked_at) : "Not yet"}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
