import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <>
      <section className="bg-primary text-primary-foreground py-20 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Build a Budget-Fitting Bundle in Under a Minute
          </h1>
          <p className="text-lg sm:text-xl opacity-90 max-w-2xl mx-auto mb-10">
            Choose your allowance and need—we optimize one bundle per benefit period to fit your budget. No diagnosis required—just functional support for your wellness goals.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button asChild size="lg" variant="secondary" className="text-lg px-8 py-6 min-h-[56px]">
              <Link href="/build">Build My Bundle</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 min-h-[56px] border-primary-foreground/40 bg-background text-foreground hover:bg-muted hover:text-foreground">
              <Link href="/products">Shop Products</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="text-3xl font-bold text-primary mb-2">1</div>
            <h3 className="font-semibold mb-2">Choose Your Budget</h3>
            <p className="text-sm text-muted-foreground">
              Select your monthly or quarterly allowance ($50–$300).
            </p>
          </div>
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="text-3xl font-bold text-primary mb-2">2</div>
            <h3 className="font-semibold mb-2">Pick Your Need</h3>
            <p className="text-sm text-muted-foreground">
              Browse by functional support—Blood Sugar, Heart Health, Mobility, and more.
            </p>
          </div>
          <div className="text-center p-6 rounded-lg border bg-card">
            <div className="text-3xl font-bold text-primary mb-2">3</div>
            <h3 className="font-semibold mb-2">Get Curated Bundles</h3>
            <p className="text-sm text-muted-foreground">
              Add a bundle to cart with one click, or customize to fit your preferences.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <p className="font-semibold text-foreground mb-1">Privacy First</p>
              <p className="text-sm text-muted-foreground">No tracking. No PHI. Your choices stay private.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Budget Friendly</p>
              <p className="text-sm text-muted-foreground">Maximize your allowance with smart recommendations.</p>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Subscribe & Save</p>
              <p className="text-sm text-muted-foreground">Recurring shipments for your bundle.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
