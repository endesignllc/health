/**
 * Capability keys for program-scoped features.
 * v1: wallet config is env-driven; keys here stabilize the API contract for DB-backed config later.
 */
export const CAPABILITIES = {
  benefit_wallet: "benefit_wallet",
} as const;

export type CapabilityKey = (typeof CAPABILITIES)[keyof typeof CAPABILITIES];

export type IntegrationMode =
  | "off"
  | "static"
  | "member_input"
  | "api"
  | "file"
  | "edi"
  | "computed"
  | "inherit";
