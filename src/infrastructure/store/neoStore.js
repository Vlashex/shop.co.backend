const neo4j = require("neo4j-driver");
const { products } = require("../data/products");
const {
  buildNeoProductRepository,
} = require("../../adapters/repositories/neoProductRepository");
const {
  buildNeoUserRepository,
} = require("../../adapters/repositories/neoUserRepository");

async function ensureConstraints(session) {
  await session.run(
    "CREATE CONSTRAINT product_id IF NOT EXISTS FOR (p:Product) REQUIRE p.id IS UNIQUE"
  );
  await session.run(
    "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE"
  );
  await session.run(
    "CREATE CONSTRAINT user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE"
  );
}

async function ensureSeedProducts(session) {
  const result = await session.run(
    "MATCH (p:Product) RETURN COUNT(p) as count"
  );
  const count = Number(result.records[0]?.get("count") || 0);
  if (count > 0) return;

  for (const product of products) {
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
  }
}

function buildRepositories() {
  const rawUri = process.env.NEO4J_URI || "bolt://localhost:7687";
  const uri = rawUri.startsWith("neo4j://")
    ? rawUri.replace("neo4j://", "bolt://")
    : rawUri;
  const user = process.env.NEO4J_USER || "neo4j";
  const password = process.env.NEO4J_PASSWORD || "password";

  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    encrypted: false,
  });

  async function init() {
    const session = driver.session();
    try {
      await ensureConstraints(session);
      await ensureSeedProducts(session);
    } finally {
      await session.close();
    }
  }

  async function nextId(key) {
    const session = driver.session();
    try {
      const result = await session.run(
        `MERGE (c:Counter {name: $name})
         ON CREATE SET c.seq = 0
         SET c.seq = c.seq + 1
         RETURN c.seq as seq`,
        { name: key }
      );
      return Number(result.records[0]?.get("seq") || 1);
    } finally {
      await session.close();
    }
  }

  return init().then(() => ({
    productRepository: buildNeoProductRepository(driver, nextId),
    userRepository: buildNeoUserRepository(driver, nextId),
  }));
}

module.exports = {
  buildRepositories,
};
