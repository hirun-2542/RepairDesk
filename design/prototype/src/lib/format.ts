import { NOW } from "../data/mock";
const fmt = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
export const fmtDate = (iso: string) => fmt.format(new Date(iso));
export function ago(iso: string) {
  const m = Math.max(0, Math.round((NOW - new Date(iso).getTime()) / 60_000));
  if (m < 60) return `${m || 1} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return `${Math.round(h / 24)} วันที่แล้ว`;
}
