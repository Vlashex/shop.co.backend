const { createProduct } = require("../../domain/entities");

function mapProduct(record) {
  if (!record) return null;
  const node = record.get("p");
  if (!node) return null;
  return {
    id: Number(node.properties.id),
    title: node.properties.title,
    price: Number(node.properties.price),
    previousPrice: Number(node.properties.previousPrice),
    rate: Number(node.properties.rate),
    images: node.properties.images || [],
    category: node.properties.category || "",
    sizes: node.properties.sizes || [],
    styles: node.properties.styles || [],
    colors: node.properties.colors || [],
  };
}

function buildNeoProductRepository(driver, nextId) {
  async function getAll(start = 0, limit = 10) {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Product)
         RETURN p
         ORDER BY p.id
         SKIP $start LIMIT $limit`,
        { start: Number(start), limit: Number(limit) }
      );
      return result.records.map(mapProduct);
    } finally {
      await session.close();
    }
  }

  async function getById(id) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (p:Product {id: $id}) RETURN p LIMIT 1",
        { id: Number(id) }
      );
      return mapProduct(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async function getByIds(ids) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (p:Product) WHERE p.id IN $ids RETURN p",
        { ids: ids.map(Number) }
      );
      return result.records.map(mapProduct);
    } finally {
      await session.close();
    }
  }

  async function create(data) {
    const id = await nextId("products");
    const product = createProduct({
      id,
      title: data.title,
      price: data.price,
      rate: data.rate,
      images: data.images,
      category: data.category,
      sizes: data.sizes,
      styles: data.styles,
      colors: data.colors,
    });

    const session = driver.session();
    try {
      await session.run(
        `CREATE (p:Product {
          id: $id,
          title: $title,
          price: $price,
          previousPrice: $previousPrice,
          rate: $rate,
          images: $images,
          category: $category,
          sizes: $sizes,
          styles: $styles,
          colors: $colors
        })`,
        product
      );
      return product;
    } finally {
      await session.close();
    }
  }

  async function update(id, data) {
    const updates = { ...data };
    if (updates.price !== undefined) {
      updates.previousPrice = Number(updates.price) * 1.2;
    }

    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (p:Product {id: $id})
         SET p += $updates
         RETURN p`,
        { id: Number(id), updates }
      );
      return mapProduct(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async function remove(id) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (p:Product {id: $id}) DETACH DELETE p RETURN COUNT(p) as removed",
        { id: Number(id) }
      );
      const removed = result.records[0]?.get("removed");
      return Number(removed) > 0;
    } finally {
      await session.close();
    }
  }

  return {
    getAll,
    getById,
    getByIds,
    create,
    update,
    remove,
  };
}

module.exports = {
  buildNeoProductRepository,
};
