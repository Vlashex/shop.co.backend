function parseUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    cart: JSON.parse(row.cart || "[]"),
  };
}

function buildMariaUserRepository(pool) {
  async function getAll() {
    const rows = await pool.query(
      "SELECT id, email, name, cart FROM users ORDER BY id"
    );
    return rows.map(parseUser);
  }

  async function getById(id) {
    const rows = await pool.query(
      "SELECT id, email, name, cart FROM users WHERE id = ?",
      [id]
    );
    return parseUser(rows[0]);
  }

  async function getByEmail(email) {
    const rows = await pool.query(
      "SELECT id, email, name, cart FROM users WHERE email = ?",
      [email]
    );
    return parseUser(rows[0]);
  }

  async function create(data, hashedPassword) {
    const cart = [];
    const result = await pool.query(
      "INSERT INTO users (email, name, cart, passwordHash) VALUES (?, ?, ?, ?)",
      [data.email, data.name, JSON.stringify(cart), hashedPassword]
    );

    return {
      id: Number(result.insertId),
      email: data.email,
      name: data.name,
      cart,
    };
  }

  async function update(id, data) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data || {})) {
      if (value === undefined) continue;
      if (key === "cart") {
        fields.push("cart = ?");
        values.push(JSON.stringify(value || []));
        continue;
      }
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (!fields.length) {
      return getById(id);
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
    return getById(id);
  }

  async function remove(id) {
    const result = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    return result.affectedRows === 1;
  }

  async function getPassword(userId) {
    const rows = await pool.query(
      "SELECT passwordHash FROM users WHERE id = ?",
      [userId]
    );
    return rows[0]?.passwordHash;
  }

  async function setPassword(userId, hashedPassword) {
    await pool.query("UPDATE users SET passwordHash = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);
  }

  async function addToCart(userId, productId) {
    const user = await getById(userId);
    if (!user) return null;
    if (!user.cart.includes(productId)) user.cart.push(productId);
    await pool.query("UPDATE users SET cart = ? WHERE id = ?", [
      JSON.stringify(user.cart),
      userId,
    ]);
    return user;
  }

  async function addManyToCart(userId, productIds) {
    const user = await getById(userId);
    if (!user) return null;
    for (const id of productIds) {
      if (!user.cart.includes(id)) user.cart.push(id);
    }
    await pool.query("UPDATE users SET cart = ? WHERE id = ?", [
      JSON.stringify(user.cart),
      userId,
    ]);
    return user;
  }

  async function removeFromCart(userId, productId) {
    const user = await getById(userId);
    if (!user) return null;
    user.cart = user.cart.filter((id) => id !== productId);
    await pool.query("UPDATE users SET cart = ? WHERE id = ?", [
      JSON.stringify(user.cart),
      userId,
    ]);
    return user;
  }

  async function clearCart(userId) {
    const user = await getById(userId);
    if (!user) return null;
    user.cart = [];
    await pool.query("UPDATE users SET cart = ? WHERE id = ?", [
      JSON.stringify(user.cart),
      userId,
    ]);
    return user;
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
  buildMariaUserRepository,
};
