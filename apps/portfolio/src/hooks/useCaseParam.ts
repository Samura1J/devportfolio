import { useCallback, useEffect, useState } from "react";
import { PROJECT_SLUGS, type ProjectSlug } from "../content/types";

const PARAM = "case";

function isProjectSlug(value: string | null): value is ProjectSlug {
  return PROJECT_SLUGS.some((slug) => slug === value);
}

function readSlug(): ProjectSlug | null {
  const value = new URLSearchParams(window.location.search).get(PARAM);
  return isProjectSlug(value) ? value : null;
}

function urlWith(slug: ProjectSlug | null): string {
  const url = new URL(window.location.href);
  if (slug) url.searchParams.set(PARAM, slug);
  else url.searchParams.delete(PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** True when this history entry was pushed by `openCase` (not a deep link). */
function openedHere(): boolean {
  const state: unknown = window.history.state;
  return typeof state === "object" && state !== null && "caseOpenedHere" in state;
}

/**
 * Keeps the open case study in `?case=<slug>`, so it can be deep-linked and
 * the browser Back button closes it.
 *
 * - openCase pushes a history entry; closeCase goes back to it.
 * - switchCase (prev/next) replaces the entry, so Back still closes the dialog
 *   instead of stepping through every project viewed.
 * - A deep-linked dialog has no entry of ours to go back to, so closing it
 *   just removes the param.
 */
export function useCaseParam() {
  const [slug, setSlug] = useState<ProjectSlug | null>(readSlug);

  useEffect(() => {
    const onPopState = () => {
      setSlug(readSlug());
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const openCase = useCallback((next: ProjectSlug) => {
    window.history.pushState({ caseOpenedHere: true }, "", urlWith(next));
    setSlug(next);
  }, []);

  const switchCase = useCallback((next: ProjectSlug) => {
    window.history.replaceState(window.history.state, "", urlWith(next));
    setSlug(next);
  }, []);

  const closeCase = useCallback(() => {
    if (openedHere()) {
      window.history.back(); // popstate clears the slug
    } else {
      window.history.replaceState(null, "", urlWith(null));
      setSlug(null);
    }
  }, []);

  return { slug, openCase, switchCase, closeCase };
}
