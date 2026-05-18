const { buildPostgresProductRepository } = require("./repositories/productPostgresRepository");

async function ensureSeedProducts(pool, seedProducts) {
  const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM products");
  if (Number(countResult.rows[0]?.count || 0) > 0) return;

  const productRepository = buildPostgresProductRepository(pool);
  for (const product of seedProducts) {
    await productRepository.create(product);
  }
}

module.exports = {
  ensureSeedProducts,
};
