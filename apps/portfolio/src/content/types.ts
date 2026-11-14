import type { InquiryType } from "@portfolio/shared";
import type { Tone } from "@portfolio/ui";

/** Copy with an optional shorter variant shown below the `sm` breakpoint. */
export interface Copy {
  full: string;
  short?: string;
}

export type IconName =
  | "home"
  | "folder"
  | "terminal"
  | "mail"
  | "devices"
  | "server"
  | "gauge"
  | "database"
  | "code";

export interface Metric {
  value: string;
  label: string;
  tone?: Tone;
}

export interface NavItem {
  href: `#${string}`;
  label: string;
}

export interface TabItem extends NavItem {
  icon: IconName;
}

export interface Profile {
  name: string;
  initials: string;
  role: string;
  availability: Copy;
  headline: Copy;
  /** Follows the bolded name: "I’m <name>{introRest}". */
  introRest: Copy;
  metrics: Metric[];
  /** Rendered as a JSON-style card. */
  profileCard: { filename: string; fields: Record<string, string | string[]> };
  location: { label: string; value: string };
}

export const PROJECT_SLUGS = ["weather", "seatpicker"] as const;
export type ProjectSlug = (typeof PROJECT_SLUGS)[number];

export interface CaseStudy {
  heading: string;
  tags: string[];
  status: string;
  intro: string;
  metrics: Metric[];
  challenge: string;
  solution: string;
  evolution: string;
  snippet: { filename: string; language: string; code: string };
}

export interface Project {
  slug: ProjectSlug;
  title: string;
  shortTitle: string;
  summary: Copy;
  badges: { label: string; variant: "accent" | "muted" }[];
  statusLabel: string;
  highlightsIcon: IconName;
  highlights: string[];
  stack: string[];
  liveUrl: string;
  liveLabel: string;
  repoUrl: string;
  caseStudy: CaseStudy;
}

export interface Roadmap {
  title: string;
  status: string;
  description: string;
  link: { href: string; label: string };
}

export interface Capability {
  title: string;
  icon: IconName;
  tone: Tone;
  blurb: string;
  items: { name: string; level: string; tone: Tone }[];
}

export interface EngagementPoint {
  title: string;
  body: string;
  tone: Tone;
}

export interface SocialLink {
  kind: "github" | "linkedin";
  href: string;
  label: string;
  handle: string;
}

export interface ContactCopy {
  eyebrow: string;
  title: string;
  intro: string;
  inquiryLabels: Record<InquiryType, string>;
}
