import { cn, focusRing } from "@portfolio/ui";
import { footer, profile, socialLinks } from "../content/content";

const linkClass = cn("transition-colors hover:text-primary", focusRing);

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-outline bg-surface-container py-12">
      <div className="mx-auto flex max-w-page flex-col items-center justify-between gap-6 px-page-margin md:flex-row">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center border border-outline bg-surface text-sm font-bold text-primary"
          >
            {profile.initials}
          </span>
          <p className="text-body-sm text-on-surface-muted">
            © {new Date().getFullYear()} {profile.name}. {footer.tagline}
          </p>
        </div>

        <ul className="flex items-center gap-6 font-label text-label-md text-on-surface-muted">
          {socialLinks.map((link) => (
            <li key={link.kind}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {link.kind === "github" ? "GitHub" : "LinkedIn"}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
          <li>
            <a href="#hero" className={linkClass}>
              Back to top <span aria-hidden="true">↑</span>
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
