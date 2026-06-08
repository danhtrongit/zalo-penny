import { describe, it, expect } from "vitest";
import { toCsv } from "./csv";

interface Row {
  a: string;
  b: string;
  n?: number;
}

describe("toCsv", () => {
  it("writes a header row and escapes commas/quotes", () => {
    const csv = toCsv<Row>(
      [{ a: "x,y", b: 'he said "hi"' }],
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
      ]
    );
    const lines = csv.split("\n");
    expect(lines[0]).toBe("A,B");
    expect(lines[1]).toBe('"x,y","he said ""hi"""');
  });

  it("supports a value accessor", () => {
    const csv = toCsv<Row>([{ a: "", b: "", n: 5 }], [{ key: "n", label: "N", value: (r) => (r.n ?? 0) * 2 }]);
    expect(csv).toBe("N\n10");
  });

  it("returns just the header for empty rows", () => {
    expect(toCsv<Row>([], [{ key: "a", label: "A" }])).toBe("A");
  });
});
