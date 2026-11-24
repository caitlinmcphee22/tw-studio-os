const TZ = "Australia/Perth";

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00+08:00" : d) : d;
  return date.toLocaleDateString("en-AU", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-AU", { timeZone: TZ, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function todayLong(): string {
  return new Date().toLocaleDateString("en-AU", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
}

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function greeting(): string {
  const h = Number(new Date().toLocaleString("en-AU", { timeZone: TZ, hour: "numeric", hour12: false }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function str(v: FormDataEntryValue | null, max = 4000): string {
  return (typeof v === "string" ? v : "").trim().slice(0, max);
}
