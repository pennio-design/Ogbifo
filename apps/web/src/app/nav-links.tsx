"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home" },
  { href: "/reading-room", label: "Reading Room" },
  { href: "/decks", label: "Decks" },
  { href: "/language-map", label: "Language Map" },
  { href: "/community", label: "Community" },
  { href: "/profile", label: "Profile" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-bone/10 bg-clay pb-[env(safe-area-inset-bottom)] md:static md:border-0 md:bg-transparent md:pb-0"
    >
      <ul className="mx-auto flex max-w-6xl justify-between gap-1 px-2 md:justify-end md:gap-6 md:px-0">
        {ITEMS.map(({ href, label }) => {
          const current = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-12 break-normal items-center justify-center px-1 text-center font-ui text-[11px] leading-tight tracking-wide md:min-h-0 md:py-2 md:text-sm ${
                  current ? "text-ochre md:border-b md:border-ochre" : "text-ash hover:text-bone"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
