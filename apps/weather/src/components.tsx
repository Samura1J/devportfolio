import { formatForecastDate, type Condition, type DailyForecast, type TemperatureUnit } from "@portfolio/shared";
import { Card, cn, focusRing } from "@portfolio/ui";
import type { CSSProperties } from "react";
import { LuDroplets } from "react-icons/lu";

const UNITS: readonly TemperatureUnit[] = ["C", "F"];

export function UnitToggle({ value, onChange }: { value: TemperatureUnit; onChange: (unit: TemperatureUnit) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span id="unit-label" className="font-label text-label-md text-on-surface-muted">
        Units
      </span>
      <div role="group" aria-labelledby="unit-label" className="flex h-11 border border-outline-strong">
        {UNITS.map((unit) => {
          const pressed = unit === value;
          return (
            <button
              key={unit}
              type="button"
              aria-pressed={pressed}
              onClick={() => {
                onChange(unit);
              }}
              className={cn(
                "min-w-14 px-4 font-label text-label-md transition-colors",
                focusRing,
                pressed ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:text-primary",
              )}
            >
              <span aria-hidden>°{unit}</span>
              <span className="sr-only">{unit === "C" ? "Celsius" : "Fahrenheit"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The icons are single-color SVGs with no fill of their own, so they're drawn
 * as a mask filled with the text color. That keeps them visible in dark mode.
 */
export function WeatherIcon({ condition, label, className }: { condition: Condition; label: string; className?: string }) {
  const url = `url("${import.meta.env.BASE_URL}images/${condition}.svg")`;
  const style: CSSProperties = {
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
  };
  return (
    <span
      role="img"
      aria-label={label}
      data-condition={condition}
      className={cn("block bg-current", className)}
      style={style}
    />
  );
}

export function ForecastCard({ day, unit }: { day: DailyForecast; unit: TemperatureUnit }) {
  const [high, low] = unit === "C" ? [day.highC, day.lowC] : [day.highF, day.lowF];
  return (
    <Card as="article" className="flex flex-col gap-4 p-gutter-md">
      <h3 className="font-headline text-headline-sm">{formatForecastDate(day.date)}</h3>
      <div className="flex items-center gap-4">
        <WeatherIcon condition={day.condition} label={day.label} className="size-16 shrink-0 text-primary" />
        <p className="font-body text-body-md">{day.label}</p>
      </div>
      <dl className="mt-auto grid grid-cols-3 gap-2 border-t border-outline pt-4">
        <div>
          <dt className="font-label text-label-sm text-on-surface-muted">High</dt>
          <dd className="font-headline text-headline-md">
            {high}°<span className="sr-only">{unit}</span>
          </dd>
        </div>
        <div>
          <dt className="font-label text-label-sm text-on-surface-muted">Low</dt>
          <dd className="font-headline text-headline-md text-on-surface-muted">
            {low}°<span className="sr-only">{unit}</span>
          </dd>
        </div>
        <div>
          <dt className="font-label text-label-sm text-on-surface-muted">Rain</dt>
          <dd className="flex items-center gap-1 font-headline text-headline-md">
            <LuDroplets aria-hidden size={18} className="text-accent-ink" />
            {day.chanceOfRain}%
          </dd>
        </div>
      </dl>
    </Card>
  );
}

export function ForecastSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} aria-hidden className="flex flex-col gap-4 p-gutter-md">
          <div className="h-6 w-28 bg-surface-container-high motion-safe:animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="size-16 bg-surface-container-high motion-safe:animate-pulse" />
            <div className="h-4 w-32 bg-surface-container-high motion-safe:animate-pulse" />
          </div>
          <div className="h-14 border-t border-outline pt-4">
            <div className="h-full bg-surface-container-high motion-safe:animate-pulse" />
          </div>
        </Card>
      ))}
    </>
  );
}
