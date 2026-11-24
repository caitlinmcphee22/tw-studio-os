"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, requireAdmin } from "@/lib/session";
import { sql, audit } from "@/lib/db";
import { str } from "@/lib/format";

export async function acknowledge(form: FormData) {
  const me = await requireUser();
  const id = Number(form.get("id"));
  const [doc] = await sql<{ version: number }>`select version from documents where id = ${id}`;
  if (!doc) return;
  await sql`insert into acknowledgements (doc_id, version, email) values (${id}, ${doc.version}, ${me.email}) on conflict do nothing`;
  await audit(me.email, "acknowledged", `doc ${id} v${doc.version}`);
  revalidatePath(`/library/${id}`);
  revalidatePath("/library");
}

export async function saveDoc(form: FormData) {
  const me = await requireAdmin();
  const id = Number(form.get("id")) || 0;
  const title = str(form.get("title"), 200);
  const category = str(form.get("category"), 100) || "Policies and procedures";
  const body = str(form.get("body"), 100000);
  const owner = str(form.get("owner"), 100);
  const requiresAck = form.get("requires_ack") === "on";
  const bump = form.get("bump") === "on";
  if (!title) return;
  if (id) {
    await sql`update documents set title = ${title}, category = ${category}, body = ${body}, owner = ${owner},
      requires_ack = ${requiresAck}, version = version + ${bump ? 1 : 0}, updated_at = now(), updated_by = ${me.email}
      where id = ${id}`;
    if (bump && requiresAck) {
      await sql`insert into announcements (title, body, created_by) values (${"Updated: " + title}, ${"Please read the new version in the library and acknowledge it."}, ${me.email})`;
    }
    await audit(me.email, "doc saved", `doc ${id}${bump ? " new version" : ""}`);
    revalidatePath("/library");
    redirect(`/library/${id}`);
  }
  const [row] = await sql<{ id: number }>`insert into documents (title, category, body, owner, requires_ack, updated_by)
    values (${title}, ${category}, ${body}, ${owner}, ${requiresAck}, ${me.email}) returning id`;
  await audit(me.email, "doc created", `doc ${row.id}`);
  revalidatePath("/library");
  redirect(`/library/${row.id}`);
}
