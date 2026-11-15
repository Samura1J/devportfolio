import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLACE,
  fold,
  matchCities,
  mergeResults,
  placeDetail,
  placeFromSearch,
  placeLabel,
  placeToSearch,
  type Place,
} from "./places";

const names = (places: Place[]) => places.map((p) => p.name);

describe("matchCities", () => {
  it("lists every built-in city for an empty query", () => {
    expect(matchCities("")).toHaveLength(56);
  });

  it("ranks name prefixes before inner matches and country matches", () => {
    expect(names(matchCities("ber"))).toEqual(["Berlin", "Bern"]);
    expect(names(matchCities("lin"))).toEqual(["Berlin", "Dublin", "Tallinn"]);
    expect(names(matchCities("li"))).toEqual(["Lillehammer", "Lisbon", "Berlin", "Dublin", "Tallinn"]);
    expect(names(matchCities("spa"))).toEqual(expect.arrayContaining(["Barcelona", "Madrid"]));
  });

  it("ignores case and accents", () => {
    expect(names(matchCities("REYKJAVIK"))).toEqual(["Reykjavík"]);
    expect(names(matchCities("astorp"))).toEqual(["Åstorp"]);
    expect(fold(" Oñati ")).toBe("onati");
  });

  it("caps the list", () => {
    expect(matchCities("a", 5)).toHaveLength(5);
  });
});

describe("mergeResults", () => {
  it("drops search results that are a built-in city", () => {
    const local = matchCities("amsterdam");
    const remote: Place[] = [
      { name: "Amsterdam", region: "North Holland", country: "Netherlands", lat: 52.37, lon: 4.89 },
      { name: "Amsterdam", region: "New York", country: "United States of America", lat: 42.94, lon: -74.19 },
    ];
    const merged = mergeResults(local, remote);
    expect(merged.map((p) => p.cityId ?? p.region)).toEqual(["amsterdam", "New York"]);
  });

  it("lists a repeated search result once", () => {
    const bolivia: Place = { name: "Santa Cruz De La Sierra", region: "Santa Cruz", country: "Bolivia", lat: -17.8, lon: -63.17 };
    expect(mergeResults([], [bolivia, { ...bolivia, lat: -17.79 }])).toHaveLength(1);
  });
});

describe("labels", () => {
  it("skips parts that repeat the name or each other", () => {
    expect(placeLabel({ name: "Gibraltar", region: "", country: "Gibraltar", lat: 0, lon: 0 })).toBe("Gibraltar");
    expect(placeDetail({ name: "New York", region: "New York", country: "United States of America", lat: 0, lon: 0 })).toBe(
      "United States of America",
    );
    expect(placeLabel(DEFAULT_PLACE)).toBe("Amsterdam, Netherlands");
  });
});

describe("URL state", () => {
  it("uses ?city= for built-in cities", () => {
    expect(placeToSearch(DEFAULT_PLACE).toString()).toBe("city=amsterdam");
    expect(placeFromSearch("?city=amsterdam")).toEqual(DEFAULT_PLACE);
  });

  it("round-trips a search result by coordinates and name", () => {
    const place: Place = { name: "São Paulo", region: "Sao Paulo", country: "Brazil", lat: -23.53, lon: -46.62 };
    expect(placeFromSearch(`?${placeToSearch(place).toString()}`)).toEqual(place);
  });

  it.each([
    ["an unknown city", "?city=atlantis"],
    ["missing name", "?lat=1&lon=2&country=X"],
    ["bad coordinates", "?lat=95&lon=2&name=X&country=Y"],
    ["an overlong name", `?lat=1&lon=2&name=${"x".repeat(101)}&country=Y`],
    ["nothing", ""],
  ])("rejects %s", (_label, search) => {
    expect(placeFromSearch(search)).toBeUndefined();
  });
});

describe("built-in city data", () => {
  it("has no stray whitespace and unique ids", async () => {
    const { CITIES } = await import("./cities");
    for (const city of CITIES) {
      expect(city.name).toBe(city.name.trim());
      expect(city.country).toBe(city.country.trim());
    }
    expect(new Set(CITIES.map((c) => c.id)).size).toBe(CITIES.length);
  });
});
