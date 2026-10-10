/** Money is stored as integer satang (1 บาท = 100 สตางค์). */

export type QuoteLineInput = { qty: number; unitPrice: number };

export type QuoteTotals = { subtotal: number; vat: number; total: number };

/** Amount = qty × unitPrice per line; VAT 7% on the subtotal, rounded to the nearest satang. */
export function computeQuoteTotals(lines: QuoteLineInput[]): QuoteTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.qty * line.unitPrice,
    0,
  );
  const vat = Math.round((subtotal * 7) / 100);
  return { subtotal, vat, total: subtotal + vat };
}

const thbFormat = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
});

export function formatTHB(satang: number): string {
  return thbFormat.format(satang / 100);
}

/** Parses a baht string such as "1,234.50" into satang. Throws on negative, non-numeric or >2 decimal input. */
export function parseBahtToSatang(input: string): number {
  const normalized = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new Error("จำนวนเงินไม่ถูกต้อง");
  return Math.round(Number.parseFloat(normalized) * 100);
}
