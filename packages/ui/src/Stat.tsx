import { cn } from "./cn";
import { toneText, type Tone } from "./styles";

interface StatProps {
  value: string;
  label: string;
  tone?: Tone | undefined;
  /** "lg" for hero metrics, "sm" for compact metric bars. */
  size?: "sm" | "lg" | undefined;
}

export function Stat({ value, label, tone = "default", size = "lg" }: StatProps) {
  return (
    <div>
      <p
        className={cn(
          "font-headline font-bold",
          size === "lg" ? "text-headline-sm" : "text-body-md",
          toneText[tone],
        )}
      >
        {value}
      </p>
      <p className="text-body-sm text-on-surface-muted">{label}</p>
    </div>
  );
}
