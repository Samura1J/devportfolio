import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { ApiRequestError, errorMessage } from "./api";

export type RequestState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

type Settled<T> = Exclude<RequestState<T>, { status: "loading" }> & { key: string };

/**
 * Runs `load` whenever `key` changes (or on retry) and tracks its result.
 * Results are tagged with the request they answer, so a slow, stale answer
 * never replaces a newer one, and "loading" needs no state update of its own.
 */
export function useRequest<T>(key: string, load: (signal: AbortSignal) => Promise<T>): [RequestState<T>, () => void] {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>();
  const requestKey = `${key}#${String(attempt)}`;
  const run = useEffectEvent(load);

  useEffect(() => {
    const controller = new AbortController();
    run(controller.signal).then(
      (data) => {
        setSettled({ key: requestKey, status: "success", data });
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        if (!(error instanceof ApiRequestError)) console.error("Request failed", error);
        setSettled({ key: requestKey, status: "error", message: errorMessage(error) });
      },
    );
    return () => {
      controller.abort();
    };
  }, [requestKey]);

  const retry = useCallback(() => {
    setAttempt((n) => n + 1);
  }, []);

  if (settled?.key !== requestKey) return [{ status: "loading" }, retry];
  const { key: _key, ...state } = settled;
  return [state, retry];
}
