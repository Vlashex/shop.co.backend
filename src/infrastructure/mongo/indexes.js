async function ensureIndexes(collections) {
  await collections.users.createIndex(
    { email: 1 },
    { unique: true, name: "uniq_users_email" }
  );

  await collections.users.createIndex(
    { "cartItems.productId": 1 },
    { name: "idx_users_cart_items_product_id" }
  );

  await collections.products.createIndex(
    { category: 1, _id: 1 },
    { name: "idx_products_category" }
  );

  await collections.products.createIndex(
    { "variants.id": 1 },
    { name: "idx_products_variants_id" }
  );

  await collections.orders.createIndex(
    { userId: 1, createdAt: -1 },
    { name: "idx_orders_user_id_created_at" }
  );

  await collections.orders.createIndex(
    { createdAt: -1 },
    { name: "idx_orders_created_at" }
  );

  await collections.refreshTokens.createIndex(
    { jti: 1 },
    { unique: true, name: "uniq_refresh_tokens_jti" }
  );

  await collections.refreshTokens.createIndex(
    { userId: 1, expiresAt: 1 },
    { name: "idx_refresh_tokens_userid_expiresat" }
  );

  await collections.refreshTokens.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "ttl_refresh_tokens_expires_at" }
  );
}

module.exports = {
  ensureIndexes,
};
