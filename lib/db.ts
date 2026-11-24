import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;

let client: Sql | null = null;
let ready: Promise<void> | null = null;

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

function getClient(): Sql {
  if (!client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error("No database connected. Add DATABASE_URL in Vercel.");
    client = neon(url);
  }
  return client;
}

/** Run a query once the schema exists. Always use tagged templates so values are parameterised. */
export async function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  await ensureSchema();
  const c = getClient();
  return (await c(strings, ...values)) as T[];
}

const SCHEMA: string[] = [
  `create table if not exists people (
    email text primary key,
    name text not null default '',
    role text not null default 'staff',
    title text not null default '',
    supervisor_email text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    last_seen timestamptz
  )`,
  `create table if not exists onboarding_items (
    id serial primary key,
    stage int not null,
    label text not null,
    owner text not null default 'You',
    sort int not null default 0
  )`,
  `create table if not exists onboarding_progress (
    email text not null,
    item_id int not null references onboarding_items(id) on delete cascade,
    done_at timestamptz not null default now(),
    done_by text not null,
    primary key (email, item_id)
  )`,
  `create table if not exists documents (
    id serial primary key,
    category text not null,
    title text not null,
    body text not null default '',
    owner text not null default '',
    version int not null default 1,
    requires_ack boolean not null default false,
    updated_at timestamptz not null default now(),
    updated_by text
  )`,
  `create table if not exists acknowledgements (
    doc_id int not null references documents(id) on delete cascade,
    version int not null,
    email text not null,
    acked_at timestamptz not null default now(),
    primary key (doc_id, version, email)
  )`,
  `create table if not exists supervision_sessions (
    id serial primary key,
    supervisee_email text not null,
    supervisor_email text not null,
    session_date date not null,
    notes text not null default '',
    created_at timestamptz not null default now()
  )`,
  `create table if not exists agenda_items (
    id serial primary key,
    supervisee_email text not null,
    text text not null,
    created_by text not null,
    done boolean not null default false,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists signoffs (
    id serial primary key,
    supervisee_email text not null,
    label text not null,
    done_at timestamptz,
    done_by text,
    sort int not null default 0
  )`,
  `create table if not exists leave_requests (
    id serial primary key,
    email text not null,
    kind text not null,
    start_date date not null,
    end_date date not null,
    note text not null default '',
    status text not null default 'pending',
    decided_by text,
    decided_at timestamptz,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists tasks (
    id serial primary key,
    title text not null,
    detail text not null default '',
    queue text not null default 'General',
    assignee_email text,
    created_by text not null,
    due date,
    status text not null default 'open',
    created_at timestamptz not null default now(),
    closed_at timestamptz
  )`,
  `create table if not exists announcements (
    id serial primary key,
    title text not null,
    body text not null default '',
    created_by text not null,
    created_at timestamptz not null default now()
  )`,
  `create table if not exists audit_log (
    id bigserial primary key,
    email text not null,
    action text not null,
    detail text not null default '',
    at timestamptz not null default now()
  )`,
];

const ONBOARDING: [number, string, string][] = [
  [1, "Sign employment contract", "You"],
  [1, "AHPRA registration checked", "Studio Manager"],
  [1, "Working with Children Check on file", "You"],
  [1, "Professional indemnity insurance on file", "You"],
  [1, "First aid and CPR certificate on file", "You"],
  [1, "Bank, tax and super details in Xero", "You"],
  [2, "Studio induction and fire safety", "Studio Manager"],
  [2, "Reformer and Cadillac safety checks", "Caitlin"],
  [2, "Momence and Cliniko logins set up", "Studio Manager"],
  [2, "Read and acknowledge the Standards of Practice", "You"],
  [2, "Read the Employee Welcome Pack", "You"],
  [2, "Meet your supervisor and book fortnightly sessions", "You"],
  [3, "Observe 3 Group Reformer classes", "You"],
  [3, "Observe 2 Clinical Pilates sessions", "You"],
  [3, "Group class referral protocol walkthrough", "Supervisor"],
  [3, "First note audit, 5 notes", "Supervisor"],
  [4, "UP Edu Pilates training complete", "You"],
  [4, "5 observed classes signed off", "Supervisor"],
  [4, "Final competency sign-off", "Caitlin"],
  [4, "Three-month check-in and career pathway chat", "Caitlin"],
];

const DOCS: [string, string, boolean][] = [
  ["Policies and procedures", "Standards of Practice", true],
  ["Policies and procedures", "Documentation standard", true],
  ["Policies and procedures", "Incident reporting and just culture", true],
  ["Policies and procedures", "Cancellation and late arrival (12-hour policy)", true],
  ["Policies and procedures", "Privacy and client information", true],
  ["Policies and procedures", "Child safety and mandatory reporting", true],
  ["Clinical protocols", "Clinical Pilates: entry, ratio and progression", false],
  ["Clinical protocols", "Pre and postnatal: assessment before progression", false],
  ["Clinical protocols", "Group class referral protocol", true],
  ["Clinical protocols", "Hands-on cueing and consent", true],
  ["People and growth", "Employee Welcome Pack", false],
  ["People and growth", "Supervision and Mentoring Framework", false],
  ["People and growth", "Career Pathways", false],
  ["Brand and content", "AHPRA advertising checklist", true],
  ["Brand and content", "Brand guide", false],
];

export const SIGNOFF_DEFAULTS = [
  "UP Edu Pilates training complete",
  "Observed classes (5)",
  "Referral protocol in class",
  "Note audit, 5 notes",
  "Final competency sign-off",
];

async function migrate(): Promise<void> {
  const c = getClient();
  for (const stmt of SCHEMA) await c.query(stmt);
  const [{ n: items }] = (await c.query("select count(*)::int as n from onboarding_items")) as { n: number }[];
  if (items === 0) {
    let i = 0;
    for (const [stage, label, owner] of ONBOARDING) {
      await c.query("insert into onboarding_items (stage, label, owner, sort) values ($1,$2,$3,$4)", [stage, label, owner, i++]);
    }
  }
  const [{ n: docs }] = (await c.query("select count(*)::int as n from documents")) as { n: number }[];
  if (docs === 0) {
    for (const [category, title, ack] of DOCS) {
      await c.query(
        "insert into documents (category, title, body, owner, requires_ack) values ($1,$2,$3,'Caitlin',$4)",
        [category, title, "Draft. Paste the current version of this document here.", ack]
      );
    }
  }
}

export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = migrate().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

export async function audit(email: string, action: string, detail = ""): Promise<void> {
  try {
    await sql`insert into audit_log (email, action, detail) values (${email}, ${action}, ${detail})`;
  } catch {
    /* logging must never break a page */
  }
}
