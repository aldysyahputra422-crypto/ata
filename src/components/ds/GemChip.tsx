import { categoryMeta, type GemTone } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { categoryIcon } from "./category-icons";

export function GemChip({
  tone = "lavender",
  size = "md",
  icon,
  className,
  children,
}: {
  tone?: GemTone;
  size?: "md" | "sm";
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("gem", size === "sm" && "gem--sm", className)} data-tone={tone}>
      {icon}
      {children}
    </span>
  );
}

/** Category chip with the fixed tone + glyph mapping (DESIGN-SYSTEM 9.2). */
export function CategoryChip({ category, size = "md" }: { category: string; size?: "md" | "sm" }) {
  const meta = categoryMeta(category);
  return (
    <GemChip tone={meta.tone} size={size} icon={categoryIcon(meta.code)}>
      {meta.label}
    </GemChip>
  );
}

/** Mentor suggestion shown as a collaboration-style cursor chip (ref 3). */
export function MentorChip({ name, tone, point = "left" }: { name: string; tone: GemTone; point?: "left" | "right" }) {
  return (
    <span className="mentor-chip" data-point={point}>
      <svg className="mentor-chip__arrow" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M1 1l5.2 13 2-5.6 5.6-2z" fill={`var(--gem-${tone}-bot)`} />
      </svg>
      <GemChip tone={tone}>{name}</GemChip>
    </span>
  );
}
