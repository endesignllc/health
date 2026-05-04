import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <Link
              href="/"
              className="font-semibold text-lg text-foreground hover:text-primary transition-colors"
            >
              Health Benefits Shop
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-xs">
              Build a budget-fitting bundle of health and wellness products. Shop by need—never by diagnosis.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/build" className="text-muted-foreground hover:text-foreground transition-colors">
                  Build My Bundle
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-muted-foreground hover:text-foreground transition-colors">
                  Cart
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-muted-foreground hover:text-foreground transition-colors">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              We do not use third-party tracking, analytics pixels, or log your selections. Your health choices stay private.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Health Benefits Shop. Not medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
