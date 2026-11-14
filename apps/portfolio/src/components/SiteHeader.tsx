import { ButtonLink, cn, focusRing, ThemeToggle } from "@portfolio/ui";
import { navItems, profile, socialLinks } from "../content/content";
import { BrandIcon } from "./Icon";

const github = socialLinks.find((link) => link.kind === "github");

export function SiteHeader({ activeId }: { activeId: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-outline bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-4 px-page-margin md:h-20">
        <a href="#hero" className={cn("group flex items-center gap-3", focusRing)}>
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center border border-outline bg-surface-container font-headline font-bold text-primary transition-colors group-hover:border-primary"
          >
            {profile.initials}
          </span>
          <span>
            <span className="block font-headline text-label-lg font-bold tracking-tight whitespace-nowrap">{profile.name}</span>
            <span className="block font-mono text-[11px] whitespace-nowrap text-on-surface-muted">{profile.role}</span>
          </span>
        </a>

        <nav aria-label="Primary" className="hidden md:block">
          <ul className="flex items-center gap-6 font-label text-label-md whitespace-nowrap lg:gap-8">
            {navItems.map((item) => {
              const current = activeId === item.href.slice(1);
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={current ? "location" : undefined}
                    className={cn(
                      "transition-colors hover:text-primary",
                      focusRing,
                      current ? "text-primary" : "text-on-surface-muted",
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {github && (
            // Visibility lives on a wrapper: `hidden` on the button itself would
            // fight its own `inline-flex`. Shown on small phones-up, but hidden
            // on tablets where the section nav needs the room.
            <span className="hidden sm:contents md:hidden lg:contents">
              <ButtonLink href={github.href} external variant="secondary" size="sm">
                <BrandIcon kind="github" size={16} />
                GitHub
              </ButtonLink>
            </span>
          )}
          <ButtonLink href="#contact" size="sm" className="whitespace-nowrap">
            <span className="sm:hidden">Connect</span>
            <span className="hidden sm:inline">Hire / Connect</span>
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
