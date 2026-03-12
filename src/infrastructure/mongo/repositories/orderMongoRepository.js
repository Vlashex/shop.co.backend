const { Int32 } = require("mongodb");

const { ORDER_STATUS } = require("../../../domain/order/status");
const { OrderDomainError } = require("../../../domain/order/errors");
const { toObjectIdOrNull } = require("../objectId");
const { toOrderDto } = require("../mappers/orderMapper");

function toMoney(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.round(Number(fallback) * 100) / 100;
  }
  return Math.round(parsed * 100) / 100;
}

function hasTransientTransactionError(error) {
  if (!error || typeof error !== "object") return false;
  if (typeof error.hasErrorLabel === "function") {
    return (
      error.hasErrorLabel("TransientTransactionError") ||
      error.hasErrorLabel("UnknownTransactionCommitResult")
    );
  }
  return false;
}

function isTransactionUnsupportedError(error) {
  if (!error || typeof error !== "object") return false;

  const message = typeof error.message === "string" ? error.message : "";
  if (
    message.includes("Transaction numbers are only allowed on a replica set member or mongos")
  ) {
    return true;
  }

  return error.code === 20;
}

async function withRetryableTransaction(client, operation, maxRetries = 3) {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt += 1;
    const session = client.startSession();

    try {
      const result = await session.withTransaction(
        async () => operation(session),
        {
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority" },
          readPreference: "primary",
        }
      );
      return result;
    } catch (error) {
      if (!hasTransientTransactionError(error) || attempt >= maxRetries) {
        throw error;
      }
    } finally {
      await session.endSession();
    }
  }

  throw new Error("Transaction retry failed");
}

function buildMongoOrderRepository(collections, client) {
  const { products, orders } = collections;

  function sessionOptions(session) {
    return session ? { session } : {};
  }

  async function rollbackDeductedStocks(deductions, now) {
    for (const deduction of deductions) {
      await products.updateOne(
        {
          _id: deduction.productObjectId,
          variants: {
            $elemMatch: {
              id: deduction.variantId,
            },
          },
        },
        {
          $inc: { "variants.$.stock": new Int32(deduction.quantity) },
          $set: { updatedAt: now },
        }
      );
    }
  }

  async function processOrderCreation({ userId, items, session = null }) {
    const now = new Date();
    const persistedItems = [];
    const deductions = [];

    try {
      for (const item of items) {
        const productObjectId = toObjectIdOrNull(item.productId);
        if (!productObjectId) {
          throw new OrderDomainError(
            "PRODUCT_NOT_FOUND",
            "Product not found",
            404,
            { productId: item.productId }
          );
        }

        const product = await products.findOne(
          { _id: productObjectId },
          {
            projection: { title: 1, pricing: 1, variants: 1 },
            ...sessionOptions(session),
          }
        );

        if (!product) {
          throw new OrderDomainError(
            "PRODUCT_NOT_FOUND",
            "Product not found",
            404,
            { productId: item.productId }
          );
        }

        const variant = Array.isArray(product.variants)
          ? product.variants.find((candidate) => candidate.id === item.variantId)
          : null;

        if (!variant) {
          throw new OrderDomainError(
            "VARIANT_NOT_FOUND",
            "Variant not found",
            404,
            { productId: item.productId, variantId: item.variantId }
          );
        }

        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new OrderDomainError(
            "INVALID_QUANTITY",
            "Quantity must be a positive integer",
            400,
            { productId: item.productId, variantId: item.variantId, quantity: item.quantity }
          );
        }

        const stock = Number(variant.stock);
        if (stock < quantity) {
          throw new OrderDomainError(
            "INSUFFICIENT_STOCK",
            "Insufficient stock",
            409,
            {
              productId: item.productId,
              variantId: item.variantId,
              available: Math.max(0, Math.floor(stock)),
              requested: quantity,
            }
          );
        }

        const updateResult = await products.updateOne(
          {
            _id: productObjectId,
            variants: {
              $elemMatch: {
                id: item.variantId,
                stock: { $gte: quantity },
              },
            },
          },
          {
            $inc: { "variants.$.stock": new Int32(-quantity) },
            $set: { updatedAt: now },
          },
          sessionOptions(session)
        );

        if (updateResult.modifiedCount !== 1) {
          throw new OrderDomainError(
            "INSUFFICIENT_STOCK",
            "Insufficient stock",
            409,
            {
              productId: item.productId,
              variantId: item.variantId,
              available: Math.max(0, Math.floor(stock)),
              requested: quantity,
            }
          );
        }

        deductions.push({
          productObjectId,
          variantId: item.variantId,
          quantity,
        });

        const unitPrice = toMoney(
          variant.price,
          product.pricing?.current !== undefined ? product.pricing.current : 0
        );
        const lineTotal = toMoney(unitPrice * quantity);

        persistedItems.push({
          productId: product._id.toString(),
          variantId: variant.id,
          productTitle: product.title,
          quantity: new Int32(quantity),
          unitPrice,
          lineTotal,
          variant: {
            size: typeof variant.size === "string" ? variant.size : "",
            style: typeof variant.style === "string" ? variant.style : "",
            color: typeof variant.color === "string" ? variant.color : "",
          },
        });
      }

      const totalPrice = toMoney(
        persistedItems.reduce((sum, item) => sum + Number(item.lineTotal), 0)
      );

      const orderDoc = {
        userId,
        status: ORDER_STATUS.CREATED,
        items: persistedItems,
        totalPrice,
        createdAt: now,
        updatedAt: now,
      };

      const insertResult = await orders.insertOne(orderDoc, sessionOptions(session));
      return {
        ...orderDoc,
        _id: insertResult.insertedId,
      };
    } catch (error) {
      // When transactions are unavailable, revert already deducted stocks manually.
      if (!session && deductions.length > 0) {
        await rollbackDeductedStocks(deductions, new Date());
      }
      throw error;
    }
  }

  async function createOrder({ userId, items }) {
    let createdOrder;

    try {
      createdOrder = await withRetryableTransaction(client, async (session) =>
        processOrderCreation({ userId, items, session })
      );
    } catch (error) {
      // Fallback for local / non-replica Mongo setups.
      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }

      createdOrder = await processOrderCreation({ userId, items, session: null });
    }

    return toOrderDto(createdOrder);
  }

  async function getById(orderId) {
    const objectId = toObjectIdOrNull(orderId);
    if (!objectId) return null;

    const doc = await orders.findOne({ _id: objectId });
    return toOrderDto(doc);
  }

  return {
    createOrder,
    getById,
  };
}

module.exports = {
  buildMongoOrderRepository,
};
