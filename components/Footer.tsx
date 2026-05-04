import Link from "next/link";

const footerLink =
  "inline-flex items-center min-h-[44px] text-base font-medium text-foreground underline-offset-4 hover:underline decoration-2 hover:text-primary transition-colors";

export default function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-border bg-muted">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <Link href="/" className="font-bold text-xl text-primary hover:text-[hsl(203,89%,26%)] transition-colors">
              Health Benefits Shop
            </Link>
            <p className="mt-5 text-base text-muted-foreground leading-relaxed max-w-sm">
              Build a budget-fitting bundle of health and wellness products. Shop by need—never by diagnosis.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-lg text-foreground mb-5 tracking-tight">Quick links</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/" className={footerLink}>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/build" className={footerLink}>
                  Build my bundle
                </Link>
              </li>
              <li>
                <Link href="/products" className={footerLink}>
                  Shop products
                </Link>
              </li>
              <li>
                <Link href="/cart" className={footerLink}>
                  Cart
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={footerLink}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={footerLink}>
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className={footerLink}>
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-lg text-foreground mb-5 tracking-tight">Privacy first</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              We do not use third-party tracking, analytics pixels, or log your selections. Your health choices stay private.
            </p>
          </div>
        </div>

        <div className="mt-14 pt-8 border-t-2 border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-base text-muted-foreground text-center sm:text-left">
            © {new Date().getFullYear()} Health Benefits Shop. Not medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
