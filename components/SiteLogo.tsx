import { cn } from "@/lib/utils";
import type { PlanConfig } from "@/lib/plan-config/types";

type SiteLogoProps = {
  /** Tailwind height (`h-*`); width follows intrinsic aspect via SVG viewBox. */
  className?: string;
  priority?: boolean;
  planConfig?: PlanConfig;
};

/** Vector wordmark — uses plan config if provided */
const DEFAULT_LOGO_W = 641;
const DEFAULT_LOGO_H = 85;

/** ~75% of former h-11 / sm:h-12 (~25% smaller overall). */
export function SiteLogo({
  className = "h-[2.0625rem] w-auto sm:h-9",
  priority,
  planConfig,
}: SiteLogoProps) {
  const logoUrl = planConfig?.logoUrl ?? "/branding/logo.svg";
  const logoAlt = planConfig?.logoAlt ?? "HealthBenefits.shop";

  return (
    <img
      src={logoUrl}
      width={DEFAULT_LOGO_W}
      height={DEFAULT_LOGO_H}
      alt={logoAlt}
      className={cn("max-w-none object-contain object-left", className)}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
    />
  );
}
