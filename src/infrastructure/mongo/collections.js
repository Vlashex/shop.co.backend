const COLLECTION_NAMES = {
  users: "users",
  products: "products",
  orders: "orders",
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
      required: [
        "title",
        "pricing",
        "rating",
        "category",
        "images",
        "attributes",
        "variants",
      ],
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
        variants: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: ["id", "stock", "price"],
            properties: {
              id: { bsonType: "string", minLength: 1 },
              size: { bsonType: "string" },
              style: { bsonType: "string" },
              color: { bsonType: "string" },
              price: { bsonType: ["double", "int", "long", "decimal"] },
              stock: { bsonType: ["int", "long"], minimum: 0 },
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
  [COLLECTION_NAMES.orders]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "status", "items", "totalPrice", "createdAt", "updatedAt"],
      properties: {
        userId: { bsonType: "string", minLength: 1 },
        status: { bsonType: "string", minLength: 1 },
        items: {
          bsonType: "array",
          minItems: 1,
          items: {
            bsonType: "object",
            required: [
              "productId",
              "variantId",
              "productTitle",
              "quantity",
              "unitPrice",
              "lineTotal",
            ],
            properties: {
              productId: { bsonType: "string", minLength: 1 },
              variantId: { bsonType: "string", minLength: 1 },
              productTitle: { bsonType: "string", minLength: 1 },
              quantity: { bsonType: ["int", "long"], minimum: 1 },
              unitPrice: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
              lineTotal: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
              variant: {
                bsonType: "object",
                required: ["size", "style", "color"],
                properties: {
                  size: { bsonType: "string" },
                  style: { bsonType: "string" },
                  color: { bsonType: "string" },
                },
                additionalProperties: false,
              },
            },
            additionalProperties: false,
          },
        },
        totalPrice: { bsonType: ["double", "int", "long", "decimal"], minimum: 0 },
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
    orders: db.collection(COLLECTION_NAMES.orders),
    refreshTokens: db.collection(COLLECTION_NAMES.refreshTokens),
  };
}

module.exports = {
  COLLECTION_NAMES,
  COLLECTION_VALIDATORS,
  buildCollections,
};
