import { Card } from "@portfolio/ui";
import { Fragment } from "react";
import { profile } from "../content/content";

const { filename, fields } = profile.profileCard;
const entries = Object.entries(fields);

const Key = ({ name }: { name: string }) => (
  <span className="font-semibold text-accent-ink">&quot;{name}&quot;</span>
);
const Str = ({ value }: { value: string }) => (
  <span className="text-success-ink">&quot;{value}&quot;</span>
);

/** The hero's "engineer-profile.json" card, rendered from content. */
export function ProfileCard() {
  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-center justify-between border-b border-outline pb-3">
        <div aria-hidden="true" className="flex gap-2">
          <span className="size-3 bg-error" />
          <span className="size-3 bg-warning" />
          <span className="size-3 bg-success" />
        </div>
        <span className="font-mono text-[11px] text-on-surface-muted">{filename}</span>
      </div>

      <pre className="border border-outline bg-surface-container-high p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
        <code>
          {"{\n"}
          {entries.map(([name, value], index) => {
            const comma = index < entries.length - 1 ? "," : "";
            return (
              <Fragment key={name}>
                {"  "}
                <Key name={name} />
                {": "}
                {typeof value === "string" ? (
                  <>
                    <Str value={value} />
                    {`${comma}\n`}
                  </>
                ) : (
                  <>
                    {"[\n"}
                    {value.map((item, i) => (
                      <Fragment key={item}>
                        {"    "}
                        <Str value={item} />
                        {i < value.length - 1 ? ",\n" : "\n"}
                      </Fragment>
                    ))}
                    {`  ]${comma}\n`}
                  </>
                )}
              </Fragment>
            );
          })}
          {"}"}
        </code>
      </pre>

      <div className="flex items-center justify-between border-t border-outline pt-3 text-body-sm">
        <span className="text-on-surface-muted">{profile.location.label}</span>
        <span className="font-medium">{profile.location.value}</span>
      </div>
    </Card>
  );
}
