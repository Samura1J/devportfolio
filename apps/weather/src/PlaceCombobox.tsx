import { LOCATION_SEARCH_MIN_CHARS } from "@portfolio/shared";
import { cn, focusRing } from "@portfolio/ui";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { LuChevronDown, LuLoaderCircle, LuMapPin, LuSearch } from "react-icons/lu";
import { matchCities, mergeResults, placeDetail, placeKey, placeLabel, type Place } from "./places";
import { usePlaceSearch, type PlaceSearch } from "./usePlaceSearch";

const LOCAL_LIMIT = 5;

interface PlaceComboboxProps {
  value: Place;
  onChange: (place: Place) => void;
}

function footerText(query: string, search: PlaceSearch, count: number): string | undefined {
  const typed = query.trim();
  switch (search.status) {
    case "loading":
      return "Searching more places…";
    case "error":
      return count > 0
        ? "Search is unavailable right now, so only built-in cities are shown."
        : "Search is unavailable right now. Try one of the built-in cities.";
    case "done":
      return count === 0 ? `No places match “${typed}”.` : undefined;
    case "idle":
      if (!typed) return undefined;
      return count === 0 ? `Type ${String(LOCATION_SEARCH_MIN_CHARS)} letters to search all places.` : undefined;
  }
}

/**
 * Search-as-you-type place picker (WAI-ARIA combobox with a listbox popup).
 * Built-in cities filter instantly; WeatherAPI results join after a pause.
 * Focus stays in the input: arrows move the highlighted option, Enter picks
 * it, Esc closes the list or restores the current place.
 */
export function PlaceCombobox({ value, onChange }: PlaceComboboxProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  /** null while not editing: the input then shows the current place. */
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const typed = query ?? "";
  const search = usePlaceSearch(typed);
  const local = matchCities(typed, typed.trim() ? LOCAL_LIMIT : Infinity);
  const options = mergeResults(local, search.status === "done" ? search.results : []);
  const footer = footerText(typed, search, options.length);
  const expanded = open && (options.length > 0 || footer !== undefined);
  const optionId = (index: number) => `${id}-option-${String(index)}`;
  const activeIndex = active < options.length ? active : options.length - 1;

  useEffect(() => {
    if (!expanded || activeIndex < 0) return;
    document.getElementById(`${id}-option-${String(activeIndex)}`)?.scrollIntoView({ block: "nearest" });
  }, [expanded, activeIndex, id]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const choose = (place: Place) => {
    onChange(place);
    setQuery(null);
    close();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActive(event.key === "ArrowDown" ? 0 : options.length - 1);
          return;
        }
        if (options.length === 0) return;
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((activeIndex + step + options.length) % options.length);
        return;
      }
      case "Enter": {
        const option = expanded ? options[activeIndex] : undefined;
        if (option) {
          event.preventDefault();
          choose(option);
        }
        return;
      }
      case "Escape":
        if (expanded) {
          event.preventDefault();
          close();
        } else if (query !== null) {
          event.preventDefault();
          setQuery(null);
        }
        return;
    }
  };

  return (
    <div className="flex w-full flex-col gap-2 sm:w-96">
      <label htmlFor={`${id}-input`} className="font-label text-label-md text-on-surface-muted">
        City
      </label>
      <div className="relative">
        <LuSearch
          aria-hidden
          size={18}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-on-surface-muted"
        />
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={`${id}-listbox`}
          aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          spellCheck={false}
          value={query ?? placeLabel(value)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(event.target.value.trim() ? 0 : -1);
          }}
          onFocus={(event) => {
            event.target.select();
          }}
          onClick={() => {
            setOpen(true);
          }}
          onBlur={() => {
            setQuery(null);
            close();
          }}
          onKeyDown={onKeyDown}
          className={cn(
            "h-11 w-full border border-outline-strong bg-surface-container pr-10 pl-10 font-body text-body-md text-on-surface hover:border-primary",
            focusRing,
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show cities"
          aria-expanded={expanded}
          aria-controls={`${id}-listbox`}
          // Keep focus in the input; the button only toggles the list.
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            inputRef.current?.focus();
            if (expanded) close();
            else setOpen(true);
          }}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center text-on-surface-muted hover:text-primary"
        >
          <LuChevronDown aria-hidden size={18} className={cn("transition-transform", expanded && "rotate-180")} />
        </button>

        <div
          hidden={!expanded}
          // Clicks inside the popup must not blur the input before they land.
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          className="absolute inset-x-0 top-full z-20 mt-1 border border-outline-strong bg-surface"
        >
          <ul id={`${id}-listbox`} role="listbox" aria-label="Places" className="max-h-80 overflow-y-auto">
            {options.map((place, index) => {
              const detail = placeDetail(place);
              return (
                <li
                  key={placeKey(place)}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === activeIndex}
                  onClick={() => {
                    choose(place);
                  }}
                  onMouseMove={() => {
                    if (index !== activeIndex) setActive(index);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 px-3 py-2",
                    index === activeIndex && "bg-surface-container-high",
                  )}
                >
                  <LuMapPin aria-hidden size={16} className="shrink-0 text-on-surface-muted" />
                  <span className="min-w-0">
                    <span className="block truncate font-body text-body-md text-on-surface">{place.name}</span>
                    {detail && (
                      <span className="block truncate font-label text-label-sm text-on-surface-muted">{detail}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {footer && (
            <p className="flex items-center gap-2 border-t border-outline px-3 py-2 font-label text-label-sm text-on-surface-muted">
              {search.status === "loading" && (
                <LuLoaderCircle aria-hidden size={14} className="motion-safe:animate-spin" />
              )}
              {footer}
            </p>
          )}
        </div>
      </div>
      <p id={`${id}-hint`} className="sr-only">
        Type to search, then use the arrow keys and Enter to choose.
      </p>
      <div role="status" className="sr-only">
        {expanded ? [`${String(options.length)} ${options.length === 1 ? "place" : "places"} available.`, footer].filter(Boolean).join(" ") : ""}
      </div>
    </div>
  );
}
