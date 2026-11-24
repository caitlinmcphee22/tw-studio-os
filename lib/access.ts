import { sql } from "@/lib/db";
import type { Person } from "@/lib/session";

/** Can `me` see `email`'s supervision, onboarding or leave? */
export async function relation(me: Person, email: string): Promise<{ view: boolean; supervise: boolean }> {
  if (me.role === "admin") return { view: true, supervise: true };
  if (email === me.email) return { view: true, supervise: false };
  const [p] = await sql<{ supervisor_email: string | null }>`select supervisor_email from people where email = ${email}`;
  const sup = p?.supervisor_email === me.email;
  return { view: sup, supervise: sup };
}
