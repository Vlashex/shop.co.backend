const { MongoClient } = require("mongodb");
const { products: seedProducts } = require("../infrastructure/data/products");
const {
  COLLECTION_NAMES,
  COLLECTION_VALIDATORS,
  buildCollections,
} = require("../infrastructure/mongo/collections");
const { ensureCollections } = require("../infrastructure/mongo/schema");
const { ensureIndexes } = require("../infrastructure/mongo/indexes");
const { ensureSeedProducts } = require("../infrastructure/mongo/seed");
const {
  buildMongoProductRepository,
} = require("../infrastructure/mongo/repositories/productMongoRepository");
const {
  buildMongoUserRepository,
} = require("../infrastructure/mongo/repositories/userMongoRepository");

async function buildMongoRepositories(config = {}) {
  const uri = config.uri || process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = config.dbName || process.env.MONGODB_DB || "shop";

  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(dbName);

  await ensureCollections(db, COLLECTION_VALIDATORS);

  const collections = buildCollections(db);

  await ensureIndexes(collections);
  await ensureSeedProducts(collections, seedProducts);

  return {
    productRepository: buildMongoProductRepository(collections, COLLECTION_NAMES),
    userRepository: buildMongoUserRepository(collections, COLLECTION_NAMES),
  };
}

module.exports = {
  buildMongoRepositories,
  COLLECTION_NAMES,
};