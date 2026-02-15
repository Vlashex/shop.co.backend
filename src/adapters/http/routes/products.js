function buildProductsRoutes(productUseCases) {
  return [
    {
      method: "GET",
      path: "/api/products",
      handler: async ({ query }, res) => {
        const start = parseInt(query.get("start") || "0", 10);
        const limit = parseInt(query.get("limit") || "10", 10);

        if (Number.isNaN(start) || Number.isNaN(limit)) {
          return res.json(400, { error: "Invalid pagination values" });
        }

        const products = await productUseCases.listProducts(start, limit);
        return res.json(200, products);
      },
    },
    {
      method: "POST",
      path: "/api/products/bulk",
      handler: async ({ body }, res) => {
        const { ids } = body || {};
        if (!Array.isArray(ids)) {
          return res.json(400, { error: "ids must be an array" });
        }
        const products = await productUseCases.getProductsByIds(ids);
        return res.json(200, products);
      },
    },
    {
      method: "POST",
      path: "/api/products/seed",
      handler: async (_ctx, res) => {
        const product = await productUseCases.createProduct({
          title: "Sample Product 1",
          price: 99,
          rate: 4.5,
          images: ["https://via.placeholder.com/300"],
        });

        return res.json(201, product);
      },
    },
    {
      method: "GET",
      path: "/api/products/:id",
      handler: async ({ params }, res) => {
        const id = parseInt(params.id, 10);
        if (Number.isNaN(id)) {
          return res.json(400, { error: "Invalid product ID" });
        }

        const product = await productUseCases.getProduct(id);
        if (!product) {
          return res.json(404, { error: "Product not found" });
        }

        return res.json(200, product);
      },
    },
    {
      method: "POST",
      path: "/api/products",
      handler: async ({ body }, res) => {
        const { title, price, rate, images, category, sizes, styles, colors } =
          body || {};

        if (!title || price === undefined || rate === undefined || !images) {
          return res.json(400, { error: "Missing required fields" });
        }

        const product = await productUseCases.createProduct({
          title,
          price,
          rate,
          images,
          category,
          sizes,
          styles,
          colors,
        });

        return res.json(201, product);
      },
    },
    {
      method: "PUT",
      path: "/api/products/:id",
      handler: async ({ params, body }, res) => {
        const id = parseInt(params.id, 10);
        if (Number.isNaN(id)) {
          return res.json(400, { error: "Invalid product ID" });
        }

        const updated = await productUseCases.updateProduct(id, body || {});
        if (!updated) {
          return res.json(404, { error: "Product not found" });
        }

        return res.json(200, updated);
      },
    },
    {
      method: "DELETE",
      path: "/api/products/:id",
      handler: async ({ params }, res) => {
        const id = parseInt(params.id, 10);
        if (Number.isNaN(id)) {
          return res.json(400, { error: "Invalid product ID" });
        }

        const deleted = await productUseCases.deleteProduct(id);
        if (!deleted) {
          return res.json(404, { error: "Product not found" });
        }

        return res.json(200, { success: true });
      },
    },
  ];
}

module.exports = {
  buildProductsRoutes,
};
