import { ButtonLink, Stat } from "@portfolio/ui";
import { LuArrowDown } from "react-icons/lu";
import { profile, socialLinks } from "../content/content";
import { BrandIcon } from "./Icon";
import { ProfileCard } from "./ProfileCard";
import { ResponsiveText } from "./ResponsiveText";

export function Hero() {
  return (
    <section id="hero" aria-labelledby="hero-title">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <p className="inline-flex items-center gap-2 border border-outline bg-surface-container px-3 py-1.5 font-label text-label-sm">
            <span aria-hidden="true" className="inline-block size-2.5 bg-success motion-safe:animate-pulse" />
            <ResponsiveText copy={profile.availability} />
          </p>

          <h1
            id="hero-title"
            className="font-display text-display-lg-mobile text-balance md:text-display-lg"
          >
            <ResponsiveText copy={profile.headline} />
          </h1>

          <p className="max-w-2xl text-body-lg text-pretty text-on-surface-muted">
            I’m <strong className="font-semibold text-on-surface">{profile.name}</strong>
            <ResponsiveText copy={profile.introRest} />
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <ButtonLink href="#projects" size="lg">
              Explore Selected Work
              <LuArrowDown aria-hidden size={18} />
            </ButtonLink>
            {socialLinks.map((link) => (
              <ButtonLink key={link.kind} href={link.href} external variant="secondary" size="lg">
                <BrandIcon kind={link.kind} size={16} />
                {link.kind === "github" ? "GitHub" : "LinkedIn"}
              </ButtonLink>
            ))}
          </div>

          <div className="grid max-w-lg grid-cols-3 gap-6 border-t border-outline pt-6">
            {profile.metrics.map((metric) => (
              <Stat key={metric.label} value={metric.value} label={metric.label} tone={metric.tone} />
            ))}
          </div>
        </div>

        <div className="hidden md:block lg:col-span-4">
          <ProfileCard />
        </div>
      </div>
    </section>
  );
}
