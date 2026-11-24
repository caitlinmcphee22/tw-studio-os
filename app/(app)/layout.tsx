import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { requireUser, firstName } from "@/lib/session";
import { logout } from "@/app/signin/actions";
import { missingConfig } from "@/lib/setup";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (missingConfig().length) redirect("/signin");
  const me = await requireUser();
  return (
    <>
      <header className="top">
        <Link href="/" className="mark">Together Wellness</Link>
        <Nav admin={me.role === "admin"} />
        <form
          action={logout}
          style={{ display: "flex", alignItems: "center", gap: 12 }}
        >
          <span className="k">{firstName(me)}</span>
          <button className="btn link" type="submit">Sign out</button>
        </form>
      </header>
      {children}
      <footer className="foot">
        Together Wellness acknowledges the Whadjuk Noongar people as the traditional owners of the land where we live, learn and work.
      </footer>
    </>
  );
}
