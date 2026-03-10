const { toObjectIdOrNull } = require("../objectId");

function clampQuantity(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.floor(parsed));
}

function normalizeCartItems(items = []) {
  if (!Array.isArray(items)) return [];

  const merged = new Map();

  for (const item of items) {
    const productId = toObjectIdOrNull(item?.productId || item?.product_id || item?.id);
    if (!productId) continue;

    const key = productId.toString();
    const quantity = clampQuantity(item?.quantity);
    const next = (merged.get(key) || 0) + quantity;
    merged.set(key, next);
  }

  return [...merged.entries()].map(([id, quantity]) => ({
    productId: toObjectIdOrNull(id),
    quantity,
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
    ? doc.cart.map((productId) => ({ productId, quantity: 1 }))
    : [];
  const sourceCartItems = Array.isArray(doc.cartItems) ? doc.cartItems : legacyCart;

  const cartItems = normalizeCartItems(sourceCartItems).map((item) => ({
    productId: item.productId.toString(),
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
  normalizeCartItems,
  toUserDocument,
  toUserUpdateDocument,
  toUserDto,
};
