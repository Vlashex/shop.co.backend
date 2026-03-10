const { OrderDomainError } = require("../../../domain/order/errors");

function buildOrdersRoutes(orderUseCases, tokenService) {
  const adminUserIds = new Set(
    (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );

  function getUserId(headers) {
    const authHeader = headers.authorization;
    if (!authHeader) return null;
    return tokenService.getUserIdFromToken(authHeader);
  }

  function handleOrderError(error, res) {
    if (error instanceof OrderDomainError) {
      return res.json(error.statusCode, {
        error: error.message,
        code: error.code,
        details: error.details || undefined,
      });
    }

    return res.json(500, {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }

  return [
    {
      method: "POST",
      path: "/api/orders",
      handler: async ({ headers, body }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        try {
          const order = await orderUseCases.createOrder(userId, body || {});
          return res.json(201, order);
        } catch (error) {
          return handleOrderError(error, res);
        }
      },
    },
    {
      method: "GET",
      path: "/api/orders/:id",
      handler: async ({ headers, params }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        try {
          const order = await orderUseCases.getOrderById(params.id);

          if (!order) {
            return res.json(404, {
              error: "Order not found",
              code: "ORDER_NOT_FOUND",
            });
          }

          if (order.userId !== userId && !adminUserIds.has(userId)) {
            return res.json(403, {
              error: "Forbidden",
              code: "FORBIDDEN",
            });
          }

          return res.json(200, order);
        } catch (error) {
          return handleOrderError(error, res);
        }
      },
    },
  ];
}

module.exports = {
  buildOrdersRoutes,
};
