import { LocationSchema, WeatherQuerySchema, type Location } from "@portfolio/shared";
import { CITIES, DEFAULT_CITY_ID, findCity, type City } from "./cities";

/** Anything the app can forecast: a built-in city or a search result. */
export interface Place extends Location {
  /** Set for the built-in cities, which get short `?city=` URLs. */
  cityId?: string | undefined;
}

export const placeFromCity = ({ id, name, country, lat, lon }: City): Place => ({
  cityId: id,
  name,
  region: "",
  country,
  lat,
  lon,
});

export const DEFAULT_PLACE: Place = placeFromCity(findCity(DEFAULT_CITY_ID) ?? CITIES[0]);

/** Stable identity for keys and request tracking. */
export const placeKey = (place: Place) =>
  place.cityId ?? `${place.lat.toFixed(2)},${place.lon.toFixed(2)}:${place.name}`;

/** Region and country, skipping parts that repeat the name ("Gibraltar") or each other. */
export function placeDetail(place: Place): string {
  const parts: string[] = [];
  for (const part of [place.region, place.country]) {
    if (part && part !== place.name && !parts.includes(part)) parts.push(part);
  }
  return parts.join(", ");
}

export const placeLabel = (place: Place) => [place.name, placeDetail(place)].filter(Boolean).join(", ");

/** Case- and accent-insensitive form: "Reykjavík" matches "reykjavik". */
export const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/**
 * Filters the built-in cities as you type. Name prefixes rank first, then
 * matches inside the name, then cities whose country starts with the query.
 * An empty query lists every city, so the box also works as a plain list.
 */
export function matchCities(query: string, limit = Infinity): Place[] {
  const q = fold(query);
  if (!q) return CITIES.map(placeFromCity);
  const rank = (city: City) => {
    const name = fold(city.name);
    if (name.startsWith(q)) return 0;
    if (name.includes(q)) return 1;
    if (fold(city.country).startsWith(q)) return 2;
    return undefined;
  };
  return CITIES.flatMap((city) => {
    const r = rank(city);
    return r === undefined ? [] : [{ city, r }];
  })
    .sort((a, b) => a.r - b.r)
    .slice(0, limit)
    .map(({ city }) => placeFromCity(city));
}

const samePlace = (a: Place, b: Place) =>
  fold(a.name) === fold(b.name) && Math.abs(a.lat - b.lat) < 0.25 && Math.abs(a.lon - b.lon) < 0.25;

/** Built-in matches first, then search results, each place listed once. */
export function mergeResults(local: Place[], remote: Place[]): Place[] {
  const merged = [...local];
  for (const place of remote) if (!merged.some((other) => samePlace(other, place))) merged.push(place);
  return merged;
}

/** Built-in cities as `?city=amsterdam`; anything else by coordinates and name. */
export function placeToSearch(place: Place): URLSearchParams {
  if (place.cityId) return new URLSearchParams({ city: place.cityId });
  const params = new URLSearchParams({
    lat: String(place.lat),
    lon: String(place.lon),
    name: place.name,
    country: place.country,
  });
  if (place.region) params.set("region", place.region);
  return params;
}

export function placeFromSearch(search: string): Place | undefined {
  const params = new URLSearchParams(search);
  const city = findCity(params.get("city"));
  if (city) return placeFromCity(city);

  const coords = WeatherQuerySchema.safeParse({ lat: params.get("lat") ?? "", lon: params.get("lon") ?? "" });
  if (!coords.success) return undefined;
  const place = LocationSchema.safeParse({
    ...coords.data,
    name: params.get("name")?.trim(),
    region: params.get("region")?.trim() ?? "",
    country: params.get("country")?.trim(),
  });
  return place.success ? place.data : undefined;
}
