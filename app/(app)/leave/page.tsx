import { requireUser } from "@/lib/session";
import { sql } from "@/lib/db";
import { fmtDate, todayISO } from "@/lib/format";
import { requestLeave, decideLeave, cancelLeave } from "./actions";

type Req = { id: number; email: string; name: string; kind: string; start_date: string; end_date: string; note: string; status: string };

function range(r: Req) {
  return r.start_date === r.end_date ? fmtDate(r.start_date) : `${fmtDate(r.start_date)} to ${fmtDate(r.end_date)}`;
}

export default async function Leave() {
  const me = await requireUser();
  const isAdmin = me.role === "admin";
  const mine = await sql<Req>`select l.id, l.email, p.name, l.kind, l.start_date::text, l.end_date::text, l.note, l.status
    from leave_requests l join people p on p.email = l.email where l.email = ${me.email} order by l.start_date desc limit 30`;
  const pending = isAdmin
    ? await sql<Req>`select l.id, l.email, p.name, l.kind, l.start_date::text, l.end_date::text, l.note, l.status
        from leave_requests l join people p on p.email = l.email where l.status = 'pending' order by l.start_date`
    : [];
  const upcoming = isAdmin
    ? await sql<Req>`select l.id, l.email, p.name, l.kind, l.start_date::text, l.end_date::text, l.note, l.status
        from leave_requests l join people p on p.email = l.email where l.status = 'approved' and l.end_date >= ${todayISO()} order by l.start_date limit 30`
    : [];
  return (
    <main className="wrap">
      <section style={{ display: "flex", flexWrap: "wrap", gap: "16px 48px", justifyContent: "space-between", alignItems: "flex-end" }}>
        <h1>Leave</h1>
        <p className="m" style={{ maxWidth: 420 }}>Ask here and Caitlin gets it straight away. If you have clients booked, the studio manager will move them. Balances and pay stay in Xero.</p>
      </section>
      <section className="split">
        <div className="main">
          {isAdmin && (
            <>
              <h2 className="k">Waiting for you</h2>
              {pending.length === 0 && <p className="m">Nothing waiting.</p>}
              <div className="rows">
                {pending.map((r) => (
                  <div key={r.id} className="row">
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span>{r.name || r.email} · {r.kind}</span>
                      <span className="m small">{range(r)}{r.note ? ` · ${r.note}` : ""}</span>
                    </div>
                    <form action={decideLeave} style={{ display: "flex", gap: 8 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="btn" name="decision" value="approved" type="submit">Approve</button>
                      <button className="btn ghost" name="decision" value="declined" type="submit">Decline</button>
                    </form>
                  </div>
                ))}
              </div>
              <h2 className="k" style={{ marginTop: 16 }}>Coming up</h2>
              {upcoming.length === 0 && <p className="m">No approved leave coming up.</p>}
              <div className="rows">
                {upcoming.map((r) => (
                  <div key={r.id} className="row"><span>{r.name || r.email} · {r.kind}</span><span className="m small">{range(r)}</span></div>
                ))}
              </div>
            </>
          )}
          <h2 className="k" style={{ marginTop: isAdmin ? 16 : 0 }}>Your requests</h2>
          {mine.length === 0 && <p className="m">No requests yet.</p>}
          <div className="rows">
            {mine.map((r) => (
              <div key={r.id} className="row">
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span>{r.kind}</span>
                  <span className="m small">{range(r)}</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span className={r.status === "pending" ? "k flag" : "k m"}>{r.status}</span>
                  {r.status === "pending" && (
                    <form action={cancelLeave}><input type="hidden" name="id" value={r.id} /><button className="btn link" type="submit">Cancel</button></form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="side">
          <form action={requestLeave} className="card stack">
            <p className="k">Request leave or PD</p>
            <label><span className="small m">Type</span>
              <select name="kind"><option>Annual leave</option><option>Together Wellness day</option><option>Personal leave</option><option>PD course or conference</option></select>
            </label>
            <label><span className="small m">From</span><input type="date" name="start" required /></label>
            <label><span className="small m">To</span><input type="date" name="end" /></label>
            <label><span className="small m">Note</span><textarea name="note" rows={3} /></label>
            <div><button className="btn" type="submit">Send request</button></div>
          </form>
        </aside>
      </section>
    </main>
  );
}
