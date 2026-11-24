"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { sql, audit } from "@/lib/db";
import { relation } from "@/lib/access";
import { str } from "@/lib/format";

export async function addAgenda(form: FormData) {
  const me = await requireUser();
  const person = str(form.get("person"), 200);
  const text = str(form.get("text"), 1000);
  if (!text || !(await relation(me, person)).view) return;
  await sql`insert into agenda_items (supervisee_email, text, created_by) values (${person}, ${text}, ${me.email})`;
  revalidatePath("/supervision");
}

export async function toggleAgenda(form: FormData) {
  const me = await requireUser();
  const id = Number(form.get("id"));
  const [a] = await sql<{ supervisee_email: string }>`select supervisee_email from agenda_items where id = ${id}`;
  if (!a || !(await relation(me, a.supervisee_email)).view) return;
  await sql`update agenda_items set done = not done where id = ${id}`;
  revalidatePath("/supervision");
}

export async function addSession(form: FormData) {
  const me = await requireUser();
  const person = str(form.get("person"), 200);
  const date = str(form.get("date"), 10);
  const notes = str(form.get("notes"), 20000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(await relation(me, person)).supervise) return;
  await sql`insert into supervision_sessions (supervisee_email, supervisor_email, session_date, notes) values (${person}, ${me.email}, ${date}, ${notes})`;
  await audit(me.email, "supervision session", `${person} ${date}`);
  revalidatePath("/supervision");
}

export async function toggleSignoff(form: FormData) {
  const me = await requireUser();
  const id = Number(form.get("id"));
  const [s] = await sql<{ supervisee_email: string; done_at: string | null }>`select supervisee_email, done_at from signoffs where id = ${id}`;
  if (!s || !(await relation(me, s.supervisee_email)).supervise) return;
  if (s.done_at) await sql`update signoffs set done_at = null, done_by = null where id = ${id}`;
  else await sql`update signoffs set done_at = now(), done_by = ${me.email} where id = ${id}`;
  await audit(me.email, "sign-off", `${s.supervisee_email} item ${id}`);
  revalidatePath("/supervision");
}
