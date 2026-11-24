import Link from "next/link";
import { requireUser } from "@/lib/session";
import { sql, SIGNOFF_DEFAULTS } from "@/lib/db";
import { relation } from "@/lib/access";
import { fmtDate, todayISO } from "@/lib/format";
import { addAgenda, toggleAgenda, addSession, toggleSignoff } from "./actions";

export default async function Supervision({ searchParams }: { searchParams: Promise<{ person?: string }> }) {
  const me = await requireUser();
  const { person: asked } = await searchParams;
  const people = me.role === "admin"
    ? await sql<{ email: string; name: string; title: string }>`select email, name, title from people where active order by name`
    : await sql<{ email: string; name: string; title: string }>`select email, name, title from people where active and (email = ${me.email} or supervisor_email = ${me.email}) order by name`;
  const supervisees = people.filter((p) => p.email !== me.email);
  const defaultPerson = supervisees[0]?.email || me.email;
  const person = asked && people.some((p) => p.email === asked) ? asked : defaultPerson;
  const rel = await relation(me, person);
  const who = people.find((p) => p.email === person);
  const today = todayISO();

  let signoffs = await sql<{ id: number; label: string; done_at: string | null }>`select id, label, done_at from signoffs where supervisee_email = ${person} order by sort, id`;
  if (signoffs.length === 0) {
    let i = 0;
    for (const label of SIGNOFF_DEFAULTS) await sql`insert into signoffs (supervisee_email, label, sort) values (${person}, ${label}, ${i++})`;
    signoffs = await sql<{ id: number; label: string; done_at: string | null }>`select id, label, done_at from signoffs where supervisee_email = ${person} order by sort, id`;
  }
  const [agenda, sessions] = await Promise.all([
    sql<{ id: number; text: string; done: boolean }>`select id, text, done from agenda_items where supervisee_email = ${person} order by done, created_at`,
    sql<{ id: number; session_date: string; notes: string; supervisor_email: string }>`select id, session_date::text, notes, supervisor_email from supervision_sessions where supervisee_email = ${person} order by session_date desc limit 20`,
  ]);
  const upcoming = sessions.filter((s) => s.session_date >= today).sort((a, b) => a.session_date.localeCompare(b.session_date));
  const past = sessions.filter((s) => s.session_date < today);

  return (
    <main className="wrap">
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="k">{person === me.email ? "Your supervision" : who?.title || "Supervision"}</p>
        <h1>{person === me.email ? "Supervision" : who?.name || person}</h1>
      </section>
      {people.length > 1 && (
        <nav className="tabs" aria-label="Person">
          {people.map((p) => (
            <Link key={p.email} href={`/supervision?person=${encodeURIComponent(p.email)}`} aria-current={p.email === person ? "page" : undefined}>
              {p.email === me.email ? "You" : p.name || p.email}
            </Link>
          ))}
        </nav>
      )}

      <section className="grid">
        <div className="card"><span className="k">Next session</span><span className="big">{upcoming[0] ? fmtDate(upcoming[0].session_date) : "Not booked"}</span></div>
        <div className="card"><span className="k">Signed off</span><span className="big">{signoffs.filter((s) => s.done_at).length} of {signoffs.length}</span></div>
        <div className="card"><span className="k">Agenda items</span><span className="big">{agenda.filter((a) => !a.done).length}</span></div>
      </section>

      <section className="split">
        <div className="main">
          <h2 className="k">Sign-off</h2>
          <div className="rows">
            {signoffs.map((s) => (
              <form key={s.id} action={toggleSignoff} className="row">
                <input type="hidden" name="id" value={s.id} />
                <span>{s.label}</span>
                {rel.supervise ? (
                  <button className="btn link" type="submit">{s.done_at ? `Done ${fmtDate(s.done_at)}` : "Mark done"}</button>
                ) : (
                  <span className={s.done_at ? "k m" : "k flag"}>{s.done_at ? "Done" : "Not yet"}</span>
                )}
              </form>
            ))}
          </div>

          {rel.supervise && (
            <form action={addSession} className="card stack" style={{ marginTop: 12 }}>
              <p className="k">Log or book a session</p>
              <input type="hidden" name="person" value={person} />
              <label><span className="small m">Date</span><input type="date" name="date" required defaultValue={today} /></label>
              <label><span className="small m">Notes. Use initials only for any client you discuss; clinical detail belongs in Cliniko.</span><textarea name="notes" rows={5} /></label>
              <div><button className="btn" type="submit">Save session</button></div>
            </form>
          )}

          <h2 className="k" style={{ marginTop: 16 }}>Session log</h2>
          {past.length === 0 && upcoming.length === 0 && <p className="m">No sessions yet.</p>}
          <div className="rows">
            {[...upcoming, ...past].map((s) => (
              <div key={s.id} className="row" style={{ display: "block" }}>
                <p className="k">{fmtDate(s.session_date)}{s.session_date >= today ? " · booked" : ""}</p>
                {s.notes && <p className="prose" style={{ margin: "6px 0 0" }}>{s.notes}</p>}
              </div>
            ))}
          </div>
        </div>

        <aside className="side">
          <h2 className="k">Agenda for next session</h2>
          <form action={addAgenda} className="stack">
            <input type="hidden" name="person" value={person} />
            <label><span className="small m">Either of you can add to this. Bring one case you're unsure about.</span><textarea name="text" rows={3} required /></label>
            <div><button className="btn" type="submit">Add</button></div>
          </form>
          <div className="rows">
            {agenda.map((a) => (
              <form key={a.id} action={toggleAgenda} className="row">
                <input type="hidden" name="id" value={a.id} />
                <span style={{ textDecoration: a.done ? "line-through" : "none", color: a.done ? "var(--muted)" : "inherit", flex: 1 }}>{a.text}</span>
                <button className="btn link" type="submit">{a.done ? "Reopen" : "Covered"}</button>
              </form>
            ))}
          </div>
          <div className="note">
            <p className="k">How we use supervision</p>
            <p style={{ margin: 0 }}>Mistakes come here to be learned from, not counted.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}
