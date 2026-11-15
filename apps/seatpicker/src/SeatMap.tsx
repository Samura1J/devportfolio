import { MAX_SEATS_PER_ORDER, SEAT_COLUMNS, type SeatId } from "@portfolio/shared";
import { cn, focusRing } from "@portfolio/ui";
import { Fragment } from "react";
import { MdChair } from "react-icons/md";
import { AISLE_AFTER_ROW, buildSeatMap, seatLabel } from "./seats";

const SEAT_MAP = buildSeatMap();

interface SeatMapProps {
  selected: readonly SeatId[];
  onToggle: (seat: SeatId) => void;
}

/**
 * Ten rows of ten seats, screen at the top, aisle after row 5. Every seat is a
 * toggle button (aria-pressed) named "Row 3, seat C". Once the order limit is
 * reached, the remaining seats are disabled until one is released.
 */
export function SeatMap({ selected, onToggle }: SeatMapProps) {
  const full = selected.length >= MAX_SEATS_PER_ORDER;

  return (
    <div className="mx-auto w-full max-w-xl">
      <div aria-hidden className="mb-gutter-md">
        <div className="mx-auto h-2 w-4/5 bg-primary/70" />
        <p className="mt-2 text-center font-label text-label-sm tracking-widest text-on-surface-muted uppercase">Screen</p>
      </div>

      <div
        role="group"
        aria-label="Seats"
        className="grid grid-cols-[1.5rem_repeat(10,minmax(0,1fr))] gap-1 sm:gap-1.5"
      >
        <span aria-hidden />
        {SEAT_COLUMNS.map((column) => (
          <span aria-hidden key={column} className="text-center font-label text-label-sm text-on-surface-muted">
            {column}
          </span>
        ))}

        {SEAT_MAP.map((row, index) => {
          const rowNumber = index + 1;
          return (
            <Fragment key={rowNumber}>
              {rowNumber === AISLE_AFTER_ROW + 1 && <div aria-hidden className="col-span-full h-4" />}
              <span aria-hidden className="flex items-center font-label text-label-sm text-on-surface-muted">
                {rowNumber}
              </span>
              {row.map((seat) => {
                const pressed = selected.includes(seat);
                return (
                  <button
                    key={seat}
                    type="button"
                    aria-pressed={pressed}
                    aria-label={seatLabel(seat)}
                    disabled={full && !pressed}
                    onClick={() => {
                      onToggle(seat);
                    }}
                    className={cn(
                      "flex aspect-square min-w-0 items-center justify-center border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      focusRing,
                      pressed
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-strong bg-surface-container text-on-surface-muted enabled:hover:border-primary enabled:hover:text-primary",
                    )}
                  >
                    <MdChair aria-hidden className="size-3/5" />
                  </button>
                );
              })}
            </Fragment>
          );
        })}
      </div>

      <ul aria-label="Legend" className="mt-gutter-md flex justify-center gap-6 font-label text-label-sm text-on-surface-muted">
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 border border-outline-strong bg-surface-container" />
          Available
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 border border-primary bg-primary" />
          Selected
        </li>
      </ul>
    </div>
  );
}
