type SiteLogoProps = {
  /** Visual height (Tailwind); width follows intrinsic aspect ratio (684×125 @1×). */
  className?: string;
  priority?: boolean;
};

/**
 * Raster logo with 1× / 2× assets under /public/branding/.
 */
export function SiteLogo({ className = "h-11 w-auto sm:h-12", priority }: SiteLogoProps) {
  return (
    <img
      src="/branding/logo.png"
      srcSet="/branding/logo.png 1x, /branding/logo@2x.png 2x"
      width={684}
      height={125}
      alt="HealthBenefits.SHOP"
      className={className}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
    />
  );
}
