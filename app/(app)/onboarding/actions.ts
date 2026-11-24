"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { sql, audit } from "@/lib/db";
import { str } from "@/lib/format";

export async function toggleItem(form: FormData) {
  const me = await requireUser();
  const person = str(form.get("person"), 200).toLowerCase() || me.email;
  const itemId = Number(form.get("item"));
  if (!Number.isInteger(itemId)) return;
  if (person !== me.email && me.role !== "admin") {
    const [p] = await sql<{ supervisor_email: string | null }>`select supervisor_email from people where email = ${person}`;
    if (p?.supervisor_email !== me.email) return;
  }
  const existing = await sql`select 1 from onboarding_progress where email = ${person} and item_id = ${itemId}`;
  if (existing.length) {
    await sql`delete from onboarding_progress where email = ${person} and item_id = ${itemId}`;
  } else {
    await sql`insert into onboarding_progress (email, item_id, done_by) values (${person}, ${itemId}, ${me.email})`;
  }
  await audit(me.email, "onboarding", `${person} item ${itemId}`);
  revalidatePath("/onboarding");
}
