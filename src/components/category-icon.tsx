import {
  AirVent,
  Car,
  Laptop,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { CATEGORY_LABEL } from "@/domain/labels";
import type { ItemCategory } from "@/domain/types";

export const CATEGORY_ICON: Record<ItemCategory, LucideIcon> = {
  PHONE: Smartphone,
  COMPUTER: Laptop,
  CAR: Car,
  AIRCON: AirVent,
};

export function CategoryIcon({
  c,
  size = 16,
}: {
  c: ItemCategory;
  size?: number;
}) {
  const Icon = CATEGORY_ICON[c];
  return (
    <span className="catico" title={CATEGORY_LABEL[c]}>
      <Icon size={size} aria-label={CATEGORY_LABEL[c]} />
    </span>
  );
}
