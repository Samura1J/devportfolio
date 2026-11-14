import { Card, cn, focusRing, IconTile, SectionHeader } from "@portfolio/ui";
import { contact, socialLinks } from "../content/content";
import { ContactForm } from "./ContactForm";
import { BrandIcon } from "./Icon";

export function ContactSection() {
  return (
    <Card as="section" id="contact" aria-labelledby="contact-title" className="p-6 md:p-12">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-5">
          <SectionHeader
            id="contact-title"
            eyebrow={contact.eyebrow}
            title={contact.title}
            intro={contact.intro}
            divider={false}
          />

          <ul className="space-y-4">
            {socialLinks.map((link) => (
              <li key={link.kind}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "group flex items-center gap-4 border border-outline bg-surface p-3.5 transition-colors hover:border-primary",
                    focusRing,
                  )}
                >
                  <IconTile tone={link.kind === "linkedin" ? "primary" : "default"}>
                    <BrandIcon kind={link.kind} size={20} />
                  </IconTile>
                  <span>
                    <span className="block font-label text-label-md font-semibold transition-colors group-hover:text-primary">
                      {link.label}
                    </span>
                    <span className="block text-body-sm text-on-surface-muted">{link.handle}</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="border border-outline bg-surface p-6 md:p-8 lg:col-span-7">
          <ContactForm />
        </div>
      </div>
    </Card>
  );
}
