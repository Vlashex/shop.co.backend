function isObjectIdLike(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

function buildProductsRoutes(productUseCases) {
  return [
    {
      method: "GET",
      path: "/api/products",
      handler: async ({ query }, res) => {
        const start = parseInt(query.get("start") || "0", 10);
        const limit = parseInt(query.get("limit") || "10", 10);

        if (Number.isNaN(start) || Number.isNaN(limit) || start < 0 || limit < 1) {
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
        if (!Array.isArray(ids) || ids.some((id) => !isObjectIdLike(id))) {
          return res.json(400, { error: "ids must be an array of ObjectId strings" });
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
          category: "t-shirt",
          images: ["https://via.placeholder.com/300"],
          sizes: ["Medium"],
          styles: ["casual"],
          colors: ["black"],
        });

        return res.json(201, product);
      },
    },
    {
      method: "GET",
      path: "/api/products/:id",
      handler: async ({ params }, res) => {
        const id = params.id;
        if (!isObjectIdLike(id)) {
          return res.json(400, { error: "Invalid product ID" });
        }
        const product = await productUseCases.getProduct(id);
        console.log(product)
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

        if (!title || price === undefined || rate === undefined || !category) {
          return res.json(400, { error: "Missing required fields" });
        }

        try {
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
        } catch (error) {
          return res.json(400, { error: error.message || "Invalid product payload" });
        }
      },
    },
    {
      method: "PUT",
      path: "/api/products/:id",
      handler: async ({ params, body }, res) => {
        const id = params.id;
        if (!isObjectIdLike(id)) {
          return res.json(400, { error: "Invalid product ID" });
        }

        try {
          const updated = await productUseCases.updateProduct(id, body || {});
          if (!updated) {
            return res.json(404, { error: "Product not found" });
          }

          return res.json(200, updated);
        } catch (error) {
          return res.json(400, { error: error.message || "Invalid update payload" });
        }
      },
    },
    {
      method: "DELETE",
      path: "/api/products/:id",
      handler: async ({ params }, res) => {
        const id = params.id;
        if (!isObjectIdLike(id)) {
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