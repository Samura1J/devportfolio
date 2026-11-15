import { CheckoutSessionIdSchema, formatPrice } from "@portfolio/shared";
import { buttonClasses, Card } from "@portfolio/ui";
import { LuCircleCheck } from "react-icons/lu";
import { Link, useSearchParams } from "react-router";
import { fetchCheckoutSummary } from "../api";
import { ErrorPanel, Notice, PageHeading } from "../Layout";
import { selectionSearch, useSelection } from "../selection";
import { useRequest } from "../useRequest";

const bookAnother = (
  <Link to="/" className={buttonClasses()}>
    Book another movie
  </Link>
);

/** Stripe returns here with `?session_id=`; the API reports what was bought. */
export function SuccessPage() {
  const [params] = useSearchParams();
  const sessionId = CheckoutSessionIdSchema.safeParse(params.get("session_id"));

  if (!sessionId.success) {
    return (
      <Notice title="No booking to show" action={bookAnother}>
        This page shows a booking after payment, but the link has no valid booking reference.
      </Notice>
    );
  }
  return <BookingSummary sessionId={sessionId.data} />;
}

function BookingSummary({ sessionId }: { sessionId: string }) {
  const [summary, retry] = useRequest(sessionId, (signal) => fetchCheckoutSummary(sessionId, signal));

  if (summary.status === "loading") {
    return (
      <>
        <PageHeading title="Checking your booking" />
        <p role="status" className="font-body text-body-lg text-on-surface-muted">
          Confirming your payment with Stripe…
        </p>
      </>
    );
  }
  if (summary.status === "error") {
    return (
      <>
        <PageHeading title="Checking your booking" />
        <ErrorPanel message={summary.message} onRetry={retry}>
          {bookAnother}
        </ErrorPanel>
      </>
    );
  }

  const order = summary.data;
  if (!order.paid) {
    return (
      <Notice title="Payment not completed" action={bookAnother}>
        {order.status === "expired"
          ? "This checkout expired before payment, so nothing was charged."
          : "Stripe hasn't confirmed a payment for this booking yet, so nothing was charged."}
      </Notice>
    );
  }

  return (
    <>
      <PageHeading title="You're booked">Enjoy the movie. This was a test payment, so no real money moved.</PageHeading>
      <Card as="section" aria-labelledby="booking-heading" className="max-w-xl space-y-gutter-md p-gutter-md">
        <h2 id="booking-heading" className="flex items-center gap-3 font-headline text-headline-md">
          <LuCircleCheck aria-hidden size={24} className="shrink-0 text-success-ink" />
          {order.movieTitle}
        </h2>
        <dl className="space-y-3 font-body text-body-md">
          <div className="flex justify-between gap-4">
            <dt className="text-on-surface-muted">Seats</dt>
            <dd className="text-right font-mono">{order.seats.join(", ")}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-outline pt-3">
            <dt className="font-semibold">Paid</dt>
            <dd className="font-headline text-headline-sm">{formatPrice(order.amountTotalCents, order.currency)}</dd>
          </div>
        </dl>
        {bookAnother}
      </Card>
    </>
  );
}

/** Stripe's cancel URL carries the selection back, so nothing has to be re-picked. */
export function CancelPage() {
  const { movieId, seats } = useSelection();
  const canResume = movieId !== undefined && seats.length > 0;
  return (
    <Notice
      title="Checkout cancelled"
      action={
        canResume ? (
          <Link to={{ pathname: "/seats", search: selectionSearch({ movieId, seats }) }} className={buttonClasses()}>
            Back to your seats
          </Link>
        ) : (
          bookAnother
        )
      }
    >
      Nothing was charged.{canResume ? ` Your seats (${seats.join(", ")}) are still selected.` : ""}
    </Notice>
  );
}

export function NotFoundPage() {
  return (
    <Notice title="Page not found" action={bookAnother}>
      There&apos;s nothing at this address.
    </Notice>
  );
}
