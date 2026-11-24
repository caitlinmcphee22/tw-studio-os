import Link from "next/link";
import { requireUser, firstName } from "@/lib/session";
import { sql } from "@/lib/db";
import { greeting, todayLong, todayISO, fmtDate, fmtDateTime } from "@/lib/format";

export default async function Home() {
  const me = await requireUser();
  const today = todayISO();
  const [[onb], [next], [tasks], [acks], posts, [leave]] = await Promise.all([
    sql<{ done: number; total: number }>`
      select (select count(*)::int from onboarding_progress where email = ${me.email}) as done,
             (select count(*)::int from onboarding_items) as total`,
    sql<{ session_date: string | null }>`
      select min(session_date)::text as session_date from supervision_sessions
      where supervisee_email = ${me.email} and session_date >= ${today}`,
    sql<{ n: number }>`select count(*)::int as n from tasks where assignee_email = ${me.email} and status = 'open'`,
    sql<{ n: number }>`
      select count(*)::int as n from documents d where d.requires_ack
      and not exists (select 1 from acknowledgements a where a.doc_id = d.id and a.version = d.version and a.email = ${me.email})`,
    sql<{ id: number; title: string; body: string; created_at: string }>`
      select id, title, body, created_at from announcements order by created_at desc limit 4`,
    sql<{ n: number }>`select count(*)::int as n from leave_requests where status = 'pending'`,
  ]);
  const pct = onb.total ? Math.round((onb.done / onb.total) * 100) : 0;
  return (
    <main className="wrap">
      <section style={{ display: "flex", flexWrap: "wrap", gap: "16px 48px", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="k">{todayLong()}</p>
          <h1>{greeting()}, {firstName(me)}.</h1>
        </div>
        <p className="m" style={{ maxWidth: 380 }}>Everything you need to work here, in one place. If something is missing or out of date, tell us and we'll fix it.</p>
      </section>

      <section className="grid" aria-label="Your week">
        <Link href="/onboarding" className="card">
          <span className="k">Your onboarding</span>
          <span className="big">{onb.done} of {onb.total}</span>
          <span className="bar"><span style={{ width: pct + "%" }} /></span>
        </Link>
        <Link href="/supervision" className="card">
          <span className="k">Next supervision</span>
          <span className="big">{next.session_date ? fmtDate(next.session_date) : "Not booked"}</span>
        </Link>
        <Link href="/inbox" className="card">
          <span className="k">Tasks for you</span>
          <span className="big">{tasks.n}</span>
        </Link>
        <Link href="/library?filter=ack" className="card">
          <span className="k">To read and acknowledge</span>
          <span className={acks.n ? "big flag" : "big"}>{acks.n}</span>
        </Link>
        {me.role === "admin" && (
          <Link href="/leave" className="card">
            <span className="k">Leave to approve</span>
            <span className={leave.n ? "big flag" : "big"}>{leave.n}</span>
          </Link>
        )}
      </section>

      <section className="split">
        <div className="main">
          <h2 className="k">Noticeboard</h2>
          {posts.length === 0 && <p className="m">Nothing posted yet.</p>}
          <div className="rows">
            {posts.map((p) => (
              <div key={p.id} className="row" style={{ display: "block" }}>
                <p className="k small m">{fmtDateTime(p.created_at)}</p>
                <h2 style={{ margin: "4px 0" }}>{p.title}</h2>
                <p className="prose" style={{ margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="side">
          <h2 className="k">Quick links</h2>
          <Link href="/library">Policies and procedures</Link>
          <Link href="/leave">Request leave</Link>
          <Link href="/inbox">New task</Link>
          <Link href="/supervision">Supervision agenda</Link>
        </div>
      </section>
    </main>
  );
}
