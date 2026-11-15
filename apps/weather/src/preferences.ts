import type { TemperatureUnit } from "@portfolio/shared";
import { useCallback, useState } from "react";
import { DEFAULT_PLACE, placeFromSearch, placeToSearch, type Place } from "./places";

const UNIT_KEY = "weather-unit";

function readUnit(): TemperatureUnit {
  try {
    return localStorage.getItem(UNIT_KEY) === "F" ? "F" : "C";
  } catch {
    return "C"; // storage blocked: just use the default
  }
}

/** °C or °F, remembered in this browser. */
export function useUnit(): [TemperatureUnit, (unit: TemperatureUnit) => void] {
  const [unit, setUnitState] = useState(readUnit);
  const setUnit = useCallback((next: TemperatureUnit) => {
    setUnitState(next);
    try {
      localStorage.setItem(UNIT_KEY, next);
    } catch {
      // not persisted; fine
    }
  }, []);
  return [unit, setUnit];
}

/**
 * The selected place, kept in the URL so a refresh or shared link shows the
 * same one: `?city=amsterdam` for built-in cities, coordinates and name for
 * search results. Anything unreadable falls back to Amsterdam.
 */
export function usePlace(): [Place, (place: Place) => void] {
  const [place, setPlaceState] = useState(() => placeFromSearch(window.location.search) ?? DEFAULT_PLACE);
  const setPlace = useCallback((next: Place) => {
    setPlaceState(next);
    const url = new URL(window.location.href);
    url.search = placeToSearch(next).toString();
    window.history.replaceState(window.history.state, "", url);
  }, []);
  return [place, setPlace];
}
