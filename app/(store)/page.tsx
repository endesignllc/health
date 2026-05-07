import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <section className="bg-primary text-primary-foreground py-16 sm:py-24 md:py-28 border-b-4 border-[hsl(203,89%,21%)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight mb-6 leading-tight">
            Build a Budget-Fitting Bundle in Under a Minute
          </h1>
          <p className="text-lg sm:text-xl md:text-[1.35rem] leading-relaxed opacity-95 max-w-2xl mx-auto mb-10">
            Choose your allowance and need—we optimize one bundle per benefit period to fit your budget. No diagnosis required—just streamlined support for your wellness goals.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-stretch sm:items-center">
            <Button
              asChild
              size="lg"
              className="min-h-[52px] text-lg px-10 bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-md border-2 border-transparent"
            >
              <Link href="/build">Build my bundle</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="min-h-[52px] text-lg px-10 bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
            >
              <Link href="/products">Shop products</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-foreground tracking-tight">
          How it works
        </h2>
        <p className="text-center text-muted-foreground text-lg mb-14 max-w-2xl mx-auto">
          Three simple steps.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          <div className="text-center p-8 rounded-xl border-2 border-border bg-card shadow-sm">
            <div className="text-4xl font-bold text-primary mb-4" aria-hidden>
              1
            </div>
            <h3 className="font-bold text-xl mb-3 text-foreground">Choose your budget</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Select your monthly or quarterly allowance ($50–$300).
            </p>
          </div>
          <div className="text-center p-8 rounded-xl border-2 border-border bg-card shadow-sm">
            <div className="text-4xl font-bold text-primary mb-4" aria-hidden>
              2
            </div>
            <h3 className="font-bold text-xl mb-3 text-foreground">Pick your need</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Browse by functional support—blood sugar, heart health, mobility, and more.
            </p>
          </div>
          <div className="text-center p-8 rounded-xl border-2 border-border bg-card shadow-sm">
            <div className="text-4xl font-bold text-primary mb-4" aria-hidden>
              3
            </div>
            <h3 className="font-bold text-xl mb-3 text-foreground">Get curated bundles</h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Add a bundle to cart with one click, or customize to fit your preferences.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t-2 border-border bg-accent/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-12 text-center">
            <div>
              <p className="font-bold text-lg text-foreground mb-2">Privacy first</p>
              <p className="text-base text-muted-foreground leading-relaxed">
                No tracking. No PHI. Your choices stay private.
              </p>
            </div>
            <div>
              <p className="font-bold text-lg text-foreground mb-2">Budget friendly</p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Maximize your allowance with smart recommendations.
              </p>
            </div>
            <div>
              <p className="font-bold text-lg text-foreground mb-2">Subscribe & save</p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Recurring shipments for your bundle.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
