import type { ReactNode } from "react";
import { cn } from "./cn";

interface SectionHeaderProps {
  /** Becomes the heading's id, for `aria-labelledby` on the section. */
  id: string;
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  /** Puts the intro beside the title on wide screens instead of below it. */
  split?: boolean | undefined;
  /** Rule under the header; off when the section is already boxed. */
  divider?: boolean | undefined;
  className?: string | undefined;
}

export function SectionHeader({
  id,
  eyebrow,
  title,
  intro,
  split = false,
  divider = true,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        divider && "border-b border-outline pb-6",
        split && "flex flex-col justify-between gap-4 md:flex-row md:items-end",
        className,
      )}
    >
      <div>
        <p className="font-mono text-label-sm font-semibold tracking-wider text-accent-ink uppercase">
          {eyebrow}
        </p>
        <h2
          id={id}
          className="mt-1 font-headline text-headline-lg-mobile md:text-headline-lg"
        >
          {title}
        </h2>
      </div>
      {intro !== undefined && (
        <p className={cn("text-body-md text-on-surface-muted", split ? "max-w-md" : "mt-2 max-w-2xl")}>
          {intro}
        </p>
      )}
    </div>
  );
}
