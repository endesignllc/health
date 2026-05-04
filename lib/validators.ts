import { z } from "zod";

export const BuildWizardSchema = z.object({
  budgetCents: z.number().min(2500).max(30000), // BRD $25–$300
  cadence: z.enum(["monthly", "quarterly"]),
  needSlug: z.string().min(1),
  goals: z.array(z.string()).optional().default([]),
  usageIntensity: z.enum(["daily", "occasional"]).optional().default("daily"),
});

export const AddBundleToCartSchema = z.object({
  bundleId: z.string().uuid(),
});

export const SwapProductSchema = z.object({
  bundleItemId: z.string().uuid(),
  newProductId: z.string().uuid(),
});

export const CartItemUpdateSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(0),
});

export const SubscribeSchema = z.object({
  bundleSku: z.string().min(1),
  cadence: z.enum(["monthly", "quarterly"]),
});

export const AdminProductSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  priceCents: z.number().int().min(0),
  imageUrl: z.string().url().optional().nullable(),
  eligible: z.boolean().default(true),
  tags: z.array(z.string()).optional().default([]),
  active: z.boolean().default(true),
});

export const AdminNeedSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

export const AdminNeedProductRuleSchema = z.object({
  needId: z.string().uuid(),
  requiredCategoryId: z.string().uuid(),
  minItems: z.number().int().min(0).default(1),
  maxItems: z.number().int().min(1).default(3),
  priorityWeight: z.number().int().min(0).default(1),
});
