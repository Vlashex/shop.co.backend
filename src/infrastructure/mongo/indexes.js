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

module.exports = {
  ensureIndexes,
};