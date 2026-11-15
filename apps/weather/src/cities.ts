/**
 * Generated once from the old app's city_coordinates.csv (56 cities). Gibraltar has
 * no country there, so it repeats the name; the UI then shows the name once.
 */
export interface City {
  /** URL-safe, ASCII: used in ?city=. */
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export const CITIES = [
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", lat: 52.367, lon: 4.904 },
  { id: "ankara", name: "Ankara", country: "Turkey", lat: 39.933, lon: 32.859 },
  { id: "astorp", name: "Åstorp", country: "Sweden", lat: 56.134, lon: 12.945 },
  { id: "athens", name: "Athens", country: "Greece", lat: 37.983, lon: 23.727 },
  { id: "barcelona", name: "Barcelona", country: "Spain", lat: 41.387, lon: 2.168 },
  { id: "belfast", name: "Belfast", country: "Northern Ireland", lat: 54.597, lon: -5.93 },
  { id: "berlin", name: "Berlin", country: "Germany", lat: 52.52, lon: 13.405 },
  { id: "bern", name: "Bern", country: "Switzerland", lat: 46.948, lon: 7.447 },
  { id: "bilbao", name: "Bilbao", country: "Spain", lat: 43.263, lon: -2.935 },
  { id: "brussels", name: "Brussels", country: "Belgium", lat: 50.847, lon: 4.357 },
  { id: "bucharest", name: "Bucharest", country: "Romania", lat: 44.44, lon: 26.107 },
  { id: "budapest", name: "Budapest", country: "Hungary", lat: 47.5, lon: 19.04 },
  { id: "cardiff", name: "Cardiff", country: "Wales", lat: 51.483, lon: -3.168 },
  { id: "cologne", name: "Cologne", country: "Germany", lat: 50.937, lon: 6.96 },
  { id: "copenhagen", name: "Copenhagen", country: "Denmark", lat: 55.676, lon: 12.568 },
  { id: "cork", name: "Cork", country: "Ireland", lat: 51.898, lon: -8.475 },
  { id: "dublin", name: "Dublin", country: "Ireland", lat: 53.349, lon: -6.26 },
  { id: "edinburgh", name: "Edinburgh", country: "Scotland", lat: 55.953, lon: -3.188 },
  { id: "florence", name: "Florence", country: "Italy", lat: 43.7696, lon: 11.255 },
  { id: "frankfurt", name: "Frankfurt", country: "Germany", lat: 50.11, lon: 8.682 },
  { id: "french-riviera", name: "French Riviera", country: "France", lat: 43.254, lon: 6.637 },
  { id: "funchal", name: "Funchal", country: "Portugal", lat: 32.65, lon: -16.908 },
  { id: "gibraltar", name: "Gibraltar", country: "Gibraltar", lat: 36.14, lon: -5.353 },
  { id: "gothenburg", name: "Gothenburg", country: "Sweden", lat: 57.708, lon: 11.974 },
  { id: "hamburg", name: "Hamburg", country: "Germany", lat: 53.548, lon: 9.987 },
  { id: "helsinki", name: "Helsinki", country: "Finland", lat: 60.169, lon: 24.938 },
  { id: "ibiza", name: "Ibiza", country: "Spain", lat: 39.02, lon: 1.482 },
  { id: "kyiv", name: "Kyiv", country: "Ukraine", lat: 50.45, lon: 30.523 },
  { id: "lillehammer", name: "Lillehammer", country: "Norway", lat: 61.115, lon: 10.466 },
  { id: "lisbon", name: "Lisbon", country: "Portugal", lat: 38.722, lon: -9.139 },
  { id: "london", name: "London", country: "England", lat: 51.507, lon: -0.127 },
  { id: "madrid", name: "Madrid", country: "Spain", lat: 40.416, lon: -3.703 },
  { id: "mallorca", name: "Mallorca", country: "Spain", lat: 39.695, lon: 3.017 },
  { id: "manchester", name: "Manchester", country: "England", lat: 53.48, lon: -2.242 },
  { id: "marseille", name: "Marseille", country: "France", lat: 43.296, lon: 5.369 },
  { id: "maspalomas", name: "Maspalomas", country: "Spain", lat: 27.76, lon: -15.586 },
  { id: "milan", name: "Milan", country: "Italy", lat: 45.464, lon: 9.19 },
  { id: "munich", name: "Munich", country: "Germany", lat: 48.135, lon: 11.582 },
  { id: "naples", name: "Naples", country: "Italy", lat: 40.851, lon: 14.268 },
  { id: "onati", name: "Oñati", country: "Spain", lat: 43.034, lon: -2.417 },
  { id: "oslo", name: "Oslo", country: "Norway", lat: 59.913, lon: 10.752 },
  { id: "paris", name: "Paris", country: "France", lat: 48.856, lon: 2.352 },
  { id: "prague", name: "Prague", country: "Czech Republic", lat: 50.075, lon: 14.437 },
  { id: "reykjavik", name: "Reykjavík", country: "Iceland", lat: 64.146, lon: -21.942 },
  { id: "riga", name: "Riga", country: "Latvia", lat: 56.879, lon: 24.603 },
  { id: "rome", name: "Rome", country: "Italy", lat: 41.902, lon: 12.496 },
  { id: "santa-cruz-das-flores", name: "Santa Cruz das Flores", country: "Portugal", lat: 39.453, lon: -31.127 },
  { id: "santa-cruz-de-tenerife", name: "Santa Cruz de Tenerife", country: "Spain", lat: 28.463, lon: -16.251 },
  { id: "skye", name: "Skye", country: "Scotland", lat: 57.273, lon: -6.215 },
  { id: "sofia", name: "Sofia", country: "Bulgaria", lat: 42.697, lon: 23.321 },
  { id: "stockholm", name: "Stockholm", country: "Sweden", lat: 59.329, lon: 18.068 },
  { id: "tallinn", name: "Tallinn", country: "Estonia", lat: 59.437, lon: 24.753 },
  { id: "vienna", name: "Vienna", country: "Austria", lat: 18.208, lon: 16.373 },
  { id: "warsaw", name: "Warsaw", country: "Poland", lat: 52.229, lon: 21.012 },
  { id: "york", name: "York", country: "England", lat: 53.961, lon: -1.07 },
  { id: "zurich", name: "Zurich", country: "Switzerland", lat: 47.376, lon: 8.541 },
] as const satisfies readonly City[];

export const DEFAULT_CITY_ID = "amsterdam";

export function findCity(id: string | null): City | undefined {
  return CITIES.find((city) => city.id === id);
}
