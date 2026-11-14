import { cn, focusRing } from "@portfolio/ui";
import { tabItems } from "../content/content";
import { Icon } from "./Icon";

/** Bottom section nav for small screens; the header nav takes over from `md`. */
export function MobileTabBar({ activeId }: { activeId: string | null }) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-outline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="grid grid-cols-4">
        {tabItems.map((item) => {
          const current = activeId === item.href.slice(1);
          return (
            <li key={item.href}>
              <a
                href={item.href}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 font-label text-label-md transition-colors",
                  focusRing,
                  current ? "text-primary" : "text-on-surface-muted hover:text-on-surface",
                )}
              >
                <Icon name={item.icon} size={20} />
                {item.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
