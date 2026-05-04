import { randomBytes } from "crypto";
import type { Cadence } from "@/lib/sufficiency";

export function preShipmentLeadDays(): number {
  const n = parseInt(process.env.PRE_SHIPMENT_NOTIFY_DAYS ?? "7", 10);
  return Number.isFinite(n) && n >= 0 ? n : 7;
}

export function addCalendarPeriod(from: Date, cadence: Cadence, periods: number): Date {
  const d = new Date(from.getTime());
  if (cadence === "monthly") {
    d.setMonth(d.getMonth() + periods);
    return d;
  }
  d.setMonth(d.getMonth() + 3 * periods);
  return d;
}

export function addDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** First fulfillment date after signup (align with benefit cadence). */
export function firstScheduledShipDate(cadence: Cadence, from: Date = new Date()): Date {
  return addCalendarPeriod(from, cadence, 1);
}

export function generateShipmentResponseToken(): string {
  return randomBytes(24).toString("hex");
}

export type BundleSnapshotItem = {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  lineTotalCents: number;
};

export type BundleSnapshot = {
  bundleSku: string;
  cadence: Cadence;
  items: BundleSnapshotItem[];
  capturedAt: string;
};
