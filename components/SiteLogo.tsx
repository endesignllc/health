import { cn } from "@/lib/utils";

type SiteLogoProps = {
  /** Tailwind height (`h-*`); width follows intrinsic aspect via SVG viewBox. */
  className?: string;
  priority?: boolean;
};

/** Vector wordmark from `public/branding/logo.svg` (viewBox 0 0 641 85). */
const LOGO_W = 641;
const LOGO_H = 85;

export function SiteLogo({ className = "h-11 w-auto sm:h-12", priority }: SiteLogoProps) {
  return (
    <img
      src="/branding/logo.svg"
      width={LOGO_W}
      height={LOGO_H}
      alt="HealthBenefits.shop"
      className={cn("max-w-none object-contain object-left", className)}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
    />
  );
}
