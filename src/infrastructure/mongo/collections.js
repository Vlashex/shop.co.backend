const COLLECTION_NAMES = {
  users: "users",
  products: "products",
  refreshTokens: "refresh_tokens",
};

const COLLECTION_VALIDATORS = {
  [COLLECTION_NAMES.users]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "passwordHash", "cartItems"],
      properties: {
        email: { bsonType: "string", minLength: 3 },
        name: { bsonType: "string", minLength: 1 },
        passwordHash: { bsonType: "string", minLength: 20 },
        cartItems: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["productId", "quantity"],
            properties: {
              productId: { bsonType: "objectId" },
              quantity: { bsonType: ["int", "long", "double"], minimum: 1 },
            },
            additionalProperties: false,
          },
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.products]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "pricing", "rating", "category", "images", "attributes"],
      properties: {
        title: { bsonType: "string", minLength: 1 },
        pricing: {
          bsonType: "object",
          required: ["current", "previous"],
          properties: {
            current: { bsonType: ["double", "int", "long", "decimal"] },
            previous: { bsonType: ["double", "int", "long", "decimal"] },
          },
          additionalProperties: false,
        },
        rating: { bsonType: ["double", "int", "long", "decimal"] },
        category: { bsonType: "string", minLength: 1 },
        images: {
          bsonType: "array",
          items: { bsonType: "string" },
        },
        attributes: {
          bsonType: "object",
          required: ["sizes", "styles", "colors"],
          properties: {
            sizes: { bsonType: "array", items: { bsonType: "string" } },
            styles: { bsonType: "array", items: { bsonType: "string" } },
            colors: { bsonType: "array", items: { bsonType: "string" } },
          },
          additionalProperties: false,
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },
      additionalProperties: true,
    },
  },
  [COLLECTION_NAMES.refreshTokens]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["jti", "userId", "familyId", "tokenHash", "expiresAt"],
      properties: {
        jti: { bsonType: "string", minLength: 10 },
        userId: { bsonType: "string", minLength: 1 },
        familyId: { bsonType: "string", minLength: 1 },
        tokenHash: { bsonType: "string", minLength: 20 },
        rotatedTo: { bsonType: ["string", "null"] },
        revokedAt: { bsonType: ["string", "null"] },
        keyVersion: { bsonType: "string" },
        ip: { bsonType: ["string", "null"] },
        userAgent: { bsonType: ["string", "null"] },
        reason: { bsonType: ["string", "null"] },
        createdAt: { bsonType: "date" },
        expiresAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },
      additionalProperties: true,
    },
  },
};

function buildCollections(db) {
  return {
    users: db.collection(COLLECTION_NAMES.users),
    products: db.collection(COLLECTION_NAMES.products),
    refreshTokens: db.collection(COLLECTION_NAMES.refreshTokens),
  };
}

module.exports = {
  COLLECTION_NAMES,
  COLLECTION_VALIDATORS,
  buildCollections,
};
