import { Button, ButtonLink, IconTile, Tag } from "@portfolio/ui";
import { useEffect, useRef } from "react";
import { LuArrowLeft, LuArrowRight, LuArrowUpRight, LuBraces, LuX } from "react-icons/lu";
import { projects } from "../content/content";
import type { ProjectSlug } from "../content/types";
import { BrandIcon } from "./Icon";

interface CaseStudyDialogProps {
  /** Which case study is open; null when closed. Driven by the URL. */
  slug: ProjectSlug | null;
  onClose: () => void;
  onNavigate: (slug: ProjectSlug) => void;
}

/**
 * One native modal <dialog> for every case study. The browser provides the
 * focus trap, Esc handling and focus return; the URL (`?case=`) is the source
 * of truth for which study is open.
 */
export function CaseStudyDialog({ slug, onClose, onNavigate }: CaseStudyDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const slugRef = useRef(slug);
  const index = projects.findIndex((p) => p.slug === slug);
  const project = projects[index];
  const prev = projects[index - 1];
  const next = projects[index + 1];

  useEffect(() => {
    slugRef.current = slug;
  });

  // Sync the dialog's open state to the URL, and start each study at the top.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (slug && !dialog.open) dialog.showModal();
    if (!slug && dialog.open) dialog.close();
    dialog.scrollTop = 0;
  }, [slug]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="case-study-title"
      // Esc closes the dialog natively; tell the URL. If the URL already
      // cleared (Back button), there is nothing left to do.
      onClose={() => {
        if (slugRef.current) onClose();
      }}
      // A click on the dialog element itself (not its content) is a backdrop click.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto h-full max-h-full w-full max-w-full overflow-y-auto overscroll-contain bg-surface-container text-on-surface backdrop:bg-black/60 backdrop:backdrop-blur-sm md:h-auto md:max-h-[88vh] md:max-w-4xl md:border md:border-outline"
    >
      {project && (
        <div>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-outline bg-surface-container px-6 py-4">
            <p className="flex items-center gap-2 font-mono text-label-sm text-on-surface-muted">
              <span aria-hidden="true" className="inline-block size-2 bg-accent" />
              {project.caseStudy.heading}
            </p>
            <Button variant="secondary" size="sm" onClick={onClose} aria-label="Close case study">
              <LuX aria-hidden size={18} />
            </Button>
          </div>

          <div className="space-y-10 p-6 md:p-10">
            <header className="space-y-4">
              <ul aria-label="Technologies" className="flex flex-wrap gap-2">
                {project.caseStudy.tags.map((tag) => (
                  <li key={tag}>
                    <Tag>{tag}</Tag>
                  </li>
                ))}
                <li>
                  <Tag variant="status">{project.caseStudy.status}</Tag>
                </li>
              </ul>
              <h2 id="case-study-title" className="font-headline text-headline-lg-mobile md:text-headline-lg">
                {project.title}
              </h2>
              <p className="max-w-3xl text-body-lg text-on-surface-muted">{project.caseStudy.intro}</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <ButtonLink href={project.liveUrl}>
                  Launch Live App
                  <LuArrowUpRight aria-hidden size={16} />
                </ButtonLink>
                <ButtonLink href={project.repoUrl} external variant="secondary">
                  <BrandIcon kind="github" size={16} />
                  Inspect Source
                </ButtonLink>
              </div>
            </header>

            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {project.caseStudy.metrics.map((metric) => (
                <div key={metric.label} className="border border-outline bg-surface-container-high p-4">
                  <dt className="font-mono text-label-sm text-on-surface-muted">{metric.label}</dt>
                  <dd className="mt-1 font-headline text-headline-sm">{metric.value}</dd>
                </div>
              ))}
            </dl>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {(
                [
                  ["The Challenge", project.caseStudy.challenge],
                  ["Architecture Solution", project.caseStudy.solution],
                  ["Full-Stack Evolution", project.caseStudy.evolution],
                ] as const
              ).map(([title, body], i) => (
                <section key={title} aria-labelledby={`case-${String(i)}`} className="space-y-3">
                  <IconTile size="sm" tone={i === 1 ? "accent" : "primary"} className="font-mono text-sm font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </IconTile>
                  <h3 id={`case-${String(i)}`} className="font-headline text-headline-sm">
                    {title}
                  </h3>
                  <p className="text-body-sm text-on-surface-muted">{body}</p>
                </section>
              ))}
            </div>

            <figure className="border border-outline">
              <figcaption className="flex items-center justify-between gap-4 border-b border-outline bg-surface-container-high px-4 py-3">
                <span className="flex min-w-0 items-center gap-2 font-mono text-label-sm">
                  <LuBraces aria-hidden size={16} className="shrink-0 text-accent-ink" />
                  <span className="truncate">{project.caseStudy.snippet.filename}</span>
                </span>
                <Tag variant="muted">{project.caseStudy.snippet.language}</Tag>
              </figcaption>
              <pre
                tabIndex={0}
                aria-label={`Code: ${project.caseStudy.snippet.filename}`}
                className="overflow-x-auto bg-surface p-4 font-mono text-xs leading-relaxed"
              >
                <code>{project.caseStudy.snippet.code}</code>
              </pre>
            </figure>

            <nav
              aria-label="Case studies"
              className="flex flex-col gap-4 border-t border-outline pt-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-body-sm text-on-surface-muted">
                Project {index + 1} of {projects.length}:{" "}
                <span className="font-semibold text-on-surface">{project.shortTitle}</span>
              </p>
              <div className="flex flex-wrap gap-3">
                {prev && (
                  <Button variant="secondary" onClick={() => onNavigate(prev.slug)}>
                    <LuArrowLeft aria-hidden size={16} />
                    Previous: {prev.shortTitle}
                  </Button>
                )}
                {next && (
                  <Button variant="secondary" onClick={() => onNavigate(next.slug)}>
                    Next: {next.shortTitle}
                    <LuArrowRight aria-hidden size={16} />
                  </Button>
                )}
              </div>
            </nav>
          </div>
        </div>
      )}
    </dialog>
  );
}
