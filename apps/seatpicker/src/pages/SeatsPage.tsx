import { formatPrice, MAX_SEATS_PER_ORDER, TICKET_PRICE_CENTS, type SeatId } from "@portfolio/shared";
import { buttonClasses, Card } from "@portfolio/ui";
import { Link } from "react-router";
import { ErrorPanel, Notice, PageHeading } from "../Layout";
import { SeatMap } from "../SeatMap";
import { selectionSearch, useSelection } from "../selection";
import { useMovie } from "../useMovie";
import { useTakenSeats } from "../useTakenSeats";

export function SeatsPage() {
  const { movieId, seats: requested, setSeats } = useSelection();
  const [movie, retry] = useMovie(movieId);
  const { taken } = useTakenSeats(movieId);

  // Seats someone else took since they were picked (or in a stale link) drop
  // out of the order; the URL loses them on the next change.
  const lost = requested.filter((seat) => taken.has(seat));
  const seats = requested.filter((seat) => !taken.has(seat));
  const toggleSeat = (seat: SeatId) => {
    setSeats((current) => {
      const kept = current.filter((s) => !taken.has(s));
      return kept.includes(seat) ? kept.filter((s) => s !== seat) : [...kept, seat];
    });
  };

  if (movie.status === "error") {
    return (
      <>
        <PageHeading step={2} title="Pick your seats" />
        <ErrorPanel message={movie.message} onRetry={retry} />
      </>
    );
  }
  if (movie.status === "success" && !movie.data) return <MovieNotShowing />;

  const title = movie.status === "success" ? movie.data?.title : undefined;
  const count = seats.length;
  const full = count >= MAX_SEATS_PER_ORDER;

  return (
    <>
      <PageHeading step={2} title="Pick your seats">
        {title ? (
          <>
            For <span className="font-semibold text-on-surface">{title}</span>. Up to {MAX_SEATS_PER_ORDER} seats,{" "}
            {formatPrice(TICKET_PRICE_CENTS)} each.
          </>
        ) : (
          <span aria-hidden className="inline-block h-5 w-64 bg-surface-container-high motion-safe:animate-pulse" />
        )}
      </PageHeading>

      <div className="grid gap-gutter-lg lg:grid-cols-[1fr_20rem] lg:items-start">
        <SeatMap selected={seats} taken={taken} onToggle={toggleSeat} />

        <Card as="section" aria-labelledby="order-heading" className="space-y-gutter-md p-gutter-md lg:sticky lg:top-6">
          <h2 id="order-heading" className="font-headline text-headline-sm">
            Your seats
          </h2>
          <div aria-live="polite" className="space-y-3">
            {lost.length > 0 && (
              <p className="border-l-2 border-warning pl-3 font-body text-body-md">
                {lost.length === 1 ? `Seat ${lost.join("")} was` : `Seats ${lost.join(", ")} were`} just taken by
                someone else, so {lost.length === 1 ? "it's" : "they're"} no longer in your order.
              </p>
            )}
            {count === 0 ? (
              <p className="font-body text-body-md text-on-surface-muted">No seats yet. Tap a seat to add it.</p>
            ) : (
              <ul aria-label="Selected seats" className="flex flex-wrap gap-2">
                {seats.map((seat) => (
                  <li key={seat} className="border border-primary px-2 py-0.5 font-mono text-label-md text-primary">
                    {seat}
                  </li>
                ))}
              </ul>
            )}
            {full && (
              <p className="font-label text-label-sm text-on-surface-muted">
                That&apos;s the limit of {MAX_SEATS_PER_ORDER} seats per order.
              </p>
            )}
          </div>
          <dl className="flex items-baseline justify-between border-t border-outline pt-gutter-sm">
            <dt className="font-body text-body-md text-on-surface-muted">
              {count} × {formatPrice(TICKET_PRICE_CENTS)}
            </dt>
            <dd className="font-headline text-headline-md">{formatPrice(count * TICKET_PRICE_CENTS)}</dd>
          </dl>
          <div className="flex flex-wrap items-center gap-3">
            {count > 0 ? (
              <Link
                to={{ pathname: "/checkout", search: selectionSearch({ movieId, seats }) }}
                className={buttonClasses({ className: "flex-1" })}
              >
                Continue to payment
              </Link>
            ) : (
              <button type="button" disabled className={buttonClasses({ className: "flex-1" })}>
                Continue to payment
              </button>
            )}
            {count > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSeats(() => []);
                }}
                className={buttonClasses({ variant: "ghost", size: "sm" })}
              >
                Clear
              </button>
            )}
          </div>
          <Link to="/" className={buttonClasses({ variant: "link", size: "sm" })}>
            Choose a different movie
          </Link>
        </Card>
      </div>
    </>
  );
}

function MovieNotShowing() {
  return (
    <Notice
      title="That movie isn't showing"
      action={
        <Link to="/" className={buttonClasses()}>
          See what&apos;s showing
        </Link>
      }
    >
      The trending list changes daily, so this link may be out of date. Pick a movie from today&apos;s list.
    </Notice>
  );
}
