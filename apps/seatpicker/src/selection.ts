import { MAX_SEATS_PER_ORDER, type SeatId } from "@portfolio/shared";
import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { parseSeats, sortSeats } from "./seats";

export interface Selection {
  /** undefined when `?movie=` is missing or not a positive whole number. */
  movieId: number | undefined;
  seats: SeatId[];
}

export function parseMovieId(value: string | null): number | undefined {
  if (!value || !/^[1-9]\d{0,9}$/.test(value)) return undefined;
  return Number(value);
}

/** `movie=…&seats=…` for links between the booking steps. */
export function selectionSearch({ movieId, seats }: Selection): string {
  const params = new URLSearchParams();
  if (movieId !== undefined) params.set("movie", String(movieId));
  if (seats.length > 0) params.set("seats", seats.join(","));
  // Keep the commas readable: "seats=1A,1B" rather than "seats=1A%2C1B".
  return params.toString().replaceAll("%2C", ",");
}

/**
 * The booking lives in the URL (`?movie=123&seats=1A,1B`), so a refresh, the
 * back button or a shared link all keep it. Seat changes replace the history
 * entry instead of adding one per click.
 */
export function useSelection() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const movieId = parseMovieId(params.get("movie"));
  const seats = parseSeats(params.get("seats"));
  const seatsKey = seats.join(",");

  // The router applies URL changes a moment after navigate() is called, so two
  // quick clicks would both start from the old seats and the first would be
  // lost. Track the latest selection here; the URL catches up.
  const latest = useRef(seats);
  useEffect(() => {
    latest.current = parseSeats(seatsKey);
  }, [seatsKey]);

  const setSeats = useCallback(
    (update: (seats: SeatId[]) => SeatId[]) => {
      const next = sortSeats(update(latest.current)).slice(0, MAX_SEATS_PER_ORDER);
      latest.current = next;
      // A string search (not URLSearchParams) keeps the commas unencoded.
      void navigate({ search: selectionSearch({ movieId, seats: next }) }, { replace: true });
    },
    [navigate, movieId],
  );

  const toggleSeat = useCallback(
    (seat: SeatId) => {
      setSeats((current) => (current.includes(seat) ? current.filter((s) => s !== seat) : [...current, seat]));
    },
    [setSeats],
  );

  return { movieId, seats, setSeats, toggleSeat };
}
