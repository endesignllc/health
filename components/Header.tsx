import Link from "next/link";
import { getCart } from "@/lib/cart";
import { SiteLogo } from "@/components/SiteLogo";

const navLinkClass =
  "inline-flex items-center min-h-[44px] px-3 rounded-md text-base font-semibold text-foreground hover:bg-accent hover:text-accent-foreground transition-colors underline-offset-4 hover:underline";

export default async function Header() {
  const cart = await getCart();
  const itemCount = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <header className="border-b-2 border-border bg-card shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:gap-4 md:h-[4.25rem] md:py-0">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="shrink-0 inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card hover:opacity-95 transition-opacity"
            >
              <SiteLogo priority />
            </Link>
            <Link
              href="/cart"
              className="md:hidden relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-primary hover:bg-accent transition-colors"
              aria-label={`Cart with ${itemCount} items`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-card">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </Link>
          </div>

          <nav
            className="flex flex-wrap items-center gap-1 sm:gap-2 md:flex-1 md:justify-center"
            aria-label="Main navigation"
          >
            <Link href="/" className={navLinkClass}>
              Home
            </Link>
            <Link href="/products" className={navLinkClass}>
              Shop products
            </Link>
            <Link href="/build" className={navLinkClass}>
              Build my bundle
            </Link>
            <Link href="/privacy" className={navLinkClass}>
              Privacy
            </Link>
          </nav>

          <Link
            href="/cart"
            className="hidden md:inline-flex relative items-center gap-2 min-h-[44px] px-4 rounded-md text-base font-semibold text-primary hover:bg-accent transition-colors"
            aria-label={`Cart with ${itemCount} items`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            Cart
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-1 bg-primary text-primary-foreground text-xs font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-card">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
