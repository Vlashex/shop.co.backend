function buildCartRoutes(cartUseCases, tokenService) {
  function getUserId(headers) {
    const authHeader = headers.authorization;
    if (!authHeader) return null;
    return tokenService.getUserIdFromToken(authHeader);
  }

  return [
    {
      method: "GET",
      path: "/api/cart",
      handler: async ({ headers }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        const user = await cartUseCases.getUserCart(userId);
        if (!user) {
          return res.json(404, { error: "User not found" });
        }

        return res.json(200, user);
      },
    },
    {
      method: "POST",
      path: "/api/cart/items",
      handler: async ({ headers, body }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        const { productId } = body || {};
        const parsed =
          typeof productId === "string" ? parseInt(productId, 10) : productId;

        if (Number.isNaN(parsed)) {
          return res.json(400, { error: "Invalid product ID" });
        }

        const user = await cartUseCases.addItem(userId, parsed);
        if (!user) {
          return res.json(404, { error: "User not found" });
        }

        return res.json(200, user);
      },
    },
    {
      method: "POST",
      path: "/api/cart/items/bulk",
      handler: async ({ headers, body }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        const { productIds } = body || {};
        if (!Array.isArray(productIds)) {
          return res.json(400, { error: "productIds must be an array" });
        }

        const user = await cartUseCases.addItems(userId, productIds);
        if (!user) {
          return res.json(404, { error: "User not found" });
        }

        return res.json(200, user);
      },
    },
    {
      method: "DELETE",
      path: "/api/cart/items/:productId",
      handler: async ({ headers, params }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        const productId = parseInt(params.productId, 10);
        if (Number.isNaN(productId)) {
          return res.json(400, { error: "Invalid product ID" });
        }

        const user = await cartUseCases.removeItem(userId, productId);
        if (!user) {
          return res.json(404, { error: "User not found" });
        }

        return res.json(200, user);
      },
    },
    {
      method: "DELETE",
      path: "/api/cart",
      handler: async ({ headers }, res) => {
        const userId = getUserId(headers);
        if (!userId) {
          return res.json(401, { error: "Invalid or missing token" });
        }

        const user = await cartUseCases.clear(userId);
        if (!user) {
          return res.json(404, { error: "User not found" });
        }

        return res.json(200, user);
      },
    },
  ];
}

module.exports = {
  buildCartRoutes,
};
