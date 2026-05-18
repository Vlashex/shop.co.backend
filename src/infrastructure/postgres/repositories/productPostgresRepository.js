const { makeEntityId, normalizeEntityId } = require("../ids");
const {
  applyProductUpdates,
  rowToProduct,
  toProductRecord,
} = require("../mappers/productMapper");

function buildPostgresProductRepository(pool) {
  async function getAll(start = 0, limit = 10) {
    const result = await pool.query(
      `
        SELECT *
        FROM products
        ORDER BY id ASC
        OFFSET $1
        LIMIT $2
      `,
      [Math.max(0, Number(start) || 0), Math.max(1, Number(limit) || 10)]
    );
    return result.rows.map(rowToProduct);
  }

  async function getById(id) {
    const normalizedId = normalizeEntityId(id);
    if (!normalizedId) return null;
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [normalizedId]);
    return rowToProduct(result.rows[0]);
  }

  async function getByIds(ids) {
    const normalizedIds = Array.isArray(ids) ? ids.map(normalizeEntityId).filter(Boolean) : [];
    if (normalizedIds.length === 0) return [];

    const result = await pool.query("SELECT * FROM products WHERE id = ANY($1::text[])", [
      normalizedIds,
    ]);
    const byId = new Map(result.rows.map((row) => [String(row.id).trim(), rowToProduct(row)]));
    return ids.map((id) => byId.get(String(id))).filter(Boolean);
  }

  async function create(data) {
    const id = makeEntityId();
    const record = toProductRecord(data);
    if (!record.title) throw new Error("title is required");
    if (!record.category) throw new Error("category is required");

    const result = await pool.query(
      `
        INSERT INTO products (id, title, pricing, rating, category, images, attributes, variants, created_at, updated_at)
        VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10)
        RETURNING *
      `,
      [
        id,
        record.title,
        JSON.stringify(record.pricing),
        record.rating,
        record.category,
        JSON.stringify(record.images),
        JSON.stringify(record.attributes),
        JSON.stringify(record.variants),
        record.createdAt,
        record.updatedAt,
      ]
    );

    return rowToProduct(result.rows[0]);
  }

  async function update(id, data) {
    const normalizedId = normalizeEntityId(id);
    if (!normalizedId) return null;

    const existing = await pool.query("SELECT * FROM products WHERE id = $1", [normalizedId]);
    if (!existing.rows[0]) return null;

    const next = applyProductUpdates(existing.rows[0], data);
    const result = await pool.query(
      `
        UPDATE products
        SET title = $2,
            pricing = $3::jsonb,
            rating = $4,
            category = $5,
            images = $6::jsonb,
            attributes = $7::jsonb,
            variants = $8::jsonb,
            updated_at = $9
        WHERE id = $1
        RETURNING *
      `,
      [
        normalizedId,
        next.title,
        JSON.stringify(next.pricing),
        next.rating,
        next.category,
        JSON.stringify(next.images),
        JSON.stringify(next.attributes),
        JSON.stringify(next.variants),
        next.updatedAt,
      ]
    );

    return rowToProduct(result.rows[0]);
  }

  async function remove(id) {
    const normalizedId = normalizeEntityId(id);
    if (!normalizedId) return false;
    const result = await pool.query("DELETE FROM products WHERE id = $1", [normalizedId]);
    return result.rowCount === 1;
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
  buildPostgresProductRepository,
};
