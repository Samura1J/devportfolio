import { LOCATION_SEARCH_MIN_CHARS } from "@portfolio/shared";
import { useEffect, useState } from "react";
import { searchPlaces } from "./api";
import type { Place } from "./places";

export type PlaceSearch =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; results: Place[] };

/**
 * Searches WeatherAPI's places once typing pauses. Shorter queries stay idle,
 * each new query aborts the last request, and answers are remembered for the
 * session, so backspacing over earlier input costs nothing.
 */
export function usePlaceSearch(input: string, delayMs = 250): PlaceSearch {
  const query = input.trim().replace(/\s+/g, " ");
  const key = query.toLowerCase();
  const active = query.length >= LOCATION_SEARCH_MIN_CHARS;
  const [answers, setAnswers] = useState<ReadonlyMap<string, Place[]>>(() => new Map());
  const [failed, setFailed] = useState<string>();
  const remembered = answers.get(key);

  useEffect(() => {
    if (!active || remembered) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setFailed((previous) => (previous === key ? undefined : previous));
      searchPlaces(query, controller.signal).then(
        (results) => {
          setAnswers((previous) => new Map(previous).set(key, results));
        },
        () => {
          if (!controller.signal.aborted) setFailed(key);
        },
      );
    }, delayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, key, active, remembered, delayMs]);

  if (!active) return { status: "idle" };
  if (remembered) return { status: "done", results: remembered };
  return failed === key ? { status: "error" } : { status: "loading" };
}
