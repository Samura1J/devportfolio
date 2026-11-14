import type { Copy } from "../content/types";

/**
 * Shows `short` below the `sm` breakpoint and `full` above it. The hidden
 * variant uses display:none, so screen readers only ever read one of them.
 */
export function ResponsiveText({ copy }: { copy: Copy }) {
  if (copy.short === undefined) return <>{copy.full}</>;
  return (
    <>
      <span className="sm:hidden">{copy.short}</span>
      <span className="hidden sm:inline">{copy.full}</span>
    </>
  );
}
