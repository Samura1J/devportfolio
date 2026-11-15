import { MAX_SEATS_PER_ORDER, SEAT_COLUMNS, type SeatId } from "@portfolio/shared";
import { cn, focusRing } from "@portfolio/ui";
import { Fragment } from "react";
import { LuX } from "react-icons/lu";
import { MdChair } from "react-icons/md";
import { AISLE_AFTER_ROW, buildSeatMap, seatLabel } from "./seats";

const SEAT_MAP = buildSeatMap();

interface SeatMapProps {
  selected: readonly SeatId[];
  /** Sold, or held by someone else's checkout. */
  taken: ReadonlySet<SeatId>;
  onToggle: (seat: SeatId) => void;
}

/**
 * Ten rows of ten seats, screen at the top, aisle after row 5. Every seat is a
 * toggle button (aria-pressed) named "Row 3, seat C". Taken seats are disabled
 * and marked with a cross, not just a color. Once the order limit is reached,
 * the remaining seats are disabled until one is released.
 */
export function SeatMap({ selected, taken, onToggle }: SeatMapProps) {
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
                const isTaken = taken.has(seat);
                return (
                  <button
                    key={seat}
                    type="button"
                    aria-pressed={pressed}
                    aria-label={isTaken ? `${seatLabel(seat)}, taken` : seatLabel(seat)}
                    disabled={isTaken || (full && !pressed)}
                    onClick={() => {
                      onToggle(seat);
                    }}
                    className={cn(
                      "flex aspect-square min-w-0 items-center justify-center border transition-colors disabled:cursor-not-allowed",
                      focusRing,
                      isTaken
                        ? "border-outline bg-surface-container-high text-on-surface-muted"
                        : pressed
                          ? "border-primary bg-primary text-on-primary"
                          : // Dimmed only when disabled by the order limit.
                          "border-outline-strong bg-surface-container text-on-surface-muted enabled:hover:border-primary enabled:hover:text-primary disabled:opacity-40",
                    )}
                  >
                    {isTaken ? <LuX aria-hidden className="size-1/2" /> : <MdChair aria-hidden className="size-3/5" />}
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
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-4 items-center justify-center border border-outline bg-surface-container-high"
          >
            <LuX className="size-3" />
          </span>
          Taken
        </li>
      </ul>
    </div>
  );
}
