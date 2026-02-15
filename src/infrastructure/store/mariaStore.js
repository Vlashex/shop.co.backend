const mariadb = require("mariadb");
const { products } = require("../data/products");
const {
  buildMariaProductRepository,
} = require("../../adapters/repositories/mariaProductRepository");
const {
  buildMariaUserRepository,
} = require("../../adapters/repositories/mariaUserRepository");

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      price DOUBLE NOT NULL,
      previousPrice DOUBLE NOT NULL,
      rate DOUBLE NOT NULL,
      images TEXT NOT NULL,
      category VARCHAR(100),
      sizes TEXT,
      styles TEXT,
      colors TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      cart TEXT NOT NULL,
      passwordHash TEXT NOT NULL
    )
  `);
}

async function ensureSeedProducts(pool) {
  const rows = await pool.query("SELECT COUNT(*) as count FROM products");
  if (rows[0]?.count > 0) return;

  for (const product of products) {
    await pool.query(
      `INSERT INTO products
        (id, title, price, previousPrice, rate, images, category, sizes, styles, colors)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        product.id,
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
  }
}

async function buildRepositories() {
  const pool = mariadb.createPool({
    host: process.env.MARIADB_HOST || "localhost",
    port: Number(process.env.MARIADB_PORT || 3306),
    user: process.env.MARIADB_USER || "root",
    password: process.env.MARIADB_PASSWORD || "",
    database: process.env.MARIADB_DATABASE || "shop",
    connectionLimit: 5,
  });

  await ensureSchema(pool);
  await ensureSeedProducts(pool);

  return {
    productRepository: buildMariaProductRepository(pool),
    userRepository: buildMariaUserRepository(pool),
  };
}

module.exports = {
  buildRepositories,
};
