import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// needs - "Shop by Need" categories (e.g., Blood Sugar Support, Heart Health)
export const needs = pgTable("needs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// product_categories - product taxonomy (e.g., Vitamins, Supplements)
export const productCategories = pgTable("product_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
});

// product_classes — normalized OTC / device buckets (e.g. digital upper-arm BP monitor)
export const productClasses = pgTable("product_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  canonicalName: text("canonical_name").notNull(),
  description: text("description"),
  needId: uuid("need_id").references(() => needs.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// product_class_aliases — retail / search phrases → class
export const productClassAliases = pgTable(
  "product_class_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productClassId: uuid("product_class_id")
      .notNull()
      .references(() => productClasses.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
  },
  (t) => [
    uniqueIndex("product_class_aliases_alias_lower").on(sql`lower(${t.alias})`),
  ]
);

// product_price_observations — raw price points for class-level rollups
export const productPriceObservations = pgTable("product_price_observations", {
  id: uuid("id").primaryKey().defaultRandom(),
  productClassId: uuid("product_class_id")
    .notNull()
    .references(() => productClasses.id, { onDelete: "cascade" }),
  retailer: text("retailer"),
  normalizedTitle: text("normalized_title"),
  priceCents: integer("price_cents").notNull(),
  /** PDP or search URL (Pi / scraper audit trail) */
  sourceUrl: text("source_url"),
  /** Retailer listing id when available (SKU, item id, ASIN, etc.) */
  externalItemId: text("external_item_id"),
  observedAt: timestamp("observed_at").defaultNow().notNull(),
});

// product_class_price_stats — one row per class (recomputed from observations)
export const productClassPriceStats = pgTable("product_class_price_stats", {
  productClassId: uuid("product_class_id")
    .primaryKey()
    .references(() => productClasses.id, { onDelete: "cascade" }),
  sampleCount: integer("sample_count").notNull(),
  minCents: integer("min_cents"),
  maxCents: integer("max_cents"),
  trimmedMedianCents: integer("trimmed_median_cents"),
  p25Cents: integer("p25_cents"),
  p75Cents: integer("p75_cents"),
  computedAt: timestamp("computed_at").defaultNow().notNull(),
});

// qualifier_questions — class-scoped closed-choice prompts
export const qualifierQuestions = pgTable(
  "qualifier_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productClassId: uuid("product_class_id")
      .notNull()
      .references(() => productClasses.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    prompt: text("prompt").notNull(),
    helpText: text("help_text"),
    kind: text("kind").notNull(), // single_choice | multi_choice
    sortOrder: integer("sort_order").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("qualifier_questions_class_slug_uq").on(t.productClassId, t.slug),
  ]
);

// qualifier_options — options per qualifier question
export const qualifierOptions = pgTable(
  "qualifier_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => qualifierQuestions.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
  },
  (t) => [
    uniqueIndex("qualifier_options_question_slug_uq").on(t.questionId, t.slug),
  ]
);

// qualifier_rules — option-driven hide/boost/penalty rules
export const qualifierRules = pgTable("qualifier_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  optionId: uuid("option_id")
    .notNull()
    .references(() => qualifierOptions.id, { onDelete: "cascade" }),
  effect: text("effect").notNull(), // hide | boost | penalty
  matchTag: text("match_tag"),
  matchProductId: uuid("match_product_id").references(() => products.id, {
    onDelete: "cascade",
  }),
  weight: integer("weight").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// products
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => productCategories.id),
  productClassId: uuid("product_class_id").references(() => productClasses.id, {
    onDelete: "set null",
  }),
  priceCents: integer("price_cents").notNull(),
  imageUrl: text("image_url"),
  externalProductUrl: text("external_product_url"), // e.g. original Walmart product URL for image lookup
  supplyDays: integer("supply_days").default(30).notNull(), // days one unit lasts; 365 = durable
  /** MVP stock signal for marination / substitution (no live vendor feed yet). */
  inStock: boolean("in_stock").default(true).notNull(),
  /** When out of stock, expected restock within this many hours (null = unknown). */
  restockEtaHours: integer("restock_eta_hours"),
  /** Count of consumable units per sellable SKU (e.g. tablets, test strips). Default 1. */
  unitsPerPackage: integer("units_per_package").default(1).notNull(),
  /** Typical units consumed per day when not derived from supplyDays (e.g. 2 pads/day). */
  estimatedDailyUse: integer("estimated_daily_use"),
  vendor: text("vendor"), // e.g. medline, walmart — fulfillment / sourcing
  /** Peer substitute SKUs for substitution / marination (same class). */
  alternateSkus: text("alternate_skus").array(),
  eligible: boolean("eligible").default(true).notNull(),
  tags: text("tags").array(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// need_product_rules - which product categories are required for each need
export const needProductRules = pgTable("need_product_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  needId: uuid("need_id")
    .notNull()
    .references(() => needs.id, { onDelete: "cascade" }),
  requiredCategoryId: uuid("required_category_id")
    .notNull()
    .references(() => productCategories.id),
  minItems: integer("min_items").default(1).notNull(),
  maxItems: integer("max_items").default(3).notNull(),
  priorityWeight: integer("priority_weight").default(1).notNull(),
});

// optimizer_policies - global ranking policy and guardrails
export const optimizerPolicies = pgTable("optimizer_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  active: boolean("active").default(false).notNull(),
  outcomeWeight: integer("outcome_weight").default(70).notNull(), // 0-100
  partnerWeight: integer("partner_weight").default(30).notNull(), // 0-100
  requirePriceCompetitiveness: boolean("require_price_competitiveness")
    .default(true)
    .notNull(),
  maxPriceDeltaPct: integer("max_price_delta_pct"), // nullable = no threshold
  enforceLockedQualifierFit: boolean("enforce_locked_qualifier_fit")
    .default(true)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// partner_promotion_rules - per-policy boost criteria and precedence
export const partnerPromotionRules = pgTable("partner_promotion_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  policyId: uuid("policy_id")
    .notNull()
    .references(() => optimizerPolicies.id, { onDelete: "cascade" }),
  ruleType: text("rule_type").notNull(), // allowlist | push_list | contains_text | vendor_match
  priority: integer("priority").default(100).notNull(), // lower = earlier evaluation
  enabled: boolean("enabled").default(true).notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// optimizer_policy_audit_log - immutable trail of policy changes
export const optimizerPolicyAuditLog = pgTable("optimizer_policy_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  policyId: uuid("policy_id")
    .notNull()
    .references(() => optimizerPolicies.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(),
  changeSummary: jsonb("change_summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// bundles - recommended bundle templates
export const bundles = pgTable("bundles", {
  id: uuid("id").primaryKey().defaultRandom(),
  bundleSku: text("bundle_sku").notNull().unique(),
  needId: uuid("need_id")
    .notNull()
    .references(() => needs.id),
  cadence: text("cadence").notNull(), // 'monthly' | 'quarterly'
  budgetCents: integer("budget_cents").notNull(),
  tier: text("tier").notNull(), // e.g. 'optimized', 'custom', legacy tiers
  subtotalCents: integer("subtotal_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// bundle_items - products in a bundle
export const bundleItems = pgTable("bundle_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  bundleId: uuid("bundle_id")
    .notNull()
    .references(() => bundles.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").default(1).notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
});

// carts - shopping cart (cookie-based cart_token)
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartToken: text("cart_token").notNull().unique(),
  budgetCents: integer("budget_cents"),
  cadence: text("cadence"),
  needId: uuid("need_id").references(() => needs.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// cart_items
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  quantity: integer("quantity").default(1).notNull(),
  lineTotalCents: integer("line_total_cents").notNull(),
  groupKey: text("group_key"), // e.g., bundle_sku for grouping
  optionSelectionConfirmed: boolean("option_selection_confirmed")
    .default(true)
    .notNull(),
  optionSelectionLabel: text("option_selection_label"),
});

// orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeSessionId: text("stripe_session_id").unique(),
  cartId: uuid("cart_id").references(() => carts.id),
  email: text("email"),
  shipping: jsonb("shipping"),
  totalCents: integer("total_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// subscriptions - recurring bundle shipments
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  bundleSku: text("bundle_sku").notNull(),
  cadence: text("cadence").notNull(),
  status: text("status").notNull(), // active, paused, canceled
  nextShipDate: timestamp("next_ship_date"),
  /** Member email captured at checkout (pre-shipment notices). */
  memberEmail: text("member_email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Pre-shipment workflow: notify → member approves / modifies / skips (BRD §4.5). */
export const subscriptionShipments = pgTable("subscription_shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  scheduledShipAt: timestamp("scheduled_ship_at").notNull(),
  notifyAt: timestamp("notify_at").notNull(),
  status: text("status").notNull().default("pending_notify"), // pending_notify | pending_member | approved | modified | skipped | shipped
  bundleSnapshot: jsonb("bundle_snapshot"),
  /** Signed-up email for this cycle notice (copy of subscription.member_email at create time). */
  memberEmail: text("member_email"),
  /** Idempotency for Stripe invoice.paid renewals. */
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  /** Unguessable token for approve/skip links. */
  responseToken: text("response_token").notNull().unique(),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// stripe_events - idempotency for webhooks
export const stripeEvents = pgTable("stripe_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const needsRelations = relations(needs, ({ many }) => ({
  needProductRules: many(needProductRules),
  bundles: many(bundles),
  productClasses: many(productClasses),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ many }) => ({
    products: many(products),
    needProductRules: many(needProductRules),
  })
);

export const productClassesRelations = relations(productClasses, ({ one, many }) => ({
  need: one(needs, {
    fields: [productClasses.needId],
    references: [needs.id],
  }),
  aliases: many(productClassAliases),
  priceObservations: many(productPriceObservations),
  qualifierQuestions: many(qualifierQuestions),
  priceStats: one(productClassPriceStats, {
    fields: [productClasses.id],
    references: [productClassPriceStats.productClassId],
  }),
}));

export const productClassAliasesRelations = relations(
  productClassAliases,
  ({ one }) => ({
    productClass: one(productClasses, {
      fields: [productClassAliases.productClassId],
      references: [productClasses.id],
    }),
  })
);

export const productPriceObservationsRelations = relations(
  productPriceObservations,
  ({ one }) => ({
    productClass: one(productClasses, {
      fields: [productPriceObservations.productClassId],
      references: [productClasses.id],
    }),
  })
);

export const productClassPriceStatsRelations = relations(
  productClassPriceStats,
  ({ one }) => ({
    productClass: one(productClasses, {
      fields: [productClassPriceStats.productClassId],
      references: [productClasses.id],
    }),
  })
);

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  productClass: one(productClasses, {
    fields: [products.productClassId],
    references: [productClasses.id],
  }),
  bundleItems: many(bundleItems),
  cartItems: many(cartItems),
  qualifierRulesByProductMatch: many(qualifierRules),
}));

export const qualifierQuestionsRelations = relations(
  qualifierQuestions,
  ({ one, many }) => ({
    productClass: one(productClasses, {
      fields: [qualifierQuestions.productClassId],
      references: [productClasses.id],
    }),
    options: many(qualifierOptions),
  })
);

export const qualifierOptionsRelations = relations(
  qualifierOptions,
  ({ one, many }) => ({
    question: one(qualifierQuestions, {
      fields: [qualifierOptions.questionId],
      references: [qualifierQuestions.id],
    }),
    rules: many(qualifierRules),
  })
);

export const qualifierRulesRelations = relations(qualifierRules, ({ one }) => ({
  option: one(qualifierOptions, {
    fields: [qualifierRules.optionId],
    references: [qualifierOptions.id],
  }),
  matchProduct: one(products, {
    fields: [qualifierRules.matchProductId],
    references: [products.id],
  }),
}));

export const needProductRulesRelations = relations(
  needProductRules,
  ({ one }) => ({
    need: one(needs, {
      fields: [needProductRules.needId],
      references: [needs.id],
    }),
    requiredCategory: one(productCategories, {
      fields: [needProductRules.requiredCategoryId],
      references: [productCategories.id],
    }),
  })
);

export const optimizerPoliciesRelations = relations(
  optimizerPolicies,
  ({ many }) => ({
    promotionRules: many(partnerPromotionRules),
    auditLog: many(optimizerPolicyAuditLog),
  })
);

export const partnerPromotionRulesRelations = relations(
  partnerPromotionRules,
  ({ one }) => ({
    policy: one(optimizerPolicies, {
      fields: [partnerPromotionRules.policyId],
      references: [optimizerPolicies.id],
    }),
  })
);

export const optimizerPolicyAuditLogRelations = relations(
  optimizerPolicyAuditLog,
  ({ one }) => ({
    policy: one(optimizerPolicies, {
      fields: [optimizerPolicyAuditLog.policyId],
      references: [optimizerPolicies.id],
    }),
  })
);

export const bundlesRelations = relations(bundles, ({ one, many }) => ({
  need: one(needs, {
    fields: [bundles.needId],
    references: [needs.id],
  }),
  items: many(bundleItems),
}));

export const bundleItemsRelations = relations(bundleItems, ({ one }) => ({
  bundle: one(bundles, {
    fields: [bundleItems.bundleId],
    references: [bundles.id],
  }),
  product: one(products, {
    fields: [bundleItems.productId],
    references: [products.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ many }) => ({
  shipments: many(subscriptionShipments),
}));

export const subscriptionShipmentsRelations = relations(
  subscriptionShipments,
  ({ one }) => ({
    subscription: one(subscriptions, {
      fields: [subscriptionShipments.subscriptionId],
      references: [subscriptions.id],
    }),
  })
);
