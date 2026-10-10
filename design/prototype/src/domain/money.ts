export function computeQuoteTotals(lines: { qty: number; unitPrice: number }[]) {
  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const vat = Math.round((subtotal * 7) / 100);
  return { subtotal, vat, total: subtotal + vat };
}
export const formatTHB = (satang: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(satang / 100);

export function parseBahtToSatang(input: string): number {
  const s = input.replace(/,/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error("จำนวนเงินไม่ถูกต้อง");
  return Math.round(parseFloat(s) * 100);
}
