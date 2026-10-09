/**
 * Monthly benefit period from the member's calendar date.
 * The demo member is in Central time, so a UTC server still uses that date.
 */

export const MEMBER_TIME_ZONE = "America/Chicago";

export interface BenefitPeriod {
  /** "October" */
  periodLabel: string;
  /** "November" */
  nextPeriodLabel: string;
  /** "Sat, Oct 31" */
  expiresOnLabel: string;
  /** "Saturday" */
  weekdayName: string;
  /** "November 1" */
  renewsOnLabel: string;
  /** Calendar days from today until the last day of the period. 0 = expires today. */
  daysRemaining: number;
  /** Hour 0–23 in the member timezone. */
  hour: number;
}

function zonedParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour"),
  };
}

function formatUtc(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date);
}

/** Current monthly period for `now` in the member timezone. */
export function currentBenefitPeriod(
  now = new Date(),
  timeZone = MEMBER_TIME_ZONE
): BenefitPeriod {
  const { year, month, day, hour } = zonedParts(now, timeZone);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const periodEnd = new Date(Date.UTC(year, month - 1, lastDay, 12));
  const renews = new Date(Date.UTC(year, month - 1, lastDay + 1, 12));

  return {
    periodLabel: formatUtc(periodEnd, { month: "long" }),
    nextPeriodLabel: formatUtc(renews, { month: "long" }),
    expiresOnLabel: formatUtc(periodEnd, { weekday: "short", month: "short", day: "numeric" }),
    weekdayName: formatUtc(periodEnd, { weekday: "long" }),
    renewsOnLabel: formatUtc(renews, { month: "long", day: "numeric" }),
    daysRemaining: lastDay - day,
    hour,
  };
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function expiryDaysLabel(daysRemaining: number): string {
  if (daysRemaining <= 0) return "today";
  if (daysRemaining === 1) return "1 day";
  return `${daysRemaining} days`;
}

/** Quiet above two weeks. Amber inside two weeks. Bolder inside three days. */
export const EXPIRY_SOON_DAYS = 14;
export const EXPIRY_URGENT_DAYS = 3;

export type ExpiryTier = "quiet" | "soon" | "urgent" | "today";

export function expiryTier(daysRemaining: number): ExpiryTier {
  if (daysRemaining <= 0) return "today";
  if (daysRemaining <= EXPIRY_URGENT_DAYS) return "urgent";
  if (daysRemaining <= EXPIRY_SOON_DAYS) return "soon";
  return "quiet";
}

export interface ExpiryPresentation {
  tier: ExpiryTier;
  /** Home pill sentence. */
  pillText: string;
  /** Amber fill. Quiet days stay gray. */
  amber: boolean;
  /** ≤3 days, including the last day. */
  emphasize: boolean;
  /** Header chip day-count. Hidden above 14 days. */
  showDayCount: boolean;
  /** Top banner. Hidden above 14 days. */
  showBanner: boolean;
  /** "· 12 days left", or null when the chip stays dollars-only. */
  chipText: string | null;
  /** Banner headline. */
  bannerLead: string;
}

export function expiryPresentation(period: BenefitPeriod): ExpiryPresentation {
  const days = period.daysRemaining;
  const tier = expiryTier(days);
  const showDayCount = tier !== "quiet";
  const showBanner = tier !== "quiet";

  let pillText: string;
  if (tier === "today") pillText = "Expires today.";
  else if (tier === "urgent") pillText = `Expires this ${period.weekdayName}`;
  else if (tier === "soon") pillText = `Expires ${period.expiresOnLabel} · ${expiryDaysLabel(days)}`;
  else pillText = `Expires ${period.expiresOnLabel}`;

  const chipText = !showDayCount
    ? null
    : days <= 0
      ? "· today"
      : `· ${expiryDaysLabel(days)} left`;

  const bannerLead =
    tier === "today"
      ? `Your ${period.periodLabel} benefit expires today.`
      : tier === "urgent"
        ? `Your ${period.periodLabel} benefit expires this ${period.weekdayName}.`
        : `Your ${period.periodLabel} benefit expires in ${expiryDaysLabel(days)}.`;

  return {
    tier,
    pillText,
    amber: tier !== "quiet",
    emphasize: tier === "urgent" || tier === "today",
    showDayCount,
    showBanner,
    chipText,
    bannerLead,
  };
}
