import { formatPrice, TICKET_PRICE_CENTS, type Movie, type SeatId } from "@portfolio/shared";
import { Button, buttonClasses, Card } from "@portfolio/ui";
import { useState } from "react";
import { LuLock } from "react-icons/lu";
import { Link } from "react-router";
import { browser, errorMessage, startCheckout } from "../api";
import { ErrorPanel, Notice, PageHeading } from "../Layout";
import { selectionSearch, useSelection } from "../selection";
import { useMovie } from "../useMovie";

export function CheckoutPage() {
  const { movieId, seats } = useSelection();
  const [movie, retry] = useMovie(movieId);

  if (seats.length === 0) {
    return (
      <Notice
        title="No seats picked"
        action={
          <Link to={movieId === undefined ? "/" : { pathname: "/seats", search: selectionSearch({ movieId, seats }) }} className={buttonClasses()}>
            {movieId === undefined ? "Choose a movie" : "Pick seats"}
          </Link>
        }
      >
        Pick at least one seat before paying.
      </Notice>
    );
  }
  if (movie.status === "error") {
    return (
      <>
        <PageHeading step={3} title="Review and pay" />
        <ErrorPanel message={movie.message} onRetry={retry} />
      </>
    );
  }
  if (movie.status === "loading") {
    return (
      <>
        <PageHeading step={3} title="Review and pay" />
        <div aria-hidden className="h-64 max-w-2xl bg-surface-container-high motion-safe:animate-pulse" />
        <p role="status" className="sr-only">
          Loading your order…
        </p>
      </>
    );
  }
  if (!movie.data) {
    return (
      <Notice
        title="That movie isn't showing"
        action={
          <Link to="/" className={buttonClasses()}>
            See what&apos;s showing
          </Link>
        }
      >
        The trending list changed since you picked your seats. Nothing was charged.
      </Notice>
    );
  }
  return <OrderReview movie={movie.data} seats={seats} />;
}

function OrderReview({ movie, seats }: { movie: Movie; seats: SeatId[] }) {
  const [state, setState] = useState<{ status: "idle" } | { status: "redirecting" } | { status: "error"; message: string }>({
    status: "idle",
  });
  const total = formatPrice(seats.length * TICKET_PRICE_CENTS);

  const pay = () => {
    setState({ status: "redirecting" });
    startCheckout({ movieId: movie.id, seats }).then(
      (url) => {
        browser.assign(url);
      },
      (error: unknown) => {
        setState({ status: "error", message: errorMessage(error) });
      },
    );
  };

  return (
    <>
      <PageHeading step={3} title="Review and pay" />
      <div className="grid max-w-3xl gap-gutter-lg md:grid-cols-[10rem_1fr]">
        <img
          src={movie.posterUrl}
          alt=""
          width={500}
          height={750}
          className="hidden aspect-[2/3] w-40 border border-outline object-cover md:block"
        />
        <Card as="section" aria-labelledby="summary-heading" className="space-y-gutter-md p-gutter-md">
          <h2 id="summary-heading" className="font-headline text-headline-md">
            {movie.title}
          </h2>
          <dl className="space-y-3 font-body text-body-md">
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-muted">Seats</dt>
              <dd className="text-right font-mono">{seats.join(", ")}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-on-surface-muted">Tickets</dt>
              <dd>
                {seats.length} × {formatPrice(TICKET_PRICE_CENTS)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-outline pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="font-headline text-headline-md">{total}</dd>
            </div>
          </dl>

          {state.status === "error" && <ErrorPanel message={state.message} />}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={pay} disabled={state.status === "redirecting"} className="flex-1">
              <LuLock aria-hidden size={18} />
              {state.status === "redirecting" ? "Opening Stripe…" : `Pay ${total} with Stripe`}
            </Button>
            <Link
              to={{ pathname: "/seats", search: selectionSearch({ movieId: movie.id, seats }) }}
              className={buttonClasses({ variant: "ghost" })}
            >
              Change seats
            </Link>
          </div>

          <p className="border-t border-outline pt-3 font-label text-label-sm text-on-surface-muted">
            Stripe test mode: no real charge. Pay with card <span className="font-mono">4242 4242 4242 4242</span>,
            any future expiry date and any CVC.
          </p>
        </Card>
      </div>
    </>
  );
}
