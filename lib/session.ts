import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sql, audit } from "@/lib/db";
import { readSession } from "@/lib/secure";

export type Person = {
  email: string;
  name: string;
  role: "admin" | "staff";
  title: string;
  supervisor_email: string | null;
  active: boolean;
};

export const COOKIE = "tw_session";

export async function requireUser(): Promise<Person> {
  const jar = await cookies();
  const email = await readSession(jar.get(COOKIE)?.value);
  if (!email) redirect("/signin");
  const rows = await sql<Person>`
    update people set last_seen = now() where email = ${email}
    returning email, name, role, title, supervisor_email, active`;
  const me = rows[0];
  if (!me) redirect("/signin");
  if (!me.active) redirect("/signin?error=inactive");
  return me;
}

export async function requireAdmin(): Promise<Person> {
  const me = await requireUser();
  if (me.role !== "admin") {
    await audit(me.email, "denied", "admin page");
    redirect("/");
  }
  return me;
}

export function firstName(p: Person): string {
  return (p.name || p.email).split(" ")[0];
}
