import type { ReactNode } from "react";
import { cn } from "./cn";

export type TagVariant = "accent" | "muted" | "chip" | "status";

const variants: Record<TagVariant, string> = {
  accent: "bg-surface-container-high text-accent-ink font-semibold",
  muted: "bg-surface-container-high text-on-surface-muted",
  chip: "border border-outline bg-surface text-on-surface-muted",
  status: "bg-accent/15 text-accent-ink font-semibold",
};

interface TagProps {
  variant?: TagVariant | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** Small mono label: project badges, stack chips, status pills. */
export function Tag({ variant = "chip", className, children }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 font-mono text-label-sm",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
