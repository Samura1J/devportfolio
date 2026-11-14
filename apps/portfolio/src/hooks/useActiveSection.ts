import { useEffect, useState } from "react";

/**
 * Returns the id of the last listed section that has reached the upper half
 * of the viewport (the one being read), for `aria-current` in the navs. Pass a stable (module-level)
 * array. Returns null where IntersectionObserver is unavailable.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActive(ids.findLast((id) => visible.has(id)) ?? null);
      },
      // A band just under the sticky header, down to the middle of the screen.
      { rootMargin: "-80px 0px -50% 0px" },
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [ids]);

  return active;
}
