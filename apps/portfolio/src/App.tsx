import { useEffect } from "react";
import { CapabilitiesSection } from "./components/CapabilitiesSection";
import { CaseStudyDialog } from "./components/CaseStudyDialog";
import { ContactSection } from "./components/ContactSection";
import { EngagementSection } from "./components/EngagementSection";
import { Hero } from "./components/Hero";
import { MobileTabBar } from "./components/MobileTabBar";
import { ProjectsSection } from "./components/ProjectsSection";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { useActiveSection } from "./hooks/useActiveSection";
import { useCaseParam } from "./hooks/useCaseParam";

const SECTION_IDS = ["hero", "projects", "capabilities", "engagement", "contact"] as const;

export function App() {
  const activeId = useActiveSection(SECTION_IDS);
  const { slug, openCase, switchCase, closeCase } = useCaseParam();

  // The browser looks for a #hash target before React renders it, so a shared
  // link like /#contact would land at the top. Scroll there once on mount.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    // Bottom padding keeps the footer clear of the mobile tab bar.
    <div className="pb-20 md:pb-0">
      <a
        href="#main"
        className="sr-only z-50 bg-primary px-4 py-2 font-label text-label-md text-on-primary focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <SiteHeader activeId={activeId} />
      <main id="main" className="mx-auto max-w-page space-y-24 px-page-margin py-12 lg:py-16">
        <Hero />
        <ProjectsSection onOpenCaseStudy={openCase} />
        <CapabilitiesSection />
        <EngagementSection />
        <ContactSection />
      </main>
      <SiteFooter />
      <MobileTabBar activeId={activeId} />
      <CaseStudyDialog slug={slug} onClose={closeCase} onNavigate={switchCase} />
    </div>
  );
}
