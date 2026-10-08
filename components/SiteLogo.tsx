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

  // Laurel-style lockup: icon tile + stacked text
  if (planConfig?.logoStyle === "lockup") {
    return (
      <div className="flex items-center gap-2.5">
        <img
          src={logoUrl}
          width={36}
          height={36}
          alt=""
          className="w-9 h-9 flex-none"
          decoding="async"
          loading={priority ? "eager" : "lazy"}
        />
        <div className="flex flex-col">
          <span className="text-[17px] font-semibold leading-tight text-[#1C3D5F]">
            {planConfig.name}
          </span>
          {planConfig.logoSubtitle && (
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground leading-tight">
              {planConfig.logoSubtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

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
