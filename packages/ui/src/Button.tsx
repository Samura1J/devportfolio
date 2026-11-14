import type { ComponentPropsWithoutRef } from "react";
import { buttonClasses, type ButtonStyleOptions } from "./styles";

export type ButtonProps = ButtonStyleOptions & ComponentPropsWithoutRef<"button">;

export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...rest} />;
}

export type ButtonLinkProps = ButtonStyleOptions &
  ComponentPropsWithoutRef<"a"> & {
    /** Opens in a new tab and tells screen-reader users so. */
    external?: boolean | undefined;
  };

export function ButtonLink({
  variant,
  size,
  className,
  external = false,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a
      className={buttonClasses({ variant, size, className })}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...rest}
    >
      {children}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
