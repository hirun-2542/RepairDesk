import {
  Inbox,
  ScanSearch,
  FileClock,
  BadgeCheck,
  Wrench,
  PackageCheck,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER } from "@/domain/labels";
import type { JobStatus } from "@/domain/types";
export const STATUS_ICON = {
  RECEIVED: Inbox,
  DIAGNOSING: ScanSearch,
  QUOTED: FileClock,
  APPROVED: BadgeCheck,
  REPAIRING: Wrench,
  READY_FOR_PICKUP: PackageCheck,
  COMPLETED: CircleCheck,
  CANCELLED: CircleX,
};
export function StatusBadge({ status }: { status: JobStatus }) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={"badge badge-lg st-" + status}>
      <Icon size={16} />
      {STATUS_LABEL[status]}
    </span>
  );
}
export function Stepper({ status }: { status: JobStatus }) {
  const steps = STATUS_ORDER.filter((s) => s !== "CANCELLED");
  const current = steps.findIndex((s) => s === status);
  return (
    <ol className="stepper" aria-label="ความคืบหน้างาน">
      {steps.map((step, index) => {
        const Icon = STATUS_ICON[step];
        return (
          <li
            key={step}
            className={
              "step " +
              (index < current ? "done" : index === current ? "cur" : "")
            }
            aria-current={index === current ? "step" : undefined}
          >
            <span className="node">
              <Icon size={16} />
            </span>
            <span>{STATUS_LABEL[step]}</span>
          </li>
        );
      })}
    </ol>
  );
}
const dateFormat = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date | string) {
  return dateFormat.format(typeof date === "string" ? new Date(date) : date);
}

const relativeAge = new Intl.RelativeTimeFormat("th-TH", { numeric: "auto" });

/** Short "how long ago" age for board cards; pair with formatDate in a title attribute. */
export function formatRelativeAge(date: Date | string) {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (Math.abs(minutes) < 60) return relativeAge.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeAge.format(-hours, "hour");
  return relativeAge.format(-Math.round(hours / 24), "day");
}
