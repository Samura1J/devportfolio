import type { ReactNode } from "react";
import { cn } from "./cn";
import { toneText, type Tone } from "./styles";

interface IconTileProps {
  tone?: Tone | undefined;
  size?: "sm" | "md" | "lg" | undefined;
  className?: string | undefined;
  children: ReactNode;
}

const sizes = { sm: "size-8", md: "size-10", lg: "size-12" } as const;

/** Square, bordered holder for a decorative icon or short glyph. */
export function IconTile({ tone = "primary", size = "md", className, children }: IconTileProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center border border-outline bg-surface-container-high",
        sizes[size],
        toneText[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
