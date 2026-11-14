import type { HTMLAttributes } from "react";
import { cn } from "./cn";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: "div" | "article" | "section" | undefined;
  /** Highlights the border on hover, for cards that lead somewhere. */
  interactive?: boolean | undefined;
}

/** Flat, square container: surface fill with a crisp outline, no shadow. */
export function Card({ as: Element = "div", interactive = false, className, ...rest }: CardProps) {
  return (
    <Element
      className={cn(
        "border border-outline bg-surface-container",
        interactive && "transition-colors hover:border-primary",
        className,
      )}
      {...rest}
    />
  );
}
