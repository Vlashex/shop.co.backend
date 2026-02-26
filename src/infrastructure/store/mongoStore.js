const { MongoClient } = require("mongodb");
const { products: seedProducts } = require("../data/products");
const {
  buildMongoProductRepository,
} = require("../../adapters/repositories/mongoProductRepository");
const {
  buildMongoUserRepository,
} = require("../../adapters/repositories/mongoUserRepository");

const COLLECTION_NAMES = {
  users: "users",
  refreshTokens: "refresh_tokens",
  products: "products",
  categories: "categories",
  sizes: "sizes",
  styles: "styles",
  colors: "colors",
  productImages: "product_images",
  productSizes: "product_sizes",
  productStyles: "product_styles",
  productColors: "product_colors",
  cartItems: "cart_items",
};

const COLLECTION_VALIDATORS = {
  [COLLECTION_NAMES.users]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "password_hash"],
      properties: {
        email: { bsonType: "string", minLength: 3 },
        name: { bsonType: "string", minLength: 1 },
        password_hash: { bsonType: "string", minLength: 20 },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.refreshTokens]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "token", "expires_at"],
      properties: {
        user_id: { bsonType: "objectId" },
        token: { bsonType: "string", minLength: 10 },
        expires_at: { bsonType: "date" },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.products]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "price", "previous_price", "rate", "category_id"],
      properties: {
        title: { bsonType: "string", minLength: 1 },
        price: { bsonType: ["double", "int", "long", "decimal"] },
        previous_price: { bsonType: ["double", "int", "long", "decimal"] },
        rate: { bsonType: ["double", "int", "long", "decimal"] },
        category_id: { bsonType: "objectId" },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.categories]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name"],
      properties: {
        name: { bsonType: "string", minLength: 1 },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.sizes]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name"],
      properties: {
        name: { bsonType: "string", minLength: 1 },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.styles]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name"],
      properties: {
        name: { bsonType: "string", minLength: 1 },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.colors]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name"],
      properties: {
        name: { bsonType: "string", minLength: 1 },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.productImages]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["product_id", "url"],
      properties: {
        product_id: { bsonType: "objectId" },
        url: { bsonType: "string", minLength: 1 },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.productSizes]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["product_id", "size_id"],
      properties: {
        product_id: { bsonType: "objectId" },
        size_id: { bsonType: "objectId" },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.productStyles]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["product_id", "style_id"],
      properties: {
        product_id: { bsonType: "objectId" },
        style_id: { bsonType: "objectId" },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.productColors]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["product_id", "color_id"],
      properties: {
        product_id: { bsonType: "objectId" },
        color_id: { bsonType: "objectId" },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.cartItems]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "product_id", "quantity"],
      properties: {
        user_id: { bsonType: "objectId" },
        product_id: { bsonType: "objectId" },
        quantity: { bsonType: ["int", "long", "double"], minimum: 1 },
      },
      additionalProperties: true,
    },
  },
};

async function ensureCollection(db, name, validator) {
  const existing = await db.listCollections({ name }, { nameOnly: true }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name, {
      validator,
      validationAction: "error",
      validationLevel: "strict",
    });
    return;
  }

  await db.command({
    collMod: name,
    validator,
    validationAction: "error",
    validationLevel: "strict",
  });
}

async function ensureCollections(db) {
  for (const [name, validator] of Object.entries(COLLECTION_VALIDATORS)) {
    await ensureCollection(db, name, validator);
  }
}

async function ensureIndexes(collections) {
  await collections.users.createIndex({ email: 1 }, { unique: true, name: "uniq_users_email" });

  await collections.products.createIndex({ category_id: 1 }, { name: "idx_products_category_id" });

  await collections.categories.createIndex({ name: 1 }, { unique: true, name: "uniq_categories_name" });
  await collections.sizes.createIndex({ name: 1 }, { unique: true, name: "uniq_sizes_name" });
  await collections.styles.createIndex({ name: 1 }, { unique: true, name: "uniq_styles_name" });
  await collections.colors.createIndex({ name: 1 }, { unique: true, name: "uniq_colors_name" });

  await collections.productImages.createIndex({ product_id: 1 }, { name: "idx_product_images_product_id" });

  await collections.productSizes.createIndex({ product_id: 1 }, { name: "idx_product_sizes_product_id" });
  await collections.productSizes.createIndex(
    { product_id: 1, size_id: 1 },
    { unique: true, name: "uniq_product_sizes_product_id_size_id" }
  );

  await collections.productStyles.createIndex({ product_id: 1 }, { name: "idx_product_styles_product_id" });
  await collections.productStyles.createIndex(
    { product_id: 1, style_id: 1 },
    { unique: true, name: "uniq_product_styles_product_id_style_id" }
  );

  await collections.productColors.createIndex({ product_id: 1 }, { name: "idx_product_colors_product_id" });
  await collections.productColors.createIndex(
    { product_id: 1, color_id: 1 },
    { unique: true, name: "uniq_product_colors_product_id_color_id" }
  );

  await collections.cartItems.createIndex({ user_id: 1 }, { name: "idx_cart_items_user_id" });
  await collections.cartItems.createIndex({ product_id: 1 }, { name: "idx_cart_items_product_id" });
  await collections.cartItems.createIndex(
    { user_id: 1, product_id: 1 },
    { unique: true, name: "uniq_cart_items_user_id_product_id" }
  );

  await collections.refreshTokens.createIndex(
    { user_id: 1, expires_at: 1 },
    { name: "idx_refresh_tokens_user_id_expires_at" }
  );
  await collections.refreshTokens.createIndex(
    { token: 1 },
    { unique: true, name: "uniq_refresh_tokens_token" }
  );
}

async function ensureLookupId(collection, name, cache) {
  if (cache.has(name)) return cache.get(name);

  const existing = await collection.findOne({ name }, { projection: { _id: 1 } });
  if (existing) {
    cache.set(name, existing._id);
    return existing._id;
  }

  const result = await collection.insertOne({ name });
  cache.set(name, result.insertedId);
  return result.insertedId;
}

async function ensureSeedProducts(collections) {
  const count = await collections.products.countDocuments();
  if (count > 0) return;

  const categoriesCache = new Map();
  const sizesCache = new Map();
  const stylesCache = new Map();
  const colorsCache = new Map();

  for (const product of seedProducts) {
    const categoryId = await ensureLookupId(
      collections.categories,
      product.category,
      categoriesCache
    );

    const productInsert = await collections.products.insertOne({
      title: product.title,
      price: product.price,
      previous_price:
        product.previousPrice !== undefined
          ? product.previousPrice
          : Number((product.price * 1.2).toFixed(2)),
      rate: product.rate,
      category_id: categoryId,
    });

    const productId = productInsert.insertedId;

    if (Array.isArray(product.images) && product.images.length > 0) {
      await collections.productImages.insertMany(
        product.images.map((url) => ({ product_id: productId, url }))
      );
    }

    if (Array.isArray(product.sizes) && product.sizes.length > 0) {
      const rows = [];
      for (const sizeName of product.sizes) {
        const sizeId = await ensureLookupId(collections.sizes, sizeName, sizesCache);
        rows.push({ product_id: productId, size_id: sizeId });
      }
      await collections.productSizes.insertMany(rows);
    }

    if (Array.isArray(product.styles) && product.styles.length > 0) {
      const rows = [];
      for (const styleName of product.styles) {
        const styleId = await ensureLookupId(
          collections.styles,
          styleName,
          stylesCache
        );
        rows.push({ product_id: productId, style_id: styleId });
      }
      await collections.productStyles.insertMany(rows);
    }

    if (Array.isArray(product.colors) && product.colors.length > 0) {
      const rows = [];
      for (const colorName of product.colors) {
        const colorId = await ensureLookupId(collections.colors, colorName, colorsCache);
        rows.push({ product_id: productId, color_id: colorId });
      }
      await collections.productColors.insertMany(rows);
    }
  }
}

async function buildRepositories() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB || "shop";

  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(dbName);

  await ensureCollections(db);

  const collections = {
    users: db.collection(COLLECTION_NAMES.users),
    refreshTokens: db.collection(COLLECTION_NAMES.refreshTokens),
    products: db.collection(COLLECTION_NAMES.products),
    categories: db.collection(COLLECTION_NAMES.categories),
    sizes: db.collection(COLLECTION_NAMES.sizes),
    styles: db.collection(COLLECTION_NAMES.styles),
    colors: db.collection(COLLECTION_NAMES.colors),
    productImages: db.collection(COLLECTION_NAMES.productImages),
    productSizes: db.collection(COLLECTION_NAMES.productSizes),
    productStyles: db.collection(COLLECTION_NAMES.productStyles),
    productColors: db.collection(COLLECTION_NAMES.productColors),
    cartItems: db.collection(COLLECTION_NAMES.cartItems),
  };

  await ensureIndexes(collections);
  await ensureSeedProducts(collections);

  

  return {
    productRepository: buildMongoProductRepository(collections),
    userRepository: buildMongoUserRepository(collections),
  };
}

module.exports = {
  buildRepositories,
  COLLECTION_NAMES,
};