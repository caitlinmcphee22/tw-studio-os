"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { sql, audit } from "@/lib/db";
import { hashSecret, setSetting, ensureAuthTables } from "@/lib/secure";
import { allowedDomain } from "@/lib/setup";
import { str } from "@/lib/format";

export async function savePerson(form: FormData) {
  const me = await requireAdmin();
  const email = str(form.get("email"), 200).toLowerCase();
  const name = str(form.get("name"), 120);
  const title = str(form.get("title"), 160);
  const role = form.get("role") === "admin" ? "admin" : "staff";
  const supervisor = str(form.get("supervisor"), 200) || null;
  const active = form.get("active") !== "off";
  const ownerPw = str(form.get("owner_password"), 200);
  const domain = allowedDomain();
  if (!email || (domain && !email.endsWith("@" + domain))) redirect("/team?error=email");
  if (email === me.email && (role !== "admin" || !active)) redirect("/team?error=self");
  await ensureAuthTables();
  const [existing] = await sql<{ pin_hash: string | null }>`select pin_hash from people where email = ${email}`;
  if (role === "admin" && !existing?.pin_hash && ownerPw.length < 10) redirect("/team?error=pw");
  if (ownerPw && ownerPw.length < 10) redirect("/team?error=pw");
  const pin = role === "admin" ? (ownerPw ? hashSecret(ownerPw) : existing?.pin_hash ?? null) : null;
  await sql`insert into people (email, name, title, role, supervisor_email, active, pin_hash)
    values (${email}, ${name}, ${title}, ${role}, ${supervisor}, ${active}, ${pin})
    on conflict (email) do update set name = excluded.name, title = excluded.title, role = excluded.role,
      supervisor_email = excluded.supervisor_email, active = excluded.active, pin_hash = excluded.pin_hash`;
  await audit(me.email, "person saved", `${email} ${role}${active ? "" : " inactive"}${ownerPw ? " password set" : ""}`);
  revalidatePath("/team");
  redirect("/team?saved=1");
}

export async function changePasscode(form: FormData) {
  const me = await requireAdmin();
  const passcode = str(form.get("passcode"), 200);
  if (passcode.length < 8) redirect("/team?error=passcode");
  await setSetting("studio_passcode", hashSecret(passcode));
  await audit(me.email, "studio passcode changed");
  redirect("/team?saved=passcode");
}
