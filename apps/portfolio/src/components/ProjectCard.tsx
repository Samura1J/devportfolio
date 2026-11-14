import { ButtonLink, Card, Tag } from "@portfolio/ui";
import type { MouseEvent } from "react";
import { LuArrowUpRight, LuEye } from "react-icons/lu";
import type { Project, ProjectSlug } from "../content/types";
import { Icon } from "./Icon";
import { ResponsiveText } from "./ResponsiveText";

interface ProjectCardProps {
  project: Project;
  onOpenCaseStudy: (slug: ProjectSlug) => void;
}

function isModifiedClick(event: MouseEvent): boolean {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function ProjectCard({ project, onOpenCaseStudy }: ProjectCardProps) {
  const titleId = `project-${project.slug}-title`;

  return (
    <Card
      as="article"
      interactive
      aria-labelledby={titleId}
      className="group flex flex-col justify-between p-6 md:p-8"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {project.badges.map((badge) => (
              <Tag key={badge.label} variant={badge.variant}>
                {badge.label}
              </Tag>
            ))}
          </div>
          <span className="font-mono text-label-sm text-on-surface-muted">{project.statusLabel}</span>
        </div>

        <div>
          <h3
            id={titleId}
            className="font-headline text-headline-md transition-colors group-hover:text-primary"
          >
            <ResponsiveText copy={{ full: project.title, short: project.shortTitle }} />
          </h3>
          <p className="mt-2 text-body-md text-on-surface-muted">
            <ResponsiveText copy={project.summary} />
          </p>
        </div>

        <div className="hidden space-y-2 border border-outline bg-surface-container-high p-4 sm:block">
          <p className="flex items-center gap-1.5 font-label text-label-sm font-semibold text-primary">
            <Icon name={project.highlightsIcon} size={16} />
            Engineering Decisions & Architecture
          </p>
          <ul className="list-inside list-disc space-y-1.5 text-body-sm">
            {project.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>

        <ul aria-label="Tech stack" className="flex flex-wrap gap-2">
          {project.stack.map((item) => (
            <li key={item}>
              <Tag>{item}</Tag>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-outline pt-6">
        <ButtonLink
          href={`?case=${project.slug}`}
          onClick={(event) => {
            // Plain clicks open the dialog in place; modified clicks keep link behavior.
            if (isModifiedClick(event)) return;
            event.preventDefault();
            onOpenCaseStudy(project.slug);
          }}
        >
          View Case Study
          <span className="sr-only">: {project.title}</span>
          <LuEye aria-hidden size={18} />
        </ButtonLink>
        <ButtonLink href={project.liveUrl} variant="ghost">
          {project.liveLabel}
          <span className="sr-only">: {project.title}</span>
          <LuArrowUpRight aria-hidden size={16} />
        </ButtonLink>
      </div>
    </Card>
  );
}
