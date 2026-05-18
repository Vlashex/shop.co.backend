async function ensurePostgresSchema(pool) {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(24) PRIMARY KEY,
      title TEXT NOT NULL,
      pricing JSONB NOT NULL,
      rating NUMERIC(3, 2) NOT NULL DEFAULT 0,
      category TEXT NOT NULL,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
      variants JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(24) PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(24) PRIMARY KEY,
      user_id VARCHAR(24) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      items JSONB NOT NULL,
      total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await pool.query("CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)");
}

module.exports = {
  ensurePostgresSchema,
};
