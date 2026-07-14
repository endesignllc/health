/**
 * Deterministic tests for benefit wallet snapshot math (no DB).
 * Run: npm run test:benefit-wallet
 */
import { computeBenefitWalletSnapshot } from "../lib/benefit-wallet/compute";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
}

// Static demo: $300 allowance, $50 prior spend, $42 in cart
const staticDemo = computeBenefitWalletSnapshot({
  enabled: true,
  mode: "static",
  provenance: "static",
  status: "active",
  walletLabel: "OTC Benefit",
  allowanceCents: 30_000,
  cadence: "quarterly",
  priorUsedCents: 5_000,
  cartSubtotalCents: 4_200,
  periodLabel: "Jul–Sep 2026",
  showDemoBadge: true,
});

assert(staticDemo.usedCents === 9_200, `used expected 9200 got ${staticDemo.usedCents}`);
assert(staticDemo.availableCents === 20_800, `available expected 20800 got ${staticDemo.availableCents}`);
assert(staticDemo.cartCents === 4_200, `cart expected 4200 got ${staticDemo.cartCents}`);
assert(staticDemo.showDemoBadge === true, "demo badge should be on");

// Member input: $100 allowance, cart only
const memberInput = computeBenefitWalletSnapshot({
  enabled: true,
  mode: "member_input",
  provenance: "member_input",
  status: "active",
  walletLabel: "Your benefit",
  allowanceCents: 10_000,
  cadence: "monthly",
  priorUsedCents: 0,
  cartSubtotalCents: 3_500,
});

assert(memberInput.usedCents === 3_500, `member used expected 3500 got ${memberInput.usedCents}`);
assert(memberInput.availableCents === 6_500, `member available expected 6500 got ${memberInput.availableCents}`);

// Over budget
const over = computeBenefitWalletSnapshot({
  enabled: true,
  mode: "member_input",
  provenance: "member_input",
  status: "active",
  walletLabel: "Your benefit",
  allowanceCents: 5_000,
  cadence: "quarterly",
  priorUsedCents: 0,
  cartSubtotalCents: 6_000,
});

assert(over.availableCents === -1_000, `over available expected -1000 got ${over.availableCents}`);

console.log("test:benefit-wallet — all assertions passed");
