const COLLECTION_NAMES = {
  users: "users",
  products: "products",
  orders: "orders",
  refreshTokens: "refresh_tokens",
};

const NUMBER_TYPES = ["double", "int", "long", "decimal"];

const COLLECTION_VALIDATORS = {
  [COLLECTION_NAMES.users]: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "passwordHash", "cartItems", "createdAt", "updatedAt"],
      properties: {
        email: {
          bsonType: "string",
          minLength: 5,
          pattern: "^.+@.+\\..+$",
        },

        name: { bsonType: "string", minLength: 1 },

        passwordHash: { bsonType: "string", minLength: 20 },

        cartItems: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["productId", "variantId", "quantity"],
            properties: {
              productId: { bsonType: "objectId" },

              variantId: { bsonType: "string", minLength: 1 },

              quantity: {
                bsonType: ["int", "long"],
                minimum: 1,
              },
            },
            additionalProperties: false,
          },
        },

        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },

      additionalProperties: false,
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
        "createdAt",
        "updatedAt",
      ],

      properties: {
        title: { bsonType: "string", minLength: 1 },

        pricing: {
          bsonType: "object",
          required: ["current"],
          properties: {
            current: {
              bsonType: NUMBER_TYPES,
              minimum: 0,
            },

            previous: {
              bsonType: NUMBER_TYPES,
              minimum: 0,
            },
          },
          additionalProperties: false,
        },

        rating: {
          bsonType: NUMBER_TYPES,
          minimum: 0,
          maximum: 5,
        },

        category: { bsonType: "string", minLength: 1 },

        images: {
          bsonType: "array",
          minItems: 1,
          items: { bsonType: "string" },
        },

        attributes: {
          bsonType: "object",
          required: ["sizes", "styles", "colors"],
          properties: {
            sizes: {
              bsonType: "array",
              items: { bsonType: "string" },
            },

            styles: {
              bsonType: "array",
              items: { bsonType: "string" },
            },

            colors: {
              bsonType: "array",
              items: { bsonType: "string" },
            },
          },
          additionalProperties: false,
        },

        variants: {
          bsonType: "array",
          minItems: 1,

          items: {
            bsonType: "object",

            required: ["id", "price", "stock"],

            properties: {
              id: { bsonType: "string", minLength: 1 },

              size: { bsonType: "string" },
              style: { bsonType: "string" },
              color: { bsonType: "string" },

              price: {
                bsonType: NUMBER_TYPES,
                minimum: 0,
              },

              stock: {
                bsonType: ["int", "long"],
                minimum: 0,
              },
            },

            additionalProperties: false,
          },
        },

        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },

      additionalProperties: false,
    },
  },

  [COLLECTION_NAMES.orders]: {
    $jsonSchema: {
      bsonType: "object",

      required: ["userId", "status", "items", "totalPrice", "createdAt", "updatedAt"],

      properties: {
        userId: { bsonType: "objectId" },

        status: {
          enum: ["created", "paid", "shipped", "delivered", "cancelled"],
        },

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
              productId: { bsonType: "objectId" },

              variantId: { bsonType: "string", minLength: 1 },

              productTitle: { bsonType: "string", minLength: 1 },

              quantity: {
                bsonType: ["int", "long"],
                minimum: 1,
              },

              unitPrice: {
                bsonType: NUMBER_TYPES,
                minimum: 0,
              },

              lineTotal: {
                bsonType: NUMBER_TYPES,
                minimum: 0,
              },

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

        totalPrice: {
          bsonType: NUMBER_TYPES,
          minimum: 0,
        },

        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
      },

      additionalProperties: false,
    },
  },

  [COLLECTION_NAMES.refreshTokens]: {
    $jsonSchema: {
      bsonType: "object",

      required: [
        "jti",
        "userId",
        "familyId",
        "tokenHash",
        "expiresAt",
        "createdAt",
        "updatedAt",
      ],

      properties: {
        jti: { bsonType: "string", minLength: 10 },

        userId: { bsonType: "objectId" },

        familyId: { bsonType: "string", minLength: 10 },

        tokenHash: { bsonType: "string", minLength: 20 },

        rotatedTo: { bsonType: ["string", "null"] },

        revokedAt: { bsonType: ["date", "null"] },

        keyVersion: {
          enum: ["v1"],
        },

        ip: { bsonType: ["string", "null"] },

        userAgent: { bsonType: ["string", "null"] },

        reason: { bsonType: ["string", "null"] },

        createdAt: { bsonType: "date" },

        expiresAt: { bsonType: "date" },

        updatedAt: { bsonType: "date" },
      },

      additionalProperties: false,
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
