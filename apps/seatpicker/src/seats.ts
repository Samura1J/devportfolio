import { isSeatId, MAX_SEATS_PER_ORDER, SEAT_COLUMNS, SEAT_ROWS, type SeatId } from "@portfolio/shared";

/** The aisle runs across the theater after this row. */
export const AISLE_AFTER_ROW = 5;

export const ROW_NUMBERS: readonly number[] = Array.from({ length: SEAT_ROWS }, (_, i) => i + 1);

/** Rows 1–10, each with seats A–J: `[["1A", …, "1J"], …, ["10A", …, "10J"]]`. */
export function buildSeatMap(): SeatId[][] {
  return ROW_NUMBERS.map((row) => SEAT_COLUMNS.map((column) => `${String(row)}${column}` as SeatId));
}

const seatOrder = (seat: SeatId) => {
  const row = Number(seat.slice(0, -1));
  const column = SEAT_COLUMNS.indexOf(seat.slice(-1) as (typeof SEAT_COLUMNS)[number]);
  return row * SEAT_COLUMNS.length + column;
};

/** Front to back, left to right: "1A, 1B, 2C". */
export const sortSeats = (seats: readonly SeatId[]): SeatId[] => [...seats].sort((a, b) => seatOrder(a) - seatOrder(b));

/**
 * Reads `?seats=1A,1B` leniently: unknown or repeated seats are dropped and
 * the list is capped at the order limit, so a hand-edited URL still works.
 */
export function parseSeats(value: string | null): SeatId[] {
  if (!value) return [];
  const seats = value
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter(isSeatId);
  return sortSeats([...new Set(seats)]).slice(0, MAX_SEATS_PER_ORDER);
}

/** "Row 3, seat C": the accessible name of a seat button. */
export function seatLabel(seat: SeatId): string {
  return `Row ${seat.slice(0, -1)}, seat ${seat.slice(-1)}`;
}
