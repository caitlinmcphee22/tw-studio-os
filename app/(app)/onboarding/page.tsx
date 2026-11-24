import Link from "next/link";
import { requireUser } from "@/lib/session";
import { sql } from "@/lib/db";
import { toggleItem } from "./actions";

const STAGES: Record<number, [string, string]> = {
  1: ["Before day one", "Done before your first shift."],
  2: ["Week one", "Settling in."],
  3: ["First month", "Watching, then teaching with support."],
  4: ["By three months", "Ready to work independently."],
};

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const me = await requireUser();
  const { person: asked } = await searchParams;
  const viewable = me.role === "admin"
    ? await sql<{ email: string; name: string }>`select email, name from people where active order by name`
    : await sql<{ email: string; name: string }>`select email, name from people where active and (email = ${me.email} or supervisor_email = ${me.email}) order by name`;
  const person = asked && viewable.some((v) => v.email === asked) ? asked : me.email;
  const who = viewable.find((v) => v.email === person);
  const items = await sql<{ id: number; stage: number; label: string; owner: string; done_at: string | null }>`
    select i.id, i.stage, i.label, i.owner, p.done_at from onboarding_items i
    left join onboarding_progress p on p.item_id = i.id and p.email = ${person}
    order by i.stage, i.sort`;
  const done = items.filter((i) => i.done_at).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  return (
    <main className="wrap" style={{ maxWidth: 1080 }}>
      <section style={{ display: "flex", flexWrap: "wrap", gap: "20px 48px", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 620 }}>
          <p className="k">{person === me.email ? "Your onboarding" : `Onboarding · ${who?.name || person}`}</p>
          <h1>Onboarding</h1>
          <p className="m">Everything between signing your contract and working on your own. Your supervisor sees this too.</p>
        </div>
        <div style={{ minWidth: 240, display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="big">{done} of {items.length}</p>
          <span className="bar"><span style={{ width: pct + "%" }} /></span>
        </div>
      </section>
      {viewable.length > 1 && (
        <nav className="tabs" aria-label="Person">
          {viewable.map((v) => (
            <Link key={v.email} href={`/onboarding?person=${encodeURIComponent(v.email)}`} aria-current={v.email === person ? "page" : undefined}>
              {v.email === me.email ? "You" : v.name || v.email}
            </Link>
          ))}
        </nav>
      )}
      {[1, 2, 3, 4].map((s) => (
        <section key={s} className="split" style={{ borderTop: "1px solid var(--ink)", paddingTop: 18, gap: "12px 48px" }}>
          <div className="side" style={{ gap: 4, flexBasis: 220 }}>
            <h2 className="k">{STAGES[s][0]}</h2>
            <p className="m small">{STAGES[s][1]}</p>
          </div>
          <div className="main" style={{ gap: 0 }}>
            {items.filter((i) => i.stage === s).map((i) => (
              <form key={i.id} action={toggleItem} className="row" style={{ padding: "6px 0" }}>
                <input type="hidden" name="person" value={person} />
                <input type="hidden" name="item" value={i.id} />
                <button type="submit" aria-pressed={Boolean(i.done_at)} style={{ display: "flex", gap: 14, alignItems: "center", background: "none", border: 0, font: "inherit", color: "inherit", cursor: "pointer", minHeight: 44, textAlign: "left", flex: 1, padding: 0 }}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, border: "1px solid var(--ink)", background: i.done_at ? "var(--ink)" : "transparent", flex: "none" }} />
                  <span style={{ textDecoration: i.done_at ? "line-through" : "none", color: i.done_at ? "var(--muted)" : "inherit" }}>{i.label}</span>
                </button>
                <span className="k small m">{i.owner}</span>
              </form>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
