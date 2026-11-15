import type { ForecastResponse } from "@portfolio/shared";
import { useCallback, useEffect, useState } from "react";
import { fetchForecast, ForecastError } from "./api";
import { placeKey, type Place } from "./places";

export type ForecastState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; forecast: ForecastResponse };

type Settled = Exclude<ForecastState, { status: "loading" }> & { key: string };

/**
 * Loads the forecast for `place`, aborting the previous request when the place
 * changes. Results are tagged with the request they answer, so a stale result
 * never shows for a new place and "loading" needs no state update of its own.
 */
export function useForecast(place: Place): { state: ForecastState; retry: () => void } {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled>();
  const key = `${placeKey(place)}#${String(attempt)}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchForecast(place, controller.signal).then(
      (forecast) => {
        setSettled({ key, status: "success", forecast });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (!(error instanceof ForecastError)) console.error("Forecast request failed", error);
        const message =
          error instanceof ForecastError ? error.message : "The forecast couldn't be loaded. Please try again.";
        setSettled({ key, status: "error", message });
      },
    );
    return () => {
      controller.abort();
    };
  }, [place, key]);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  if (settled?.key !== key) return { state: { status: "loading" }, retry };
  const { key: _key, ...state } = settled;
  return { state, retry };
}
