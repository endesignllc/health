type SiteLogoProps = {
  /** Visual height (Tailwind); width follows intrinsic ratio (512×67 @1×). */
  className?: string;
  priority?: boolean;
};

/**
 * Text wordmark with 1× / 2× assets under /public/branding/.
 */
export function SiteLogo({ className = "h-11 w-auto sm:h-12", priority }: SiteLogoProps) {
  return (
    <img
      src="/branding/logo.png"
      srcSet="/branding/logo.png 1x, /branding/logo@2x.png 2x"
      width={512}
      height={67}
      alt="HealthBenefits.shop"
      className={className}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
    />
  );
}
