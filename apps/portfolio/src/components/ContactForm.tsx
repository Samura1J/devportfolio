import {
  API_BASE,
  CONTACT_MESSAGE_MIN,
  ContactRequestSchema,
  INQUIRY_TYPES,
  type ContactRequest,
} from "@portfolio/shared";
import { Button, cn, focusRing } from "@portfolio/ui";
import { useState, type ReactNode } from "react";
import { LuLoaderCircle, LuSend } from "react-icons/lu";
import { contact, socialLinks } from "../content/content";

type Field = "name" | "email" | "inquiryType" | "message";
type FieldErrors = Partial<Record<Field, string>>;
type Status = "idle" | "sending" | "sent" | "error";

const FIELDS: readonly Field[] = ["name", "email", "inquiryType", "message"];
const linkedin = socialLinks.find((link) => link.kind === "linkedin");

function isField(key: unknown): key is Field {
  return FIELDS.some((field) => field === key);
}

const controlClass = cn(
  "w-full border bg-surface-container px-3.5 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-muted",
  "focus:border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
);

interface FieldShellProps {
  id: Field;
  label: string;
  error: string | undefined;
  hint?: string;
  children: (props: {
    id: string;
    name: Field;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
    className: string;
  }) => ReactNode;
  className?: string;
}

/** Label, control and error text wired together for assistive tech. */
function FieldShell({ id, label, error, hint, children, className }: FieldShellProps) {
  const inputId = `contact-${id}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block font-label text-label-md font-medium">
        {label}
      </label>
      {children({
        id: inputId,
        name: id,
        "aria-invalid": error !== undefined,
        "aria-describedby": describedBy,
        className: cn(controlClass, error ? "border-error" : "border-outline-strong"),
      })}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-body-sm text-on-surface-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-body-sm font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>("idle");

  function clearError(field: Field) {
    if (errors[field]) setErrors(({ [field]: _removed, ...rest }) => rest);
  }

  async function send(form: HTMLFormElement) {
    const parsed = ContactRequestSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (isField(field)) next[field] ??= issue.message;
      }
      setErrors(next);
      const first = FIELDS.find((field) => next[field]);
      if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    setErrors({});
    setStatus("sending");
    try {
      const body: ContactRequest = parsed.data;
      const res = await fetch(`${API_BASE}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Contact API responded ${String(res.status)}`);
      form.reset();
      setStatus("sent");
    } catch (error) {
      console.warn("Contact form failed to send", error);
      setStatus("error");
    }
  }

  return (
    <form
      noValidate
      aria-labelledby="contact-form-title"
      onSubmit={(event) => {
        event.preventDefault();
        void send(event.currentTarget);
      }}
      className="relative space-y-5"
    >
      <h3 id="contact-form-title" className="sr-only">
        Send a message
      </h3>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FieldShell id="name" label="Your name" error={errors.name}>
          {(props) => (
            <input {...props} type="text" autoComplete="name" placeholder="Jane Doe" onInput={() => clearError("name")} />
          )}
        </FieldShell>
        <FieldShell id="email" label="Email address" error={errors.email}>
          {(props) => (
            <input
              {...props}
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
              onInput={() => clearError("email")}
            />
          )}
        </FieldShell>
      </div>

      <FieldShell id="inquiryType" label="Inquiry type" error={errors.inquiryType}>
        {(props) => (
          <select {...props} defaultValue={INQUIRY_TYPES[0]}>
            {INQUIRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {contact.inquiryLabels[type]}
              </option>
            ))}
          </select>
        )}
      </FieldShell>

      <FieldShell
        id="message"
        label="Project details or role overview"
        error={errors.message}
        hint={`At least ${String(CONTACT_MESSAGE_MIN)} characters.`}
      >
        {(props) => (
          <textarea
            {...props}
            rows={5}
            placeholder="Tell me about your stack, goals, timeline, or open position…"
            onInput={() => clearError("message")}
          />
        )}
      </FieldShell>

      {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? (
          <>
            <LuLoaderCircle aria-hidden size={18} className="motion-safe:animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Send Message
            <LuSend aria-hidden size={18} />
          </>
        )}
      </Button>

      <div role="status" aria-live="polite" className="text-body-sm">
        {status === "sent" && (
          <p className="font-medium text-success-ink">Thanks! Your message is on its way. I’ll reply by email.</p>
        )}
        {status === "error" && (
          <p className="font-medium text-error">
            Sorry, the message couldn’t be sent.{" "}
            {linkedin && (
              <>
                Please reach me on{" "}
                <a
                  href={linkedin.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("underline", focusRing)}
                >
                  LinkedIn
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>{" "}
                instead.
              </>
            )}
          </p>
        )}
      </div>
    </form>
  );
}
