import { LuMoon, LuSun } from "react-icons/lu";
import { useTheme } from "./useTheme";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`inline-flex size-9 items-center justify-center border border-outline bg-surface-container text-on-surface transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${className}`}
    >
      {isDark ? <LuSun aria-hidden size={18} /> : <LuMoon aria-hidden size={18} />}
    </button>
  );
}
