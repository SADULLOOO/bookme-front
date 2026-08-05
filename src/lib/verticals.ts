import { Building2, Dumbbell, HeartPulse, Scissors, Sparkles, Stethoscope, type LucideIcon } from "lucide-react";

export interface VerticalMeta {
  value: string;
  /** Translation key for the display label — look up via useT()(labelKey). */
  labelKey: string;
  icon: LucideIcon;
  photo: string;
}

export const VERTICALS: VerticalMeta[] = [
  {
    value: "barbershop",
    labelKey: "vertical.barbershop",
    icon: Scissors,
    photo: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=800&auto=format&fit=crop",
  },
  {
    value: "beauty_salon",
    labelKey: "vertical.beauty_salon",
    icon: Sparkles,
    photo: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=800&auto=format&fit=crop",
  },
  {
    value: "clinic",
    labelKey: "vertical.clinic",
    icon: Stethoscope,
    photo: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800&auto=format&fit=crop",
  },
  {
    value: "spa",
    labelKey: "vertical.spa",
    icon: HeartPulse,
    photo: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop",
  },
  {
    value: "fitness",
    labelKey: "vertical.fitness",
    icon: Dumbbell,
    photo: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop",
  },
  {
    value: "other",
    labelKey: "vertical.other",
    icon: Building2,
    photo: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=800&auto=format&fit=crop",
  },
];

export function verticalMeta(value: string): VerticalMeta {
  return VERTICALS.find((v) => v.value === value) ?? VERTICALS[VERTICALS.length - 1];
}
