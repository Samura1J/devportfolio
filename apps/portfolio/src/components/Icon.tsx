import type { IconType } from "react-icons";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import {
  LuCode,
  LuDatabase,
  LuFolder,
  LuGauge,
  LuHouse,
  LuMail,
  LuMonitorSmartphone,
  LuServer,
  LuTerminal,
} from "react-icons/lu";
import type { IconName, SocialLink } from "../content/types";

const icons: Record<IconName, IconType> = {
  home: LuHouse,
  folder: LuFolder,
  terminal: LuTerminal,
  mail: LuMail,
  devices: LuMonitorSmartphone,
  server: LuServer,
  gauge: LuGauge,
  database: LuDatabase,
  code: LuCode,
};

const brands: Record<SocialLink["kind"], IconType> = {
  github: FaGithub,
  linkedin: FaLinkedin,
};

interface IconProps {
  size?: number;
  className?: string;
}

/** Decorative icon by content name; always hidden from assistive tech. */
export function Icon({ name, size = 20, className }: IconProps & { name: IconName }) {
  const Component = icons[name];
  return <Component aria-hidden size={size} className={className} />;
}

export function BrandIcon({ kind, size = 18, className }: IconProps & { kind: SocialLink["kind"] }) {
  const Component = brands[kind];
  return <Component aria-hidden size={size} className={className} />;
}
