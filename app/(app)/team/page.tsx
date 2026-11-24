import { requireAdmin } from "@/lib/session";
import { sql } from "@/lib/db";
import { fmtDateTime } from "@/lib/format";
import { savePerson, changePasscode } from "./actions";

type P = { email: string; name: string; title: string; role: string; supervisor_email: string | null; active: boolean; last_seen: string | null };

function PersonForm({ p, people }: { p?: P; people: P[] }) {
  return (
    <form action={savePerson} className="card stack" style={p ? { background: "transparent", border: "1px solid var(--rule)" } : undefined}>
      {p ? <input type="hidden" name="email" value={p.email} /> : <label><span className="small m">Work email</span><input name="email" type="email" required /></label>}
      {p && <p className="k">{p.email}{p.last_seen ? ` · last in ${fmtDateTime(p.last_seen)}` : " · not signed in yet"}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <label><span className="small m">Name</span><input name="name" defaultValue={p?.name} /></label>
        <label><span className="small m">Title</span><input name="title" defaultValue={p?.title} /></label>
        <label><span className="small m">Access</span>
          <select name="role" defaultValue={p?.role || "staff"}><option value="staff">Staff</option><option value="admin">Owner or manager</option></select>
        </label>
        <label><span className="small m">Supervisor</span>
          <select name="supervisor" defaultValue={p?.supervisor_email || ""}>
            <option value="">None</option>
            {people.filter((x) => x.email !== p?.email).map((x) => <option key={x.email} value={x.email}>{x.name || x.email}</option>)}
          </select>
        </label>
        <label><span className="small m">Owner password{p?.role === "admin" ? " (leave blank to keep)" : ", only for owner access"}</span><input name="owner_password" type="password" minLength={10} autoComplete="new-password" /></label>
        <label><span className="small m">Status</span>
          <select name="active" defaultValue={p && !p.active ? "off" : "on"}><option value="on">Active</option><option value="off">Access off</option></select>
        </label>
      </div>
      <div><button className="btn" type="submit">{p ? "Save" : "Add person"}</button></div>
    </form>
  );
}

const ERRORS: Record<string, string> = {
  email: "Use a Together Wellness email address.",
  self: "You can't remove your own owner access or switch yourself off.",
  pw: "Owner access needs an owner password of at least 10 characters.",
  passcode: "The studio passcode needs at least 8 characters.",
};

export default async function Team({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  await requireAdmin();
  const { error, saved } = await searchParams;
  const people = await sql<P>`select email, name, title, role, supervisor_email, active, last_seen from people order by active desc, name`;
  const log = await sql<{ id: number; email: string; action: string; detail: string; at: string }>`select id, email, action, detail, at from audit_log order by at desc limit 60`;
  return (
    <main className="wrap">
      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p className="k">Owners and managers only</p>
        <h1>Team</h1>
        <p className="m" style={{ maxWidth: 640 }}>Anyone with a Together Wellness email and the studio passcode can sign in as staff. Set their title, supervisor and access here. Switching access off stops them signing in. Owners sign in with their own owner password.</p>
        {error && <p className="flag" role="alert">{ERRORS[error] || "That didn't save."}</p>}
        {saved && <p className="m" role="status">{saved === "passcode" ? "Studio passcode changed. Let the team know the new one." : "Saved."}</p>}
      </section>
      <section className="split">
        <div className="main">
          {people.map((p) => <PersonForm key={p.email} p={p} people={people} />)}
        </div>
        <aside className="side">
          <PersonForm people={people} />
          <form action={changePasscode} className="card stack" style={{ background: "var(--stone)" }}>
            <p className="k">Studio passcode</p>
            <p className="m small" style={{ margin: 0 }}>Change it when someone leaves. Everyone already signed in stays signed in until their session ends.</p>
            <label><span className="small m">New passcode</span><input name="passcode" type="password" required minLength={8} autoComplete="new-password" /></label>
            <div><button className="btn" type="submit">Change passcode</button></div>
          </form>
          <h2 className="k" style={{ marginTop: 12 }}>Activity log</h2>
          <div className="rows small">
            {log.map((l) => (
              <div key={l.id} className="row" style={{ display: "block", padding: "8px 0" }}>
                <span className="m">{fmtDateTime(l.at)}</span> · {l.email.split("@")[0]} · {l.action} {l.detail}
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
