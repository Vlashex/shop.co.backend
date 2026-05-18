const { normalizeEntityId } = require("../ids");

const DEFAULT_VARIANT_ID = "default";

function clampQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

function normalizeVariantId(value) {
  if (typeof value !== "string") return DEFAULT_VARIANT_ID;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_VARIANT_ID;
}

function normalizeCartItems(items = []) {
  if (!Array.isArray(items)) return [];
  const merged = new Map();

  for (const item of items) {
    const productId = normalizeEntityId(item?.productId || item?.product_id || item?.id);
    if (!productId) continue;

    const variantId = normalizeVariantId(item?.variantId || item?.variant_id);
    const key = `${productId}::${variantId}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += clampQuantity(item?.quantity);
    } else {
      merged.set(key, { productId, variantId, quantity: clampQuantity(item?.quantity) });
    }
  }

  return [...merged.values()].map((item) => ({
    ...item,
    quantity: clampQuantity(item.quantity),
  }));
}

function toUserDto(row) {
  if (!row) return null;
  const cartItems = normalizeCartItems(row.cart_items).map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
  }));

  return {
    id: String(row.id).trim(),
    email: row.email,
    name: row.name,
    cart: cartItems.map((item) => item.productId),
    cartItems,
  };
}

module.exports = {
  DEFAULT_VARIANT_ID,
  normalizeCartItems,
  toUserDto,
};
