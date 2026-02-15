const { MongoClient } = require("mongodb");
const { products } = require("../data/products");
const {
  buildMongoProductRepository,
} = require("../../adapters/repositories/mongoProductRepository");
const {
  buildMongoUserRepository,
} = require("../../adapters/repositories/mongoUserRepository");

async function ensureSeedProducts(productsCollection) {
  const count = await productsCollection.countDocuments();
  if (count > 0) return;
  await productsCollection.insertMany(products);
}

async function ensureCounters(countersCollection, productsCollection) {
  const productDoc = await productsCollection
    .find({})
    .sort({ id: -1 })
    .limit(1)
    .toArray();
  const maxProductId = productDoc[0]?.id || 0;

  await countersCollection.updateOne(
    { _id: "products" },
    { $setOnInsert: { seq: maxProductId + 1 } },
    { upsert: true }
  );

  await countersCollection.updateOne(
    { _id: "users" },
    { $setOnInsert: { seq: 1 } },
    { upsert: true }
  );
}

async function buildRepositories() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB || "shop";

  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(dbName);
  const productsCollection = db.collection("products");
  const usersCollection = db.collection("users");
  const countersCollection = db.collection("counters");

  await ensureSeedProducts(productsCollection);
  await ensureCounters(countersCollection, productsCollection);

  async function nextId(key) {
    await countersCollection.updateOne(
      { _id: key },
      { $inc: { seq: 1 } },
      { upsert: true }
    );

    const doc = await countersCollection.findOne({ _id: key });
    return doc ? doc.seq : 1;
  }

  return {
    productRepository: buildMongoProductRepository(
      productsCollection,
      nextId
    ),
    userRepository: buildMongoUserRepository(usersCollection, nextId),
  };
}

module.exports = {
  buildRepositories,
};
