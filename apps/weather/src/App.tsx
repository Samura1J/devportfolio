import { FORECAST_DAYS } from "@portfolio/shared";
import { Button, cn, focusRing, ThemeToggle } from "@portfolio/ui";
import { LuArrowLeft, LuRotateCw } from "react-icons/lu";
import { CITIES } from "./cities";
import { ForecastCard, ForecastSkeleton, UnitToggle } from "./components";
import { PlaceCombobox } from "./PlaceCombobox";
import { placeDetail } from "./places";
import { usePlace, useUnit } from "./preferences";
import { useForecast } from "./useForecast";

export function App() {
  const [place, setPlace] = usePlace();
  const [unit, setUnit] = useUnit();
  const { state, retry } = useForecast(place);
  const detail = placeDetail(place);

  return (
    <>
      <header className="border-b border-outline bg-surface">
        <div className="mx-auto flex h-14 max-w-page items-center justify-between gap-4 px-page-margin">
          <a
            href="/"
            className={cn(
              "inline-flex items-center gap-2 font-label text-label-md text-on-surface-muted transition-colors hover:text-primary",
              focusRing,
            )}
          >
            <LuArrowLeft aria-hidden size={16} />
            Portfolio
          </a>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-page space-y-gutter-lg px-page-margin py-section">
        <div className="space-y-3">
          <h1 className="font-display text-display-lg-mobile md:text-display-lg">Weather Forecast</h1>
          <p className="max-w-2xl font-body text-body-lg text-on-surface-muted">
            A {FORECAST_DAYS}-day forecast for any city. Search for a place, or pick one of {CITIES.length} European
            cities.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-gutter-md">
          <PlaceCombobox value={place} onChange={setPlace} />
          <UnitToggle value={unit} onChange={setUnit} />
        </div>

        <section aria-labelledby="forecast-heading" aria-busy={state.status === "loading"} className="space-y-gutter-md">
          <div>
            <h2 id="forecast-heading" className="font-headline text-headline-md">
              {place.name}
            </h2>
            {detail && <p className="font-body text-body-md text-on-surface-muted">{detail}</p>}
          </div>

          <div role="status" className="sr-only">
            {state.status === "loading" ? `Loading the forecast for ${place.name}…` : ""}
          </div>

          {state.status === "error" ? (
            <div
              role="alert"
              className="flex flex-col items-start gap-4 border border-error/60 bg-surface-container p-gutter-md"
            >
              <p className="font-body text-body-md">{state.message}</p>
              <Button variant="secondary" size="sm" onClick={retry}>
                <LuRotateCw aria-hidden size={16} />
                Try again
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-gutter-md md:grid-cols-3">
              {state.status === "loading" ? (
                <ForecastSkeleton count={FORECAST_DAYS} />
              ) : (
                state.forecast.days.map((day) => <ForecastCard key={day.date} day={day} unit={unit} />)
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-outline">
        <p className="mx-auto max-w-page px-page-margin py-gutter-md font-label text-label-sm text-on-surface-muted">
          Forecast data from{" "}
          <a
            href="https://www.weatherapi.com/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn("text-primary hover:underline", focusRing)}
          >
            WeatherAPI.com
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          , cached for 30 minutes.
        </p>
      </footer>
    </>
  );
}
