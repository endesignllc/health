import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import type { PlanConfig, PurseDef } from "@/lib/plan-config/types";
import { EligibilityBadges } from "@/components/EligibilityBadge";
import { deriveBenefitBadges } from "@/lib/benefit-badges";

interface LaurelMemberHomeProps {
  planConfig: PlanConfig;
  goalProducts?: Array<{
    id: string;
    name: string;
    imageUrl: string | null;
    priceCents: number;
    tags?: string[] | null;
    productClass?: {
      benefitRails: string[] | null;
      dualPurpose: boolean | null;
    } | null;
  }>;
}

/** Compute wallet totals from purses */
function computeWalletTotals(purses: PurseDef[]) {
  let totalAllowance = 0;
  let totalUsed = 0;
  for (const p of purses) {
    totalAllowance += p.allowanceCents;
    totalUsed += p.usedCents ?? 0;
  }
  return {
    totalAllowance,
    totalUsed,
    totalRemaining: totalAllowance - totalUsed,
  };
}

/** Time-of-day greeting */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function LaurelMemberHome({ planConfig, goalProducts = [] }: LaurelMemberHomeProps) {
  const { wallet, demoMember, demoOrder, needDisplayNames } = planConfig;
  const purses = wallet.purses;
  const { totalAllowance, totalUsed, totalRemaining } = computeWalletTotals(purses);
  
  // Compute shoppable remaining (OTC + home_safety, not infoOnly)
  const shoppableRemaining = purses
    .filter(p => !p.infoOnly)
    .reduce((sum, p) => sum + (p.allowanceCents - (p.usedCents ?? 0)), 0);

  const firstName = demoMember?.firstName ?? "there";
  const periodName = wallet.periodLabel ?? "this month";
  const nextPeriod = periodName === "October" ? "November" : "next month";

  return (
    <div className="max-w-[880px] mx-auto px-4 py-0 pb-16">
      {/* Section 1: Greeting */}
      <section className="pt-9 pb-5 px-1">
        <h1 className="text-[clamp(28px,5vw,38px)] font-medium leading-tight" style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}>
          {getGreeting()}, {firstName}.
        </h1>
        <p className="mt-2.5 text-muted-foreground max-w-[56ch]">
          Your plan set aside <strong className="text-foreground">{formatPrice(totalAllowance)} for {periodName}</strong> — 
          it's yours, and it's meant to be used. You have{" "}
          <strong className="text-foreground">{formatPrice(totalRemaining)} left</strong>, and it won't carry over to {nextPeriod}.
        </p>
      </section>

      {/* Section 2: Wallet Card (Hero) */}
      <section 
        className="relative bg-white border border-[#DDE3DE] rounded-[14px] p-6 md:p-7"
        aria-label="Your benefit dollars"
      >
        {/* Top row: label + expiry */}
        <div className="flex flex-wrap gap-4 items-start">
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
              Your benefit dollars · {periodName}
            </div>
            <div className="mt-1 text-[clamp(44px,8vw,60px)] font-semibold leading-none tabular-nums" style={{ fontFamily: 'var(--font-display, Georgia, serif)' }}>
              {formatPrice(totalRemaining)}{" "}
              <span className="text-lg font-normal text-muted-foreground" style={{ fontFamily: 'var(--font-body, system-ui)' }}>
                left of {formatPrice(totalAllowance)}
              </span>
            </div>
          </div>
          
          {/* Expiry pill */}
          {wallet.expiresInDays != null && (
            <div className="flex items-center gap-2 bg-[#FBF0DC] text-[#8F5600] rounded-full px-3.5 py-2 font-bold text-[15px] self-center">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Expires {wallet.expiresOn ?? `in ${wallet.expiresInDays} days`} · {wallet.expiresInDays} days
            </div>
          )}
        </div>

        {/* Segmented total bar */}
        <div 
          className="flex h-3.5 rounded-[7px] overflow-hidden gap-0.5 mt-5 mb-1.5 bg-transparent"
          role="img"
          aria-label={`${formatPrice(totalUsed)} used, ${formatPrice(totalRemaining)} remaining across four benefits`}
        >
          {/* Used segment (gray) */}
          <span 
            className="h-full rounded-l-[7px] bg-[#DDE3DE]" 
            style={{ flexBasis: `${(totalUsed / totalAllowance) * 100}%` }}
          />
          {/* Remaining segments per purse */}
          {purses.map((purse, idx) => {
            const remaining = purse.allowanceCents - (purse.usedCents ?? 0);
            const pct = (remaining / totalAllowance) * 100;
            const isLast = idx === purses.length - 1;
            return (
              <span
                key={purse.id}
                className={isLast ? "h-full rounded-r-[7px]" : "h-full"}
                style={{ 
                  flexBasis: `${pct}%`, 
                  backgroundColor: purse.color ?? "#888" 
                }}
              />
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          <span className="tabular-nums">{formatPrice(totalUsed)}</span> already put to work this month · the rest is ready below
        </p>

        {/* Purse rows */}
        <ul className="border-t border-[#DDE3DE] divide-y divide-[#DDE3DE]">
          {purses.map((purse) => {
            const remaining = purse.allowanceCents - (purse.usedCents ?? 0);
            const pct = (remaining / purse.allowanceCents) * 100;
            return (
              <li key={purse.id} className="py-3.5">
                <div className="grid gap-1.5" style={{ gridTemplateColumns: "14px 1fr auto" }}>
                  {/* Color dot */}
                  <span 
                    className="w-3.5 h-3.5 rounded self-start mt-0.5" 
                    style={{ backgroundColor: purse.color ?? "#888" }}
                  />
                  {/* Label + what */}
                  <div className="min-w-0">
                    <span className="font-bold">{purse.label}</span>
                    {purse.what && (
                      <span className="block text-sm text-muted-foreground">{purse.what}</span>
                    )}
                  </div>
                  {/* Amount */}
                  <div className="text-right tabular-nums">
                    <span className="font-bold text-lg">{formatPrice(remaining)}</span>
                    <span className="block text-sm text-muted-foreground">of {formatPrice(purse.allowanceCents)}</span>
                  </div>
                </div>
                {/* Mini meter */}
                <div className="mt-2 h-[7px] rounded bg-[#EDF2EE] overflow-hidden" style={{ marginLeft: "28px" }}>
                  <div 
                    className="h-full rounded" 
                    style={{ width: `${pct}%`, backgroundColor: purse.color ?? "#888" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>

        {/* CTA row */}
        <div className="flex flex-wrap items-center gap-4 mt-6">
          <Link
            href={`/build?budget=${shoppableRemaining}`}
            className="inline-flex items-center justify-center px-6 py-4 rounded-[10px] bg-[#1C3D5F] text-white text-lg font-bold hover:bg-[#234a70] transition-colors"
          >
            Put my {formatPrice(totalRemaining)} to work
          </Link>
          <Link href="/products" className="text-base hover:underline">
            See everything that's covered
          </Link>
        </div>
      </section>

      {/* Section 3: $0 strip */}
      <div className="mt-5 flex gap-3.5 items-start bg-[#E6F2EB] border border-transparent rounded-[14px] p-5">
        <svg className="w-6 h-6 text-[#1F7A4D] flex-none mt-0.5" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.5l7.5 3v6c0 5-3.2 8.3-7.5 10-4.3-1.7-7.5-5-7.5-10v-6l7.5-3z" fill="none" stroke="currentColor" strokeWidth="1.8"/>
          <path d="M8.5 12l2.4 2.4 4.6-4.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div>
          <h3 className="font-bold text-lg">Some items cost you nothing at all</h3>
          <p className="text-base text-muted-foreground mt-1">
            Your plan covers <b>compression stockings</b> and <b>diabetic footwear</b> at $0 — separately from your {formatPrice(totalAllowance)}.{" "}
            <Link href="/products?eligibility=zero_cost" className="font-bold text-[#1F7A4D] hover:underline">
              See your $0 items
            </Link>
          </p>
        </div>
      </div>

      {/* Section 4: Goals section */}
      {goalProducts.length > 0 && (
        <section className="mt-5 bg-white border border-[#DDE3DE] rounded-[14px] p-6">
          <div className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
            Because you told us: {needDisplayNames?.["joint-comfort-mobility"] ?? "staying steady at home"}
          </div>
          <h2 className="text-xl font-bold mt-1 mb-4">Three easy wins for your bathroom</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {goalProducts.slice(0, 3).map((product) => {
              const { badges } = deriveBenefitBadges(product, planConfig);
              return (
                <Link 
                  key={product.id} 
                  href={`/products/${product.id}`}
                  className="bg-[#EDF2EE] border border-[#DDE3DE] rounded-xl p-3.5 flex flex-col gap-2.5 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="h-[84px] rounded-lg bg-white border border-dashed border-[#DDE3DE] flex items-center justify-center overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <svg className="w-10 h-10 text-muted-foreground" viewBox="0 0 48 48" aria-hidden="true">
                        <path d="M10 38L38 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/>
                        <path d="M7 31l10 10M31 7l10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="font-bold text-[15.5px] leading-snug line-clamp-2">{product.name}</span>
                  <div className="flex items-center gap-2">
                    <EligibilityBadges types={badges} maxBadges={2} compact />
                    <span className="text-sm font-semibold text-primary tabular-nums">
                      {formatPrice(product.priceCents)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 5: Order status strip */}
      {demoOrder && (
        <div className="mt-5 flex flex-wrap items-center gap-3.5 bg-white border border-[#DDE3DE] rounded-[14px] p-5">
          <div className="flex-1 min-w-0">
            <b className="text-[17px]">Your {periodName} order ships {demoOrder.shipsOn}.</b>
            <p className="text-base text-muted-foreground mt-0.5">
              <span className="tabular-nums">{formatPrice(demoOrder.amountCents)}</span> of your benefit is already working for you in this order.
            </p>
          </div>
          <Link href="/cart" className="text-base hover:underline whitespace-nowrap">
            Review order
          </Link>
        </div>
      )}
    </div>
  );
}
