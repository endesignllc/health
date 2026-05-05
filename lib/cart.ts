import { cookies } from "next/headers";
import { db } from "./db";
import { carts, cartItems, products } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { extractVariantOptionLabel, variantFamilyKey } from "./variant-label";

const CART_COOKIE = "cart_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function generateCartToken(): string {
  return `ct_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export async function getOrCreateCartToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE)?.value;

  if (existing) {
    const cart = await db.query.carts.findFirst({
      where: eq(carts.cartToken, existing),
    });
    if (cart) return existing;
  }

  const token = generateCartToken();
  await db.insert(carts).values({ cartToken: token });

  cookieStore.set(CART_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return token;
}

export async function getCartToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE)?.value ?? null;
}

export interface CartItemWithProduct {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  productDescription: string | null;
  productImageUrl: string | null;
  productPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  groupKey: string | null;
  optionSelectionConfirmed: boolean;
  optionSelectionLabel: string | null;
  requiresOptionSelection: boolean;
  familyKey: string | null;
  familyOptions: {
    productId: string;
    sku: string;
    label: string;
    priceCents: number;
  }[];
}

export interface CartWithItems {
  id: string;
  cartToken: string;
  budgetCents: number | null;
  cadence: string | null;
  items: CartItemWithProduct[];
  subtotalCents: number;
  unresolvedOptionCount: number;
  totalOptionRequiredCount: number;
}

export async function getCart(): Promise<CartWithItems | null> {
  const token = await getCartToken();
  if (!token) return null;

  const cart = await db.query.carts.findFirst({
    where: eq(carts.cartToken, token),
    with: {
      items: {
        with: { product: true },
      },
    },
  });

  if (!cart) return null;

  const baseItems: CartItemWithProduct[] = cart.items
    .filter((i) => i.product)
    .map((i) => ({
      id: i.id,
      productId: i.productId,
      productSku: i.product!.sku,
      productName: i.product!.name,
      productDescription: i.product!.description ?? null,
      productImageUrl: i.product!.imageUrl,
      productPriceCents: i.product!.priceCents,
      quantity: i.quantity,
      lineTotalCents: i.lineTotalCents,
      groupKey: i.groupKey,
      optionSelectionConfirmed: i.optionSelectionConfirmed,
      optionSelectionLabel:
        i.optionSelectionLabel ?? extractVariantOptionLabel(i.product!.description),
      requiresOptionSelection: false,
      familyKey: null,
      familyOptions: [],
    }));

  const familyNames = [...new Set(baseItems.map((i) => i.productName))];
  const familyCandidates =
    familyNames.length > 0
      ? await db
          .select({
            id: products.id,
            sku: products.sku,
            name: products.name,
            description: products.description,
            priceCents: products.priceCents,
            active: products.active,
            eligible: products.eligible,
          })
          .from(products)
          .where(inArray(products.name, familyNames))
      : [];

  const familyMap = new Map<
    string,
    { productId: string; sku: string; label: string; priceCents: number }[]
  >();
  for (const c of familyCandidates) {
    if (!c.active || !c.eligible) continue;
    const optionLabel = extractVariantOptionLabel(c.description);
    if (!optionLabel) continue;
    const key = variantFamilyKey(c.name);
    const list = familyMap.get(key) ?? [];
    list.push({
      productId: c.id,
      sku: c.sku,
      label: optionLabel,
      priceCents: c.priceCents,
    });
    familyMap.set(key, list);
  }

  const items = baseItems.map((item) => {
    const key = variantFamilyKey(item.productName);
    const familyOptions = (familyMap.get(key) ?? [])
      .sort((a, b) => a.priceCents - b.priceCents || a.label.localeCompare(b.label));
    const requiresOptionSelection = familyOptions.length > 1;
    return {
      ...item,
      requiresOptionSelection,
      familyKey: requiresOptionSelection ? key : null,
      familyOptions: requiresOptionSelection ? familyOptions : [],
    };
  });

  const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const unresolvedOptionCount = items.filter(
    (i) => i.requiresOptionSelection && !i.optionSelectionConfirmed
  ).length;
  const totalOptionRequiredCount = items.filter((i) => i.requiresOptionSelection).length;

  return {
    id: cart.id,
    cartToken: cart.cartToken,
    budgetCents: cart.budgetCents,
    cadence: cart.cadence,
    items,
    subtotalCents,
    unresolvedOptionCount,
    totalOptionRequiredCount,
  };
}

export async function addProductToCart(
  productId: string,
  quantity: number = 1
): Promise<{ success: boolean; error?: string }> {
  const token = await getOrCreateCartToken();
  const cart = await db.query.carts.findFirst({
    where: eq(carts.cartToken, token),
  });
  if (!cart) return { success: false, error: "Cart not found" };

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product || !product.active) return { success: false, error: "Product not found" };

  const lineTotalCents = product.priceCents * quantity;
  await db.insert(cartItems).values({
    cartId: cart.id,
    productId,
    quantity,
    lineTotalCents,
    groupKey: null,
    optionSelectionConfirmed: true,
    optionSelectionLabel: extractVariantOptionLabel(product.description),
  });

  return { success: true };
}

export async function addBundleToCart(
  items: {
    productId: string;
    quantity: number;
    lineTotalCents: number;
    optionSelectionConfirmed?: boolean;
    optionSelectionLabel?: string | null;
  }[],
  groupKey: string,
  budgetCents?: number,
  cadence?: string,
  needId?: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getOrCreateCartToken();
  const cart = await db.query.carts.findFirst({
    where: eq(carts.cartToken, token),
  });
  if (!cart) return { success: false, error: "Cart not found" };

  for (const item of items) {
    const product = await db.query.products.findFirst({
      where: eq(products.id, item.productId),
    });
    const familyHasVariants = Boolean(
      product?.name &&
        (
          await db
            .select({ id: products.id, description: products.description, active: products.active, eligible: products.eligible })
            .from(products)
            .where(eq(products.name, product.name))
        )
          .filter((p) => p.active && p.eligible)
          .map((p) => extractVariantOptionLabel(p.description))
          .filter(Boolean).length > 1
    );
    await db.insert(cartItems).values({
      cartId: cart.id,
      productId: item.productId,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
      groupKey,
      optionSelectionConfirmed:
        item.optionSelectionConfirmed ?? !familyHasVariants,
      optionSelectionLabel:
        item.optionSelectionLabel ?? extractVariantOptionLabel(product?.description),
    });
  }

  if (budgetCents !== undefined || cadence || needId) {
    await db
      .update(carts)
      .set({
        budgetCents: budgetCents ?? cart.budgetCents,
        cadence: cadence ?? cart.cadence,
        needId: needId ?? cart.needId,
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cart.id));
  }

  return { success: true };
}

export async function updateCartItemQuantity(
  cartItemId: string,
  quantity: number
): Promise<{ success: boolean; error?: string }> {
  const token = await getCartToken();
  if (!token) return { success: false, error: "No cart" };

  const cart = await db.query.carts.findFirst({
    where: eq(carts.cartToken, token),
  });
  if (!cart) return { success: false, error: "Cart not found" };

  const item = await db.query.cartItems.findFirst({
    where: eq(cartItems.id, cartItemId),
    with: { product: true },
  });
  if (!item || item.cartId !== cart.id || !item.product) return { success: false, error: "Item not found" };

  if (quantity <= 0) {
    await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
    return { success: true };
  }

  const lineTotalCents = item.product.priceCents * quantity;
  await db
    .update(cartItems)
    .set({ quantity, lineTotalCents })
    .where(eq(cartItems.id, cartItemId));

  return { success: true };
}

export async function removeCartItem(cartItemId: string): Promise<{ success: boolean }> {
  const token = await getCartToken();
  if (!token) return { success: false };

  const cart = await db.query.carts.findFirst({
    where: eq(carts.cartToken, token),
  });
  if (!cart) return { success: false };

  const item = await db.query.cartItems.findFirst({
    where: eq(cartItems.id, cartItemId),
  });
  if (!item || item.cartId !== cart.id) return { success: false };

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));
  return { success: true };
}

export async function updateCartItemOptionSelection(
  cartItemId: string,
  selectedProductId: string
): Promise<{ success: boolean; error?: string }> {
  const token = await getCartToken();
  if (!token) return { success: false, error: "No cart" };

  const cart = await db.query.carts.findFirst({
    where: eq(carts.cartToken, token),
  });
  if (!cart) return { success: false, error: "Cart not found" };

  const item = await db.query.cartItems.findFirst({
    where: eq(cartItems.id, cartItemId),
    with: { product: true },
  });
  if (!item || item.cartId !== cart.id || !item.product) {
    return { success: false, error: "Item not found" };
  }

  const selected = await db.query.products.findFirst({
    where: eq(products.id, selectedProductId),
  });
  if (!selected || !selected.active || !selected.eligible) {
    return { success: false, error: "Selected option unavailable" };
  }
  if (selected.name !== item.product.name) {
    return { success: false, error: "Invalid option for this item" };
  }

  const lineTotalCents = selected.priceCents * item.quantity;
  await db
    .update(cartItems)
    .set({
      productId: selected.id,
      lineTotalCents,
      optionSelectionConfirmed: true,
      optionSelectionLabel: extractVariantOptionLabel(selected.description),
    })
    .where(eq(cartItems.id, item.id));

  return { success: true };
}

export async function clearCartGroup(groupKey: string): Promise<{ success: boolean }> {
  const token = await getCartToken();
  if (!token) return { success: false };

  const cart = await db.query.carts.findFirst({
    where: eq(carts.cartToken, token),
  });
  if (!cart) return { success: false };

  await db
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.groupKey, groupKey)));
  return { success: true };
}
