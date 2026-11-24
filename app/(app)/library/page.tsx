import Link from "next/link";
import { requireUser } from "@/lib/session";
import { sql } from "@/lib/db";
import { fmtDate } from "@/lib/format";

type Doc = { id: number; category: string; title: string; owner: string; version: number; requires_ack: boolean; updated_at: string; acked: boolean };

export default async function Library({ searchParams }: { searchParams: Promise<{ filter?: string; c?: string }> }) {
  const me = await requireUser();
  const { filter, c } = await searchParams;
  const docs = await sql<Doc>`
    select d.id, d.category, d.title, d.owner, d.version, d.requires_ack, d.updated_at,
      exists (select 1 from acknowledgements a where a.doc_id = d.id and a.version = d.version and a.email = ${me.email}) as acked
    from documents d order by d.category, d.title`;
  const cats = Array.from(new Set(docs.map((d) => d.category)));
  const toAck = docs.filter((d) => d.requires_ack && !d.acked);
  const shown = filter === "ack" ? toAck : c ? docs.filter((d) => d.category === c) : docs;
  const groups = Array.from(new Set(shown.map((d) => d.category)));
  return (
    <main className="wrap">
      <section style={{ display: "flex", flexWrap: "wrap", gap: "16px 32px", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="k">How we work</p>
          <h1>Library</h1>
        </div>
        {me.role === "admin" && <Link className="btn" href="/library/new">New document</Link>}
      </section>
      <nav className="tabs" aria-label="Sections">
        <Link href="/library" aria-current={!filter && !c ? "page" : undefined}>All</Link>
        <Link href="/library?filter=ack" aria-current={filter === "ack" ? "page" : undefined}>To acknowledge ({toAck.length})</Link>
        {cats.map((x) => (
          <Link key={x} href={`/library?c=${encodeURIComponent(x)}`} aria-current={c === x ? "page" : undefined}>{x}</Link>
        ))}
      </nav>
      {shown.length === 0 && <p className="m">Nothing here. You're up to date.</p>}
      {groups.map((g) => (
        <section key={g} style={{ display: "flex", flexDirection: "column" }}>
          <h2 className="k" style={{ paddingBottom: 8 }}>{g}</h2>
          <div className="rows">
            {shown.filter((d) => d.category === g).map((d) => (
              <div key={d.id} className="row">
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Link href={`/library/${d.id}`} style={{ textUnderlineOffset: 4 }}>{d.title}</Link>
                  <span className="m small">{d.owner} · version {d.version} · updated {fmtDate(d.updated_at)}</span>
                </div>
                <span className={d.requires_ack && !d.acked ? "k flag" : "k m"}>
                  {d.requires_ack ? (d.acked ? "Acknowledged" : "Acknowledge") : "Reference"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="m small">Every document has an owner. When a policy changes, everyone is asked to read and acknowledge the new version.</p>
    </main>
  );
}
