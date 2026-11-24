import { scryptSync, randomBytes, timingSafeEqual, createHmac } from "crypto";
import { sql } from "@/lib/db";

export function hashSecret(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 32).toString("hex");
  return `${salt}:${hash}`;
}

export function checkSecret(plain: string, stored: string | null | undefined): boolean {
  if (!stored || !plain) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(plain, salt, 32);
  const real = Buffer.from(hash, "hex");
  return real.length === test.length && timingSafeEqual(real, test);
}

let extra: Promise<void> | null = null;

/** Tables added for passcode sign-in. Safe to run repeatedly. */
export function ensureAuthTables(): Promise<void> {
  if (!extra) {
    extra = (async () => {
      await sql`create table if not exists settings (key text primary key, value text not null)`;
      await sql`alter table people add column if not exists pin_hash text`;
    })().catch((e) => {
      extra = null;
      throw e;
    });
  }
  return extra;
}

export async function getSetting(key: string): Promise<string | null> {
  await ensureAuthTables();
  const [row] = await sql<{ value: string }>`select value from settings where key = ${key}`;
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await ensureAuthTables();
  await sql`insert into settings (key, value) values (${key}, ${value}) on conflict (key) do update set value = excluded.value`;
}

async function sessionKey(): Promise<string> {
  let key = await getSetting("session_secret");
  if (!key) {
    key = randomBytes(32).toString("hex");
    await sql`insert into settings (key, value) values ('session_secret', ${key}) on conflict (key) do nothing`;
    key = (await getSetting("session_secret")) as string;
  }
  return key;
}

const HOURS = 12;

export async function signSession(email: string): Promise<string> {
  const exp = Date.now() + HOURS * 3600 * 1000;
  const body = Buffer.from(JSON.stringify({ email, exp })).toString("base64url");
  const mac = createHmac("sha256", await sessionKey()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export async function readSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expect = createHmac("sha256", await sessionKey()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { email, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof email !== "string" || typeof exp !== "number" || exp < Date.now()) return null;
    return email;
  } catch {
    return null;
  }
}

export const SESSION_HOURS = HOURS;
