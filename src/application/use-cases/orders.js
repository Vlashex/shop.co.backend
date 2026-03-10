const { OrderDomainError } = require("../../domain/order/errors");
const { isObjectIdString } = require("../../domain/shared/objectId");

function normalizeOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderDomainError(
      "MALFORMED_REQUEST",
      "items must be a non-empty array",
      400
    );
  }

  const aggregated = new Map();

  for (const item of items) {
    if (!item || typeof item !== "object") {
      throw new OrderDomainError("MALFORMED_REQUEST", "Invalid order item", 400);
    }

    const productId = String(item.productId || "").trim();
    const variantId = String(item.variantId || "").trim();
    const quantity = Number(item.quantity);

    if (!isObjectIdString(productId)) {
      throw new OrderDomainError("MALFORMED_REQUEST", "Invalid productId", 400, {
        productId,
      });
    }

    if (!variantId) {
      throw new OrderDomainError("MALFORMED_REQUEST", "variantId is required", 400, {
        productId,
      });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new OrderDomainError("INVALID_QUANTITY", "Quantity must be a positive integer", 400, {
        productId,
        variantId,
        quantity: item.quantity,
      });
    }

    const key = `${productId}:${variantId}`;
    const current = aggregated.get(key);

    if (!current) {
      aggregated.set(key, { productId, variantId, quantity });
    } else {
      current.quantity += quantity;
    }
  }

  return [...aggregated.values()];
}

function buildOrderUseCases({ orderRepository }) {
  async function createOrder(userId, payload) {
    if (typeof userId !== "string" || userId.trim().length === 0) {
      throw new OrderDomainError("UNAUTHORIZED", "Authentication is required", 401);
    }

    const normalizedItems = normalizeOrderItems(payload?.items);

    return orderRepository.createOrder({
      userId,
      items: normalizedItems,
    });
  }

  async function getOrderById(orderId) {
    if (!isObjectIdString(orderId)) {
      throw new OrderDomainError("MALFORMED_REQUEST", "Invalid order ID", 400);
    }

    return orderRepository.getById(orderId);
  }

  return {
    createOrder,
    getOrderById,
  };
}

module.exports = {
  buildOrderUseCases,
};
