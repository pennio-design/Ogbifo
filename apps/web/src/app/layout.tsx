import "./fonts.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@ogbifo/ui";
import { NavLinks } from "./nav-links";

export const metadata: Metadata = {
  title: { default: "Ogbifọ", template: "%s · Ogbifọ" },
  description: "Enter the language. A Reading Room and a community Archive for Yorùbá.",
};

export const viewport: Viewport = { themeColor: "#121413", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:bg-ochre focus:px-4 focus:py-2 focus:text-clay"
        >
          Skip to content
        </a>
        <header className="border-b border-bone/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
            <Link href="/" aria-label="Ogbifọ, home">
              <Wordmark />
            </Link>
            <NavLinks />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-10 sm:px-6 md:pb-16 md:pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
