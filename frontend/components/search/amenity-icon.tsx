import {
  AirVent,
  Bath,
  Car,
  ChefHat,
  Dumbbell,
  Flame,
  Flower2,
  Laptop,
  Mountain,
  PawPrint,
  Refrigerator,
  ShieldCheck,
  Tv,
  Utensils,
  WashingMachine,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/** Lucide icons for the amenities that have a fitting one; the rest are shown as text. */
const ICONS: Record<string, LucideIcon> = {
  "air-conditioning": AirVent,
  wifi: Wifi,
  pool: Waves,
  tv: Tv,
  kitchen: ChefHat,
  "free-parking": Car,
  "washing-machine": WashingMachine,
  bathtub: Bath,
  heating: Flame,
  "indoor-fireplace": Flame,
  "dedicated-workspace": Laptop,
  gym: Dumbbell,
  garden: Flower2,
  "mountain-view": Mountain,
  "beach-access": Waves,
  "lake-access": Waves,
  "pets-allowed": PawPrint,
  refrigerator: Refrigerator,
  "dining-table": Utensils,
  "smoke-alarm": ShieldCheck,
};

export function hasAmenityIcon(slug: string): boolean {
  return slug in ICONS;
}

export function AmenityIcon({ slug, size = 20 }: { slug: string; size?: number }) {
  const Icon = ICONS[slug];
  return Icon ? <Icon size={size} strokeWidth={1.5} aria-hidden /> : null;
}
