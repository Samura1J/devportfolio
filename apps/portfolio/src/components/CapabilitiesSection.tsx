import { Card, IconTile, SectionHeader, toneText } from "@portfolio/ui";
import { capabilities } from "../content/content";
import { Icon } from "./Icon";

export function CapabilitiesSection() {
  return (
    <section id="capabilities" aria-labelledby="capabilities-title" className="space-y-8">
      <SectionHeader
        id="capabilities-title"
        eyebrow="Skills & Tooling"
        title="Technical Stack & Expertise"
        intro="Everything needed to deliver responsive, accessible frontends and connect them to dependable backends."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {capabilities.map((capability) => (
          <Card key={capability.title} className="space-y-4 p-6">
            <IconTile tone={capability.tone}>
              <Icon name={capability.icon} />
            </IconTile>
            <h3 className="font-headline text-headline-sm">{capability.title}</h3>
            <p className="text-body-sm text-on-surface-muted">{capability.blurb}</p>
            <dl className="space-y-2 border-t border-outline pt-4">
              {capability.items.map((item) => (
                <div key={item.name} className="flex items-baseline justify-between gap-3 text-body-sm">
                  <dt>{item.name}</dt>
                  <dd className={`shrink-0 font-mono text-xs font-semibold ${toneText[item.tone]}`}>
                    {item.level}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </section>
  );
}
