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

function buildCollections(db) {
  return {
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
}

module.exports = {
  COLLECTION_NAMES,
  COLLECTION_VALIDATORS,
  buildCollections,
};