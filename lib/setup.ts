export function missingConfig(): string[] {
  const m: string[] = [];
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) m.push("Database (connect Neon Postgres in Vercel Storage)");
  return m;
}

export function allowedDomain(): string {
  return (process.env.ALLOWED_DOMAIN || "").toLowerCase().trim();
}
