import { describe, expect, it } from "vitest";
import { computeQuoteTotals, formatTHB, parseBahtToSatang } from "./money";

describe("computeQuoteTotals", () => {
  it("adds 7% VAT on integer satang (spec example)", () => {
    expect(
      computeQuoteTotals([
        { qty: 1, unitPrice: 100000 },
        { qty: 1, unitPrice: 33333 },
      ]),
    ).toEqual({ subtotal: 133333, vat: 9333, total: 142666 });
  });

  it("multiplies qty by unit price per line", () => {
    expect(
      computeQuoteTotals([
        { qty: 2, unitPrice: 50000 },
        { qty: 3, unitPrice: 10000 },
      ]),
    ).toEqual({ subtotal: 130000, vat: 9100, total: 139100 });
  });

  it("rounds VAT to the nearest satang", () => {
    expect(computeQuoteTotals([{ qty: 1, unitPrice: 33333 }])).toEqual({
      subtotal: 33333,
      vat: 2333,
      total: 35666,
    });
  });

  it("returns zero for an empty quote", () => {
    expect(computeQuoteTotals([])).toEqual({ subtotal: 0, vat: 0, total: 0 });
  });
});

describe("formatTHB", () => {
  it("formats satang as Thai baht currency", () => {
    expect(formatTHB(142666)).toBe("฿1,426.66");
    expect(formatTHB(123450)).toBe("฿1,234.50");
    expect(formatTHB(0)).toBe("฿0.00");
  });
});

describe("parseBahtToSatang", () => {
  it.each([
    ["1,234.50", 123450],
    ["1500", 150000],
    ["0", 0],
    ["12.3", 1230],
    ["1,234", 123400],
    [" 99.99 ", 9999],
  ])("parses %j → %i satang", (input, expected) => {
    expect(parseBahtToSatang(input)).toBe(expected);
  });

  it.each(["-1", "-0.01", "abc", "", "1.005", ".5", "1.2.3", "1,2.345", "  "])(
    "rejects %j with จำนวนเงินไม่ถูกต้อง",
    (input) => {
      expect(() => parseBahtToSatang(input)).toThrow("จำนวนเงินไม่ถูกต้อง");
    },
  );
});
