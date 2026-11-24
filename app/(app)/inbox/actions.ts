"use server";
import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/session";
import { sql, audit } from "@/lib/db";
import { str } from "@/lib/format";

import { QUEUES } from "@/lib/constants";

export async function createTask(form: FormData) {
  const me = await requireUser();
  const title = str(form.get("title"), 300);
  const detail = str(form.get("detail"), 4000);
  const queue = QUEUES.includes(str(form.get("queue"), 60)) ? str(form.get("queue"), 60) : "General";
  const assignee = str(form.get("assignee"), 200) || null;
  const due = str(form.get("due"), 10);
  if (!title) return;
  await sql`insert into tasks (title, detail, queue, assignee_email, created_by, due)
    values (${title}, ${detail}, ${queue}, ${assignee}, ${me.email}, ${/^\d{4}-\d{2}-\d{2}$/.test(due) ? due : null})`;
  await audit(me.email, "task created", title.slice(0, 80));
  revalidatePath("/inbox");
}

export async function toggleTask(form: FormData) {
  const me = await requireUser();
  const id = Number(form.get("id"));
  await sql`update tasks set status = case when status = 'open' then 'done' else 'open' end,
    closed_at = case when status = 'open' then now() else null end where id = ${id}`;
  await audit(me.email, "task toggled", `task ${id}`);
  revalidatePath("/inbox");
}

export async function postAnnouncement(form: FormData) {
  const me = await requireAdmin();
  const title = str(form.get("title"), 200);
  const body = str(form.get("body"), 4000);
  if (!title) return;
  await sql`insert into announcements (title, body, created_by) values (${title}, ${body}, ${me.email})`;
  await audit(me.email, "announcement", title.slice(0, 80));
  revalidatePath("/");
  revalidatePath("/inbox");
}
