import { API_BASE, HealthResponseSchema } from "@portfolio/shared";
import { ThemeToggle } from "@portfolio/ui";
import { useEffect, useState } from "react";

type ApiStatus = "checking" | "up" | "down";

/** Phase 0 placeholder: proves tokens, theme toggle, shared package and /api proxy work. */
export function App() {
  const [api, setApi] = useState<ApiStatus>("checking");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE}/health`, { signal: controller.signal })
      .then((res) => res.json())
      .then((body: unknown) => {
        setApi(HealthResponseSchema.safeParse(body).success ? "up" : "down");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          console.warn("API health check failed", error);
          setApi("down");
        }
      });
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="mx-auto max-w-page space-y-gutter-lg px-page-margin py-section">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-display-lg-mobile md:text-display-lg">Seat Picker</h1>
        <ThemeToggle />
      </div>
      <p className="font-mono text-label-sm text-on-surface-muted">
        API: <span data-testid="api-status">{api}</span>
      </p>
    </main>
  );
}
