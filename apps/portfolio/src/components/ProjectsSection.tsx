import { ButtonLink, IconTile, SectionHeader, Tag } from "@portfolio/ui";
import { LuArrowUpRight } from "react-icons/lu";
import { projects, roadmap } from "../content/content";
import type { ProjectSlug } from "../content/types";
import { Icon } from "./Icon";
import { ProjectCard } from "./ProjectCard";

export function ProjectsSection({ onOpenCaseStudy }: { onOpenCaseStudy: (slug: ProjectSlug) => void }) {
  return (
    <section id="projects" aria-labelledby="projects-title" className="space-y-8">
      <SectionHeader
        id="projects-title"
        eyebrow="Case Studies & Production Apps"
        title="Featured Projects"
        intro="Each project lists the architecture, the problems it solves, and the technical decisions behind it."
        split
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} onOpenCaseStudy={onOpenCaseStudy} />
        ))}
      </div>

      {roadmap && (
        <div className="flex flex-col items-start justify-between gap-4 border border-dashed border-outline bg-surface-container p-6 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <IconTile tone="accent" size="lg">
              <Icon name="database" size={24} />
            </IconTile>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-headline text-headline-sm">{roadmap.title}</h3>
                <Tag variant="status">{roadmap.status}</Tag>
              </div>
              <p className="mt-1 text-body-sm text-on-surface-muted">{roadmap.description}</p>
            </div>
          </div>
          <ButtonLink href={roadmap.link.href} external variant="link" className="whitespace-nowrap">
            {roadmap.link.label}
            <LuArrowUpRight aria-hidden size={16} />
          </ButtonLink>
        </div>
      )}
    </section>
  );
}
