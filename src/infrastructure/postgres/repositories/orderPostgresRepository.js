const { ORDER_STATUS } = require("../../../domain/order/status");
const { OrderDomainError } = require("../../../domain/order/errors");
const { makeEntityId, normalizeEntityId } = require("../ids");
const { toMoney, toOrderDto } = require("../mappers/orderMapper");

function buildPostgresOrderRepository(pool) {
  async function createOrder({ userId, items }) {
    const normalizedUserId = normalizeEntityId(userId);
    if (!normalizedUserId) {
      throw new OrderDomainError("MALFORMED_REQUEST", "Invalid userId", 400, { userId });
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const userResult = await client.query("SELECT id FROM users WHERE id = $1", [
        normalizedUserId,
      ]);
      if (!userResult.rows[0]) {
        throw new OrderDomainError("UNAUTHORIZED", "User not found", 401, { userId });
      }

      const persistedItems = [];

      for (const item of items) {
        const productId = normalizeEntityId(item.productId);
        if (!productId) {
          throw new OrderDomainError("PRODUCT_NOT_FOUND", "Product not found", 404, {
            productId: item.productId,
          });
        }

        const productResult = await client.query(
          "SELECT * FROM products WHERE id = $1 FOR UPDATE",
          [productId]
        );
        const product = productResult.rows[0];

        if (!product) {
          throw new OrderDomainError("PRODUCT_NOT_FOUND", "Product not found", 404, {
            productId: item.productId,
          });
        }

        const variants = Array.isArray(product.variants) ? product.variants : [];
        const variantIndex = variants.findIndex((candidate) => candidate.id === item.variantId);
        const variant = variants[variantIndex];

        if (!variant) {
          throw new OrderDomainError("VARIANT_NOT_FOUND", "Variant not found", 404, {
            productId,
            variantId: item.variantId,
          });
        }

        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new OrderDomainError("INVALID_QUANTITY", "Quantity must be a positive integer", 400, {
            productId,
            variantId: item.variantId,
            quantity: item.quantity,
          });
        }

        const stock = Number(variant.stock);
        if (stock < quantity) {
          throw new OrderDomainError("INSUFFICIENT_STOCK", "Insufficient stock", 409, {
            productId,
            variantId: item.variantId,
            available: Math.max(0, Math.floor(stock)),
            requested: quantity,
          });
        }

        const nextVariants = variants.map((candidate, index) =>
          index === variantIndex
            ? { ...candidate, stock: Math.max(0, Math.floor(stock) - quantity) }
            : candidate
        );
        await client.query(
          "UPDATE products SET variants = $2::jsonb, updated_at = now() WHERE id = $1",
          [productId, JSON.stringify(nextVariants)]
        );

        const unitPrice = toMoney(variant.price, product.pricing?.current || 0);
        const lineTotal = toMoney(unitPrice * quantity);
        persistedItems.push({
          productId,
          variantId: variant.id,
          productTitle: product.title,
          quantity,
          unitPrice,
          lineTotal,
          variant: {
            size: typeof variant.size === "string" ? variant.size : "",
            style: typeof variant.style === "string" ? variant.style : "",
            color: typeof variant.color === "string" ? variant.color : "",
          },
        });
      }

      const totalPrice = toMoney(persistedItems.reduce((sum, item) => sum + item.lineTotal, 0));
      const orderId = makeEntityId();
      const insertResult = await client.query(
        `
          INSERT INTO orders (id, user_id, status, items, total_price)
          VALUES ($1, $2, $3, $4::jsonb, $5)
          RETURNING *
        `,
        [
          orderId,
          normalizedUserId,
          ORDER_STATUS.CREATED,
          JSON.stringify(persistedItems),
          totalPrice,
        ]
      );

      await client.query("COMMIT");
      return toOrderDto(insertResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function getById(orderId) {
    const normalizedId = normalizeEntityId(orderId);
    if (!normalizedId) return null;

    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [normalizedId]);
    return toOrderDto(result.rows[0]);
  }

  return {
    createOrder,
    getById,
  };
}

module.exports = {
  buildPostgresOrderRepository,
};
