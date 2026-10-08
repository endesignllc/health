import { cn } from "@/lib/utils";

interface ProductImagePlaceholderProps {
  categorySlug?: string;
  className?: string;
}

/**
 * Styled placeholder for products without images.
 * Shows a category-appropriate icon on a tinted surface.
 */
export function ProductImagePlaceholder({ categorySlug, className }: ProductImagePlaceholderProps) {
  // Pick icon based on category
  const icon = getCategoryIcon(categorySlug);

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center",
        "bg-[#EDF2EE]", // Surface tint from mockup
        className
      )}
    >
      <svg
        className="w-12 h-12 text-[#9FAFB3]"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {icon}
      </svg>
    </div>
  );
}

function getCategoryIcon(categorySlug?: string): React.ReactNode {
  // Bath/safety
  if (categorySlug?.includes("bath") || categorySlug?.includes("safety")) {
    return (
      <>
        <rect x="8" y="18" width="32" height="22" rx="2" />
        <path d="M12 18V14a4 4 0 014-4h16a4 4 0 014 4v4" />
        <line x1="18" y1="28" x2="30" y2="28" />
      </>
    );
  }

  // Mobility/supports
  if (categorySlug?.includes("mobility") || categorySlug?.includes("support") || categorySlug?.includes("brace")) {
    return (
      <>
        <circle cx="24" cy="14" r="6" />
        <path d="M14 44l6-20h8l6 20" />
        <line x1="17" y1="34" x2="31" y2="34" />
      </>
    );
  }

  // Incontinence/bladder
  if (categorySlug?.includes("incontin") || categorySlug?.includes("bladder")) {
    return (
      <>
        <rect x="10" y="8" width="28" height="32" rx="4" />
        <path d="M18 16h12M18 24h12M18 32h8" />
      </>
    );
  }

  // Vitamins/supplements
  if (categorySlug?.includes("vitamin") || categorySlug?.includes("supplement")) {
    return (
      <>
        <rect x="14" y="6" width="20" height="36" rx="4" />
        <ellipse cx="24" cy="14" rx="6" ry="4" />
        <line x1="14" y1="18" x2="34" y2="18" />
      </>
    );
  }

  // Medical equipment
  if (categorySlug?.includes("diagnostic") || categorySlug?.includes("equipment")) {
    return (
      <>
        <rect x="8" y="14" width="32" height="20" rx="3" />
        <path d="M16 24h4l2-4 4 8 2-4h4" />
        <circle cx="24" cy="40" r="2" />
      </>
    );
  }

  // Default: generic health cross
  return (
    <>
      <rect x="20" y="8" width="8" height="32" rx="2" />
      <rect x="8" y="20" width="32" height="8" rx="2" />
    </>
  );
}
