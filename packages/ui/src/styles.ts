import { cn } from "./cn";

export type Tone = "default" | "primary" | "accent" | "success" | "warning";

/** Text color per tone. Uses the *-ink tokens so small text keeps AA contrast. */
export const toneText: Record<Tone, string> = {
  default: "text-on-surface",
  primary: "text-primary",
  accent: "text-accent-ink",
  success: "text-success-ink",
  warning: "text-warning",
};

export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "link";
export type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:opacity-90 active:scale-[0.98]",
  secondary:
    "border border-outline bg-surface-container text-on-surface hover:border-primary hover:bg-surface-container-high",
  ghost: "text-on-surface-muted hover:text-primary",
  link: "text-primary hover:underline",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-label-md",
  md: "px-4 py-2 text-label-md",
  lg: "px-6 py-3 text-label-lg",
};

const ghostSizes: Record<ButtonSize, string> = {
  sm: "text-label-md",
  md: "text-label-md",
  lg: "text-label-lg",
};

export interface ButtonStyleOptions {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
}

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 font-label font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    focusRing,
    buttonVariants[variant],
    variant === "ghost" || variant === "link" ? ghostSizes[size] : buttonSizes[size],
    className,
  );
}
