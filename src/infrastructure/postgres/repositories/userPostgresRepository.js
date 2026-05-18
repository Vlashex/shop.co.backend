const { makeEntityId, normalizeEntityId } = require("../ids");
const {
  DEFAULT_VARIANT_ID,
  normalizeCartItems,
  toUserDto,
} = require("../mappers/userMapper");

function buildPostgresUserRepository(pool) {
  async function findRowById(id) {
    const normalizedId = normalizeEntityId(id);
    if (!normalizedId) return null;
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [normalizedId]);
    return result.rows[0] || null;
  }

  async function resolveProductForCart(productId) {
    const normalizedId = normalizeEntityId(productId);
    if (!normalizedId) return null;

    const result = await pool.query("SELECT id, variants FROM products WHERE id = $1", [
      normalizedId,
    ]);
    const product = result.rows[0];
    if (!product) return null;

    const firstVariant = Array.isArray(product.variants)
      ? product.variants.find((variant) => typeof variant?.id === "string" && variant.id.trim())
      : null;

    return {
      productId: String(product.id).trim(),
      variantId: firstVariant?.id || DEFAULT_VARIANT_ID,
    };
  }

  async function persistCartItems(userId, cartItems) {
    const result = await pool.query(
      `
        UPDATE users
        SET cart_items = $2::jsonb,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [userId, JSON.stringify(normalizeCartItems(cartItems))]
    );
    return toUserDto(result.rows[0]);
  }

  async function getAll() {
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
    return result.rows.map(toUserDto);
  }

  async function getById(id) {
    return toUserDto(await findRowById(id));
  }

  async function getByEmail(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!normalizedEmail) return null;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [normalizedEmail]);
    return toUserDto(result.rows[0]);
  }

  async function create(data, hashedPassword) {
    const id = makeEntityId();
    const result = await pool.query(
      `
        INSERT INTO users (id, email, name, password_hash, cart_items)
        VALUES ($1, $2, $3, $4, '[]'::jsonb)
        RETURNING *
      `,
      [
        id,
        String(data.email || "").trim().toLowerCase(),
        String(data.name || "").trim(),
        String(hashedPassword || ""),
      ]
    );
    return toUserDto(result.rows[0]);
  }

  async function update(id, data) {
    const normalizedId = normalizeEntityId(id);
    if (!normalizedId) return null;

    const existing = await findRowById(normalizedId);
    if (!existing) return null;

    const email = data.email !== undefined ? String(data.email).trim().toLowerCase() : existing.email;
    const name = data.name !== undefined ? String(data.name).trim() : existing.name;

    const result = await pool.query(
      `
        UPDATE users
        SET email = $2,
            name = $3,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [normalizedId, email, name]
    );
    return toUserDto(result.rows[0]);
  }

  async function remove(id) {
    const normalizedId = normalizeEntityId(id);
    if (!normalizedId) return false;
    const result = await pool.query("DELETE FROM users WHERE id = $1", [normalizedId]);
    return result.rowCount === 1;
  }

  async function getPassword(userId) {
    const normalizedId = normalizeEntityId(userId);
    if (!normalizedId) return undefined;
    const result = await pool.query("SELECT password_hash FROM users WHERE id = $1", [normalizedId]);
    return result.rows[0]?.password_hash;
  }

  async function setPassword(userId, hashedPassword) {
    const normalizedId = normalizeEntityId(userId);
    if (!normalizedId) return;
    await pool.query(
      "UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1",
      [normalizedId, String(hashedPassword || "")]
    );
  }

  async function addToCart(userId, productId) {
    const normalizedUserId = normalizeEntityId(userId);
    if (!normalizedUserId) return null;

    const [user, productData] = await Promise.all([
      findRowById(normalizedUserId),
      resolveProductForCart(productId),
    ]);
    if (!user || !productData) return null;

    const cartItems = normalizeCartItems(user.cart_items);
    const existing = cartItems.find(
      (item) => item.productId === productData.productId && item.variantId === productData.variantId
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      cartItems.push({ productId: productData.productId, variantId: productData.variantId, quantity: 1 });
    }

    return persistCartItems(normalizedUserId, cartItems);
  }

  async function addManyToCart(userId, productIds) {
    const normalizedUserId = normalizeEntityId(userId);
    if (!normalizedUserId) return null;

    const user = await findRowById(normalizedUserId);
    if (!user) return null;

    const cartItems = normalizeCartItems(user.cart_items);
    const sourceIds = Array.isArray(productIds) ? productIds : [];

    for (const productId of sourceIds) {
      const productData = await resolveProductForCart(productId);
      if (!productData) continue;

      const existing = cartItems.find(
        (item) => item.productId === productData.productId && item.variantId === productData.variantId
      );
      if (existing) existing.quantity += 1;
      else cartItems.push({ productId: productData.productId, variantId: productData.variantId, quantity: 1 });
    }

    return persistCartItems(normalizedUserId, cartItems);
  }

  async function removeFromCart(userId, productId) {
    const normalizedUserId = normalizeEntityId(userId);
    const normalizedProductId = normalizeEntityId(productId);
    if (!normalizedUserId || !normalizedProductId) return null;

    const user = await findRowById(normalizedUserId);
    if (!user) return null;

    const cartItems = normalizeCartItems(user.cart_items).filter(
      (item) => item.productId !== normalizedProductId
    );
    return persistCartItems(normalizedUserId, cartItems);
  }

  async function clearCart(userId) {
    const normalizedUserId = normalizeEntityId(userId);
    if (!normalizedUserId) return null;

    const user = await findRowById(normalizedUserId);
    if (!user) return null;

    return persistCartItems(normalizedUserId, []);
  }

  return {
    getAll,
    getById,
    getByEmail,
    create,
    update,
    remove,
    getPassword,
    setPassword,
    addToCart,
    addManyToCart,
    removeFromCart,
    clearCart,
  };
}

module.exports = {
  buildPostgresUserRepository,
};
