import { cn } from "@/lib/utils";

type SiteLogoProps = {
  /** Tailwind height (`h-*`); width follows intrinsic ratio via width/height + object-contain. */
  className?: string;
  priority?: boolean;
};

/** Raster wordmark (`public/branding/logo.png`, 1024×135). */
const LOGO_W = 1024;
const LOGO_H = 135;

export function SiteLogo({ className = "h-11 w-auto sm:h-12", priority }: SiteLogoProps) {
  return (
    <img
      src="/branding/logo.png"
      width={LOGO_W}
      height={LOGO_H}
      alt="HealthBenefits.shop"
      className={cn("max-w-none object-contain object-left", className)}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
    />
  );
}
