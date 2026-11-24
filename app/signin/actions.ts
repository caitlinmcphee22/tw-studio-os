"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sql, audit } from "@/lib/db";
import { hashSecret, checkSecret, ensureAuthTables, getSetting, setSetting, signSession, SESSION_HOURS } from "@/lib/secure";
import { COOKIE } from "@/lib/session";
import { allowedDomain } from "@/lib/setup";
import { str } from "@/lib/format";

function validEmail(email: string): boolean {
  const d = allowedDomain();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return d ? email.endsWith("@" + d) : true;
}

async function startSession(email: string) {
  const jar = await cookies();
  jar.set(COOKIE, await signSession(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function setupStudio(form: FormData) {
  if (await getSetting("studio_passcode")) redirect("/signin");
  const name = str(form.get("name"), 120);
  const email = str(form.get("email"), 200).toLowerCase();
  const passcode = str(form.get("passcode"), 200);
  const owner = str(form.get("owner"), 200);
  if (!name || !validEmail(email)) redirect("/signin?error=email");
  if (passcode.length < 8 || owner.length < 10 || passcode === owner) redirect("/signin?error=weak");
  await setSetting("studio_passcode", hashSecret(passcode));
  await sql`insert into people (email, name, role, pin_hash, last_seen) values (${email}, ${name}, 'admin', ${hashSecret(owner)}, now())
    on conflict (email) do update set name = excluded.name, role = 'admin', pin_hash = excluded.pin_hash, active = true`;
  await audit(email, "studio set up");
  await startSession(email);
  redirect("/");
}

export async function login(form: FormData) {
  const email = str(form.get("email"), 200).toLowerCase();
  const name = str(form.get("name"), 120);
  const secret = str(form.get("secret"), 200);
  if (!validEmail(email)) redirect("/signin?error=email");
  await ensureAuthTables();
  const [{ n: fails }] = await sql<{ n: number }>`select count(*)::int as n from audit_log
    where email = ${email} and action = 'login failed' and at > now() - interval '15 minutes'`;
  if (fails >= 8) redirect("/signin?error=locked");
  const [person] = await sql<{ email: string; role: string; active: boolean; pin_hash: string | null }>`
    select email, role, active, pin_hash from people where email = ${email}`;
  const studio = await getSetting("studio_passcode");
  let ok = false;
  if (person?.role === "admin") ok = checkSecret(secret, person.pin_hash);
  else ok = checkSecret(secret, studio);
  if (!ok) {
    await audit(email, "login failed");
    redirect(person?.role === "admin" ? "/signin?error=owner" : "/signin?error=passcode");
  }
  if (person && !person.active) redirect("/signin?error=inactive");
  if (!person) {
    if (!name) redirect(`/signin?error=name&email=${encodeURIComponent(email)}`);
    await sql`insert into people (email, name, role) values (${email}, ${name}, 'staff') on conflict do nothing`;
  }
  await audit(email, "signed in");
  await startSession(email);
  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect("/signin");
}
