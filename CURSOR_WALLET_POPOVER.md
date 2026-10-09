# Cursor Prompt — WalletChipPopover (Header Mini-Wallet)

The header wallet chip becomes a **disclosure**, not a link. It currently shows the all-benefit
total and silently navigates to /build on click — members can't see the purse breakout anywhere
but home, and the click destination is a surprise. Fix both with one component.

## Behavior

1. Chip gains a chevron (▾); remove its direct href. Click toggles the popover. On desktop,
   hover may also open it after ~150ms as an enhancement — but click always works, and touch
   devices are click-only. Never hover-only.
2. Dismiss on click-away, Esc, or choosing an action — **never on a timeout**.
3. Accessibility: `aria-haspopup="dialog"` + `aria-expanded` on the chip; focus moves into the
   popover on open and returns to the chip on close; all targets ≥44px; text ≥16px.
4. Placement: anchored under the chip, right-aligned, above the sticky header (z-index).
   At <640px it renders as a full-width sheet under the header instead.
5. Laurel config only (plan-config gated like the rest of the wallet UI).

## Content — all values from the SAME wallet snapshot as the home wallet card (one source of truth)

```
YOUR BENEFIT DOLLARS · OCTOBER
$184.00 left of $300.00 · expires Fri, Oct 31

● Everyday health & OTC            $92.00
  [mini meter, purse blue]
● Home & bathroom safety           $52.00
  [mini meter, purse teal]
● Healthy food                     $28.00
  [mini meter, purse plum]
● Utilities                        $12.00
  [mini meter, purse amber]

[ Put my $184.00 to work ]   My wallet →
```

- Purse rows: color dot (same purse colors as home), label, remaining right-aligned
  (tabular-nums), 5px mini-meter underneath filled to remaining%.
- Primary button "Put my $184.00 to work" → /build (amount computed, never hardcoded).
- Quiet link "My wallet" → /.
- Expiry line uses the same amber tone as the home expiry pill; no red.

## Acceptance

Open the popover on /products, /build, and /cart: numbers identical to the home wallet;
keyboard-only open/choose/close works; the chip no longer navigates directly anywhere;
hover-open does not trigger on touch; nothing shifts layout when it opens.
