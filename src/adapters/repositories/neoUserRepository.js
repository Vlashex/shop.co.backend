function mapUser(record) {
  if (!record) return null;
  const node = record.get("u");
  if (!node) return null;
  return {
    id: Number(node.properties.id),
    email: node.properties.email,
    name: node.properties.name,
    cart: node.properties.cart || [],
  };
}

function buildNeoUserRepository(driver, nextId) {
  async function getAll() {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (u:User) RETURN u ORDER BY u.id"
      );
      return result.records.map(mapUser);
    } finally {
      await session.close();
    }
  }

  async function getById(id) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (u:User {id: $id}) RETURN u LIMIT 1",
        { id: Number(id) }
      );
      return mapUser(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async function getByEmail(email) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (u:User {email: $email}) RETURN u LIMIT 1",
        { email }
      );
      return mapUser(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async function create(data, hashedPassword) {
    const id = await nextId("users");
    const user = {
      id,
      email: data.email,
      name: data.name,
      cart: [],
    };

    const session = driver.session();
    try {
      await session.run(
        `CREATE (u:User {
          id: $id,
          email: $email,
          name: $name,
          cart: $cart,
          passwordHash: $passwordHash
        })`,
        { ...user, passwordHash: hashedPassword }
      );
      return user;
    } finally {
      await session.close();
    }
  }

  async function update(id, data) {
    const session = driver.session();
    try {
      const result = await session.run(
        `MATCH (u:User {id: $id})
         SET u += $updates
         RETURN u`,
        { id: Number(id), updates: data || {} }
      );
      return mapUser(result.records[0]);
    } finally {
      await session.close();
    }
  }

  async function remove(id) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (u:User {id: $id}) DETACH DELETE u RETURN COUNT(u) as removed",
        { id: Number(id) }
      );
      const removed = result.records[0]?.get("removed");
      return Number(removed) > 0;
    } finally {
      await session.close();
    }
  }

  async function getPassword(userId) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (u:User {id: $id}) RETURN u.passwordHash as passwordHash LIMIT 1",
        { id: Number(userId) }
      );
      return result.records[0]?.get("passwordHash");
    } finally {
      await session.close();
    }
  }

  async function setPassword(userId, hashedPassword) {
    const session = driver.session();
    try {
      await session.run(
        "MATCH (u:User {id: $id}) SET u.passwordHash = $passwordHash",
        { id: Number(userId), passwordHash: hashedPassword }
      );
    } finally {
      await session.close();
    }
  }

  async function addToCart(userId, productId) {
    const user = await getById(userId);
    if (!user) return null;
    if (!user.cart.includes(productId)) user.cart.push(productId);
    return update(userId, { cart: user.cart });
  }

  async function addManyToCart(userId, productIds) {
    const user = await getById(userId);
    if (!user) return null;
    for (const id of productIds) {
      if (!user.cart.includes(id)) user.cart.push(id);
    }
    return update(userId, { cart: user.cart });
  }

  async function removeFromCart(userId, productId) {
    const user = await getById(userId);
    if (!user) return null;
    user.cart = user.cart.filter((id) => id !== productId);
    return update(userId, { cart: user.cart });
  }

  async function clearCart(userId) {
    const user = await getById(userId);
    if (!user) return null;
    return update(userId, { cart: [] });
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
  buildNeoUserRepository,
};
