import { describe, expect, it } from "vitest";
import { AISLE_AFTER_ROW, buildSeatMap, parseSeats, seatLabel, sortSeats } from "./seats";
import { parseMovieId, selectionSearch } from "./selection";

describe("buildSeatMap", () => {
  it("has 10 rows of seats A–J, numbered from the front", () => {
    const map = buildSeatMap();
    expect(map).toHaveLength(10);
    expect(map.every((row) => row.length === 10)).toBe(true);
    expect(map[0]?.[0]).toBe("1A");
    expect(map[9]?.[9]).toBe("10J");
    expect(new Set(map.flat()).size).toBe(100);
    expect(AISLE_AFTER_ROW).toBe(5);
  });
});

describe("parseSeats", () => {
  it("reads a comma list, sorted front to back", () => {
    expect(parseSeats("2B,1A,10C")).toEqual(["1A", "2B", "10C"]);
  });

  it("drops unknown and repeated seats, and tolerates case and spaces", () => {
    expect(parseSeats("1a, 0A,11A,1K,1A,banana,,5E")).toEqual(["1A", "5E"]);
  });

  it("caps the list at the order limit", () => {
    expect(parseSeats("1A,1B,1C,1D,1E,1F,1G,1H,1I,1J,2A,2B")).toHaveLength(10);
  });

  it("handles a missing value", () => {
    expect(parseSeats(null)).toEqual([]);
  });
});

describe("helpers", () => {
  it("sorts by row then column", () => {
    expect(sortSeats(["10A", "2J", "2A"])).toEqual(["2A", "2J", "10A"]);
  });

  it("names seats for screen readers", () => {
    expect(seatLabel("10C")).toBe("Row 10, seat C");
  });

  it.each([
    ["123", 123],
    ["0", undefined],
    ["-4", undefined],
    ["1.5", undefined],
    ["12abc", undefined],
    ["", undefined],
    [null, undefined],
  ])("parseMovieId(%j) is %j", (value, expected) => {
    expect(parseMovieId(value)).toBe(expected);
  });

  it("keeps commas readable in the URL", () => {
    expect(selectionSearch({ movieId: 7, seats: ["1A", "1B"] })).toBe("movie=7&seats=1A,1B");
    expect(selectionSearch({ movieId: 7, seats: [] })).toBe("movie=7");
  });
});
