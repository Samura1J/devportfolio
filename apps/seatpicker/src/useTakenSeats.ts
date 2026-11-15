import type { SeatId } from "@portfolio/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchTakenSeats } from "./api";

const REFRESH_MS = 30_000;

/**
 * Seats other people have sold or are paying for. Refreshes every 30 seconds
 * while the tab is visible, and when it regains focus. A failed refresh keeps
 * the last answer: the server checks every seat again at checkout anyway.
 */
export function useTakenSeats(movieId: number | undefined): { taken: ReadonlySet<SeatId>; refresh: () => void } {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ movieId: number; taken: SeatId[] }>();

  useEffect(() => {
    if (movieId === undefined) return;
    const controller = new AbortController();
    fetchTakenSeats(movieId, controller.signal).then(
      (taken) => {
        setResult({ movieId, taken });
      },
      (error: unknown) => {
        if (!controller.signal.aborted) console.warn("Couldn't refresh seat availability", error);
      },
    );
    return () => {
      controller.abort();
    };
  }, [movieId, version]);

  const refresh = useCallback(() => {
    setVersion((n) => n + 1);
  }, []);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = setInterval(refreshIfVisible, REFRESH_MS);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refresh]);

  const taken = useMemo(
    () => new Set(result !== undefined && result.movieId === movieId ? result.taken : []),
    [result, movieId],
  );
  return { taken, refresh };
}
