const { Int32 } = require("mongodb");

const { toObjectIdOrNull } = require("../objectId");

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
    const productId = toObjectIdOrNull(item?.productId || item?.product_id || item?.id);
    if (!productId) continue;

    const variantId = normalizeVariantId(item?.variantId || item?.variant_id);
    const key = `${productId.toString()}::${variantId}`;
    const quantity = clampQuantity(item?.quantity);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { productId, variantId, quantity });
      continue;
    }

    existing.quantity += quantity;
  }

  return [...merged.values()].map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: clampQuantity(item.quantity),
  }));
}

function toPersistedCartItems(items = []) {
  return normalizeCartItems(items).map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: new Int32(item.quantity),
  }));
}

function toUserDocument({ email, name }, hashedPassword, now = new Date()) {
  return {
    email: String(email || "").trim().toLowerCase(),
    name: String(name || "").trim(),
    passwordHash: String(hashedPassword || ""),
    cartItems: [],
    createdAt: now,
    updatedAt: now,
  };
}

function toUserUpdateDocument(payload = {}) {
  const set = {};

  if (payload.email !== undefined) {
    set.email = String(payload.email).trim().toLowerCase();
  }

  if (payload.name !== undefined) {
    set.name = String(payload.name).trim();
  }

  if (Object.keys(set).length === 0) {
    return {};
  }

  return { $set: { ...set, updatedAt: new Date() } };
}

function toUserDto(doc) {
  if (!doc) return null;

  const legacyCart = Array.isArray(doc.cart)
    ? doc.cart.map((productId) => ({ productId, variantId: DEFAULT_VARIANT_ID, quantity: 1 }))
    : [];
  const sourceCartItems = Array.isArray(doc.cartItems) ? doc.cartItems : legacyCart;

  const cartItems = normalizeCartItems(sourceCartItems).map((item) => ({
    productId: item.productId.toString(),
    variantId: item.variantId,
    quantity: item.quantity,
  }));

  return {
    id: doc._id.toString(),
    email: doc.email,
    name: doc.name,
    cart: cartItems.map((item) => item.productId),
    cartItems,
  };
}

module.exports = {
  DEFAULT_VARIANT_ID,
  normalizeCartItems,
  toPersistedCartItems,
  toUserDocument,
  toUserUpdateDocument,
  toUserDto,
};
