const { createProduct } = require("../../domain/entities");

function parseProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    price: Number(row.price),
    previousPrice: Number(row.previousPrice),
    rate: Number(row.rate),
    images: JSON.parse(row.images || "[]"),
    category: row.category || "",
    sizes: JSON.parse(row.sizes || "[]"),
    styles: JSON.parse(row.styles || "[]"),
    colors: JSON.parse(row.colors || "[]"),
  };
}

function buildMariaProductRepository(pool) {
  async function getAll(start = 0, limit = 10) {
    const rows = await pool.query(
      "SELECT * FROM products ORDER BY id LIMIT ? OFFSET ?",
      [limit, start]
    );
    return rows.map(parseProduct);
  }

  async function getById(id) {
    const rows = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
    return parseProduct(rows[0]);
  }

  async function getByIds(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    const rows = await pool.query(
      `SELECT * FROM products WHERE id IN (${placeholders})`,
      ids
    );
    return rows.map(parseProduct);
  }

  async function create(data) {
    const product = createProduct({
      id: 0,
      title: data.title,
      price: data.price,
      rate: data.rate,
      images: data.images,
      category: data.category,
      sizes: data.sizes,
      styles: data.styles,
      colors: data.colors,
    });

    const result = await pool.query(
      `INSERT INTO products
        (title, price, previousPrice, rate, images, category, sizes, styles, colors)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.title,
        product.price,
        product.previousPrice,
        product.rate,
        JSON.stringify(product.images || []),
        product.category || "",
        JSON.stringify(product.sizes || []),
        JSON.stringify(product.styles || []),
        JSON.stringify(product.colors || []),
      ]
    );

    product.id = Number(result.insertId);
    return product;
  }

  async function update(id, data) {
    const fields = [];
    const values = [];
    const payload = data || {};

    if (payload.title !== undefined) {
      fields.push("title = ?");
      values.push(payload.title);
    }
    if (payload.price !== undefined) {
      fields.push("price = ?");
      values.push(payload.price);
    }
    if (payload.rate !== undefined) {
      fields.push("rate = ?");
      values.push(payload.rate);
    }
    if (payload.category !== undefined) {
      fields.push("category = ?");
      values.push(payload.category);
    }
    if (payload.images !== undefined) {
      fields.push("images = ?");
      values.push(JSON.stringify(payload.images || []));
    }
    if (payload.sizes !== undefined) {
      fields.push("sizes = ?");
      values.push(JSON.stringify(payload.sizes || []));
    }
    if (payload.styles !== undefined) {
      fields.push("styles = ?");
      values.push(JSON.stringify(payload.styles || []));
    }
    if (payload.colors !== undefined) {
      fields.push("colors = ?");
      values.push(JSON.stringify(payload.colors || []));
    }

    if (payload.price !== undefined) {
      fields.push("previousPrice = ?");
      values.push(Number(payload.price) * 1.2);
    }

    if (!fields.length) {
      return getById(id);
    }

    values.push(id);
    await pool.query(
      `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return getById(id);
  }

  async function remove(id) {
    const result = await pool.query("DELETE FROM products WHERE id = ?", [id]);
    return result.affectedRows === 1;
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
  buildMariaProductRepository,
};
