# Cursor Prompt — Laurel Member Home (Multi-Purse Wallet)

Visual target: `mockups/benefit-wallet-vision.html` — this sprint implements that page as the
Laurel home route. Companion: `CURSOR_UI_POLISH.md` (card anatomy, badges, chip, logo) — do that
brief first or together; this one assumes its tokens and badge components.

Principle: when the Laurel plan config is active, `/` is a MEMBER home, not a marketing page.
The current hero ("Build a Budget-Fitting Bundle in Under a Minute") is pitch copy aimed at
partners, not members — keep it for the default HBS config, hide it entirely for Laurel.

## 1. Demo member + wallet state (config-driven, no DB changes)

Extend the Laurel plan config with demo state:

```ts
demoMember: { firstName: "Margaret", goals: ["bladder-support", "joint-comfort-mobility"] },
wallet: {
  periodLabel: "October",
  expiresOn: "Oct 31",            // display string; expiresInDays: 9 already exists
  purses: [
    { id: "otc",         label: "Everyday health & OTC",     allowanceCents: 15000, usedCents: 5800,
      what: "Pain relief, vitamins, bladder care, first aid",          color: "#2B6CB0" },
    { id: "home_safety", label: "Home & bathroom safety",    allowanceCents: 7000,  usedCents: 1800,
      what: "Grab bars, night lights, non-slip mats",                  color: "#0D9470" },
    { id: "food",        label: "Healthy food",              allowanceCents: 5000,  usedCents: 2200,
      what: "Groceries at participating stores",                       color: "#A14FB5", infoOnly: true },
    { id: "utilities",   label: "Utilities",                 allowanceCents: 3000,  usedCents: 1800,
      what: "Help with electric, gas, or water bills",                 color: "#B45309", infoOnly: true },
  ],
}
```

Totals: $300 allowance, $116 used, **$184 left** — matches the mock exactly. (This reshapes the
purse split from the earlier 100/100/50/50; the mock's 150/70/50/30 reads better on the meters.)
Purse colors are fixed as given — they are colorblind-validated as a set; do not restyle them.
`infoOnly` purses never link to shopping — see §4.

## 2. Laurel home route — section order per the mock

1. **Greeting.** "Good morning, {firstName}." + one line: "Your plan set aside **$300 for
   October** — it's yours, and it's meant to be used. You have **$184 left**, and it won't carry
   over to November." (Time-of-day greeting: morning/afternoon/evening.)
2. **Wallet card (the hero).**
   - Label row: "YOUR BENEFIT DOLLARS · OCTOBER" eyebrow; amber expiry pill right-aligned:
     clock icon + "Expires Fri, Oct 31 · 9 days".
   - Big figure: `$184` (display size, tabular-nums) + "left of $300" muted.
   - **Segmented total bar:** one 14px rounded bar — gray "used" segment ($116 width) then one
     segment per purse's REMAINING amount in its purse color, 2px gaps between segments.
     Under it: "$116 already put to work this month · the rest is ready below."
   - **Purse rows** (4): color dot square, label bold, "what it buys" line muted 14px, right side
     "$92 / of $150" (remaining bold, allowance muted), full-width 7px mini meter underneath
     filled to remaining% in the purse color. Divider lines between rows.
   - CTA row: primary navy button **"Put my $184 to work"** → the wizard with budget preset to
     remaining OTC+safety total; quiet link "See everything that's covered" → /products.
3. **"$0 with your plan" strip.** Green tint, shield-check icon: "**Some items cost you nothing
   at all.** Your plan covers compression stockings and diabetic footwear at $0 — separately from
   your $300." Link "See your $0 items" → /products filtered to eligibility:zero_cost.
4. **"Because you told us" goals section.** Eyebrow: "BECAUSE YOU TOLD US: STAYING STEADY AT
   HOME". Three real products from the home-safety classes (pick three WITH verified images —
   e.g. ankle support, cushion, scale; query, don't hardcode SKUs), each card per the polish-brief
   anatomy with its Home Safety badge and price.
5. **Order status strip.** "**Your October order ships Friday.** $76 of your benefit is already
   working for you in this order." + "Review order" link (→ cart). Values from config demo state
   (`demoOrder: { shipsOn: "Friday", amountCents: 7600 }`); hide the strip if absent.

## 3. Header chip + banner coherence

With the wallet now ON the home page, the top expiry banner duplicates it there — show the
banner only on NON-home pages for Laurel. Header chip (per polish brief): `$184 · 9 days left`,
computed from the same wallet snapshot — one source of truth, never two different numbers
on one screen.

## 4. Honesty rules (demo integrity)

- `infoOnly` purses (Food, Utilities) render their row and meter but no shop link; their row's
  "what" line carries the guidance ("at participating stores"). Clicking them can open a small
  popover: "Use your Laurel Flex Card at participating stores. Your balance updates here." No
  fake grocery catalog.
- All dollar figures derive from the config demo state — no hardcoded strings that can drift
  from the math ("$184" must be computed).
- No PHI language anywhere: goals are phrased as goals, never conditions.

## 5. Acceptance

Side-by-side screenshot of Laurel `/` vs `mockups/benefit-wallet-vision.html` at 1280w and 400w:
same section order, same wallet anatomy, purse colors exact, one consistent $184 everywhere
(chip, greeting, wallet, CTA). Default HBS config still shows the existing marketing homepage
untouched. Then the full §3 demo walk from CURSOR_DEMO_SPRINT.md — the walk now STARTS on this
page: wallet → "Put my $184 to work" → wizard → bundle → cart.
