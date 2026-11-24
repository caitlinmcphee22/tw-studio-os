import Link from "next/link";
import { requireUser } from "@/lib/session";
import { sql } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { createTask, toggleTask, postAnnouncement } from "./actions";
import { QUEUES } from "@/lib/constants";

type Task = { id: number; title: string; detail: string; queue: string; assignee_email: string | null; assignee: string | null; creator: string | null; due: string | null; status: string };

export default async function Inbox({ searchParams }: { searchParams: Promise<{ q?: string; s?: string }> }) {
  const me = await requireUser();
  const { q = "mine", s = "open" } = await searchParams;
  const status = s === "done" ? "done" : "open";
  const people = await sql<{ email: string; name: string }>`select email, name from people where active order by name`;
  const all = await sql<Task>`
    select t.id, t.title, t.detail, t.queue, t.assignee_email, a.name as assignee, c.name as creator, t.due::text, t.status
    from tasks t left join people a on a.email = t.assignee_email left join people c on c.email = t.created_by
    where t.status = ${status} order by t.due nulls last, t.created_at desc limit 200`;
  const tasks = all.filter((t) =>
    q === "mine" ? t.assignee_email === me.email :
    q === "unassigned" ? !t.assignee_email :
    q === "all" ? true : t.queue === q);
  const tabs: [string, string][] = [["mine", "Yours"], ["unassigned", "Unassigned"], ...QUEUES.map((x) => [x, x] as [string, string]), ["all", "All"]];
  const link = (nq: string, ns: string) => `/inbox?q=${encodeURIComponent(nq)}&s=${ns}`;
  return (
    <main className="wrap">
      <h1>Inbox</h1>
      <section className="split">
        <div className="main">
          <nav className="tabs" aria-label="Queues">
            {tabs.map(([id, label]) => <Link key={id} href={link(id, status)} aria-current={q === id ? "page" : undefined}>{label}</Link>)}
          </nav>
          <div style={{ display: "flex", gap: 18 }} className="k">
            <Link href={link(q, "open")} aria-current={status === "open" ? "page" : undefined}>Open</Link>
            <Link href={link(q, "done")} aria-current={status === "done" ? "page" : undefined}>Done</Link>
          </div>
          {tasks.length === 0 && <p className="m">Nothing here.</p>}
          <div className="rows">
            {tasks.map((t) => (
              <div key={t.id} className="row">
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: "1 1 320px" }}>
                  <span>{t.title}</span>
                  <span className="m small">{t.queue}{t.assignee ? ` · ${t.assignee}` : " · unassigned"}{t.creator ? ` · from ${t.creator}` : ""}</span>
                  {t.detail && <span className="small prose">{t.detail}</span>}
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {t.due && <span className="k">{fmtDate(t.due)}</span>}
                  <form action={toggleTask}><input type="hidden" name="id" value={t.id} /><button className="btn link" type="submit">{t.status === "open" ? "Done" : "Reopen"}</button></form>
                </div>
              </div>
            ))}
          </div>
        </div>
        <aside className="side">
          <form action={createTask} className="card stack">
            <p className="k">New task</p>
            <label><span className="small m">What needs doing</span><input name="title" required /></label>
            <label><span className="small m">Detail. Initials only for clients.</span><textarea name="detail" rows={3} /></label>
            <label><span className="small m">Queue</span><select name="queue">{QUEUES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label><span className="small m">For</span>
              <select name="assignee" defaultValue=""><option value="">Unassigned</option>{people.map((p) => <option key={p.email} value={p.email}>{p.name || p.email}</option>)}</select>
            </label>
            <label><span className="small m">Due</span><input type="date" name="due" /></label>
            <div><button className="btn" type="submit">Add task</button></div>
          </form>
          {me.role === "admin" && (
            <form action={postAnnouncement} className="card stack" style={{ background: "var(--stone)" }}>
              <p className="k">Post to the noticeboard</p>
              <label><span className="small m">Headline</span><input name="title" required /></label>
              <label><span className="small m">Message</span><textarea name="body" rows={3} /></label>
              <div><button className="btn" type="submit">Post</button></div>
            </form>
          )}
        </aside>
      </section>
    </main>
  );
}
