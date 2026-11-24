"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items: [string, string][] = [
    ["/", "Home"],
    ["/inbox", "Inbox"],
    ["/onboarding", "Onboarding"],
    ["/library", "Library"],
    ["/supervision", "Supervision"],
    ["/leave", "Leave"],
  ];
  if (admin) items.push(["/team", "Team"]);
  return (
    <nav aria-label="Studio OS" className="nav k">
      {items.map(([href, label]) => {
        const on = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={on ? "page" : undefined}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
