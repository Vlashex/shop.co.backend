const { MongoClient } = require("mongodb");
const { Pool } = require("pg");
const { createClient } = require("redis");

const { products: seedProducts } = require("../infrastructure/data/products");
const { ensurePostgresSchema } = require("../infrastructure/postgres/schema");
const { ensureSeedProducts } = require("../infrastructure/postgres/seed");
const {
  buildPostgresProductRepository,
} = require("../infrastructure/postgres/repositories/productPostgresRepository");
const {
  buildPostgresUserRepository,
} = require("../infrastructure/postgres/repositories/userPostgresRepository");
const {
  buildPostgresOrderRepository,
} = require("../infrastructure/postgres/repositories/orderPostgresRepository");
const {
  buildRedisRefreshTokenRepository,
} = require("../infrastructure/redis/repositories/refreshTokenRedisRepository");
const {
  buildMongoObjectStorageRepository,
} = require("../infrastructure/mongo/storage/objectStorageRepository");

async function buildRepositories(config = {}) {
  const pgConnectionString =
    config.postgresUrl || process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!pgConnectionString) {
    throw new Error("POSTGRES_URL or DATABASE_URL is required");
  }

  const redisUrl = config.redisUrl || process.env.REDIS_URL || "redis://localhost:6379";
  const mongoUri = config.mongoUri || process.env.MONGODB_URI || "mongodb://localhost:27017";
  const mongoDbName = config.mongoDbName || process.env.MONGODB_DB || "shop_objects";

  const pgPool = new Pool({ connectionString: pgConnectionString });
  await ensurePostgresSchema(pgPool);
  await ensureSeedProducts(pgPool, seedProducts);

  const redis = createClient({ url: redisUrl });
  redis.on("error", (error) => console.error("[Redis]", error));
  await redis.connect();

  const mongoClient = new MongoClient(mongoUri);
  await mongoClient.connect();
  const objectStorageRepository = buildMongoObjectStorageRepository(
    mongoClient.db(mongoDbName)
  );

  return {
    productRepository: buildPostgresProductRepository(pgPool),
    userRepository: buildPostgresUserRepository(pgPool),
    orderRepository: buildPostgresOrderRepository(pgPool),
    refreshTokenRepository: buildRedisRefreshTokenRepository(redis),
    objectStorageRepository,
    clients: {
      postgres: pgPool,
      redis,
      mongo: mongoClient,
    },
  };
}

module.exports = {
  buildRepositories,
};
