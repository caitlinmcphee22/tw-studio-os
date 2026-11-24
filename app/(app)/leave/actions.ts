"use server";
import { revalidatePath } from "next/cache";
import { requireUser, requireAdmin } from "@/lib/session";
import { sql, audit } from "@/lib/db";
import { str } from "@/lib/format";

const KINDS = ["Annual leave", "Together Wellness day", "Personal leave", "PD course or conference"];

export async function requestLeave(form: FormData) {
  const me = await requireUser();
  const kind = str(form.get("kind"), 60);
  const start = str(form.get("start"), 10);
  const end = str(form.get("end"), 10) || start;
  const note = str(form.get("note"), 2000);
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!KINDS.includes(kind) || !iso.test(start) || !iso.test(end) || end < start) return;
  await sql`insert into leave_requests (email, kind, start_date, end_date, note) values (${me.email}, ${kind}, ${start}, ${end}, ${note})`;
  await audit(me.email, "leave requested", `${kind} ${start} to ${end}`);
  revalidatePath("/leave");
}

export async function decideLeave(form: FormData) {
  const me = await requireAdmin();
  const id = Number(form.get("id"));
  const decision = form.get("decision") === "approved" ? "approved" : "declined";
  await sql`update leave_requests set status = ${decision}, decided_by = ${me.email}, decided_at = now() where id = ${id} and status = 'pending'`;
  await audit(me.email, "leave " + decision, `request ${id}`);
  revalidatePath("/leave");
}

export async function cancelLeave(form: FormData) {
  const me = await requireUser();
  const id = Number(form.get("id"));
  await sql`update leave_requests set status = 'cancelled' where id = ${id} and email = ${me.email} and status = 'pending'`;
  revalidatePath("/leave");
}
