import { Button, cn, focusRing, ThemeToggle } from "@portfolio/ui";
import type { ReactNode } from "react";
import { LuArrowLeft, LuRotateCw } from "react-icons/lu";
import { Link, Outlet } from "react-router";

export function Layout() {
  return (
    <>
      <header className="border-b border-outline bg-surface">
        <div className="mx-auto flex h-14 max-w-page items-center justify-between gap-4 px-page-margin">
          <div className="flex items-center gap-4">
            {/* A plain <a>: the portfolio is outside this app's router. */}
            <a
              href="/"
              className={cn(
                "inline-flex items-center gap-2 font-label text-label-md text-on-surface-muted transition-colors hover:text-primary",
                focusRing,
              )}
            >
              <LuArrowLeft aria-hidden size={16} />
              Portfolio
            </a>
            <span aria-hidden className="h-5 border-l border-outline" />
            <Link to="/" className={cn("font-headline text-label-lg font-bold hover:text-primary", focusRing)}>
              Seat Picker
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-page px-page-margin py-section">
        <Outlet />
      </main>
      <footer className="border-t border-outline">
        <p className="mx-auto max-w-page px-page-margin py-gutter-md font-label text-label-sm text-on-surface-muted">
          A demo: payments run in Stripe test mode, so no real money moves. Movie data from{" "}
          <a
            href="https://www.themoviedb.org/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn("text-primary hover:underline", focusRing)}
          >
            TMDB
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </footer>
    </>
  );
}

const STEPS = ["Movie", "Seats", "Payment"] as const;

/** Page title plus where this page sits in the three booking steps. */
export function PageHeading({ step, title, children }: { step?: 1 | 2 | 3; title: string; children?: ReactNode }) {
  return (
    <div className="mb-gutter-lg space-y-3">
      <title>{`${title} · Seat Picker`}</title>
      {step && (
        <ol aria-label="Booking steps" className="flex flex-wrap gap-x-4 gap-y-1 font-label text-label-sm">
          {STEPS.map((name, index) => {
            const current = index + 1 === step;
            return (
              <li
                key={name}
                aria-current={current ? "step" : undefined}
                className={current ? "text-primary" : "text-on-surface-muted"}
              >
                {String(index + 1)}. {name}
              </li>
            );
          })}
        </ol>
      )}
      <h1 className="font-display text-display-lg-mobile md:text-display-lg">{title}</h1>
      {children && <div className="max-w-2xl font-body text-body-lg text-on-surface-muted">{children}</div>}
    </div>
  );
}

export function ErrorPanel({ message, onRetry, children }: { message: string; onRetry?: () => void; children?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4 border border-error/60 bg-surface-container p-gutter-md">
      <p className="font-body text-body-md">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <LuRotateCw aria-hidden size={16} />
          Try again
        </Button>
      )}
      {children}
    </div>
  );
}

/** A dead end with one way out, e.g. a missing movie or an expired link. */
export function Notice({ title, children, action }: { title: string; children: ReactNode; action: ReactNode }) {
  return (
    <div className="max-w-xl space-y-gutter-md">
      <PageHeading title={title} />
      <div className="font-body text-body-lg text-on-surface-muted">{children}</div>
      {action}
    </div>
  );
}
