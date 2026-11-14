import { Card, IconTile, SectionHeader } from "@portfolio/ui";
import { engagement } from "../content/content";

export function EngagementSection() {
  return (
    <Card as="section" id="engagement" aria-labelledby="engagement-title" className="space-y-8 p-8 md:p-12">
      <SectionHeader
        id="engagement-title"
        eyebrow={engagement.eyebrow}
        title={engagement.title}
        intro={engagement.intro}
        divider={false}
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {engagement.points.map((point, index) => (
          <div key={point.title} className="space-y-3">
            <div className="flex items-center gap-3">
              <IconTile tone={point.tone} size="sm" className="font-mono text-sm font-bold">
                {String(index + 1).padStart(2, "0")}
              </IconTile>
              <h3 className="font-headline text-headline-sm">{point.title}</h3>
            </div>
            <p className="text-body-md text-on-surface-muted">{point.body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
