import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

/** Explains what is missing and invites a meaningful next step. */
export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <section className="border-t border-bone/10 py-16 sm:py-24">
      <h2 className="font-serif text-3xl font-semibold tracking-tight text-bone sm:text-4xl">{title}</h2>
      <div className="mt-4 max-w-prose font-body text-base leading-relaxed text-ash">{children}</div>
      {action ? <div className="mt-8">{action}</div> : null}
    </section>
  );
}
