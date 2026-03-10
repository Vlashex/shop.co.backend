const { toObjectIdOrNull } = require("../objectId");
const {
  normalizeCartItems,
  toUserDocument,
  toUserDto,
  toUserUpdateDocument,
} = require("../mappers/userMapper");

function buildMongoUserRepository(collections) {
  const { users, products } = collections;

  function getLegacyCartItems(userDoc) {
    if (Array.isArray(userDoc?.cartItems)) {
      return userDoc.cartItems;
    }

    if (Array.isArray(userDoc?.cart)) {
      return userDoc.cart.map((productId) => ({ productId, quantity: 1 }));
    }

    return [];
  }

  function buildLegacyUserPatch(userDoc) {
    const patch = {};

    if (!userDoc) return patch;

    if (
      userDoc.passwordHash === undefined &&
      typeof userDoc.password_hash === "string" &&
      userDoc.password_hash.length > 0
    ) {
      patch.passwordHash = userDoc.password_hash;
    }

    if (!Array.isArray(userDoc.cartItems)) {
      patch.cartItems = normalizeCartItems(getLegacyCartItems(userDoc));
    }

    if (!(userDoc.createdAt instanceof Date)) {
      patch.createdAt = new Date();
    }

    return patch;
  }

  async function findUserById(userId, options = {}) {
    const objectId = toObjectIdOrNull(userId);
    if (!objectId) return null;
    return users.findOne({ _id: objectId }, options);
  }

  async function assertProductExists(productId) {
    const objectId = toObjectIdOrNull(productId);
    if (!objectId) return null;
    const exists = await products.findOne({ _id: objectId }, { projection: { _id: 1 } });
    return exists ? objectId : null;
  }

  async function getAll() {
    const docs = await users.find({}).sort({ _id: 1 }).toArray();
    return docs.map(toUserDto);
  }

  async function getById(id) {
    const doc = await findUserById(id);
    return toUserDto(doc);
  }

  async function getByEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!normalized) return null;
    const doc = await users.findOne({ email: normalized });
    return toUserDto(doc);
  }

  async function create(data, hashedPassword) {
    const now = new Date();
    const doc = toUserDocument(data, hashedPassword, now);
    const result = await users.insertOne(doc);
    const created = await users.findOne({ _id: result.insertedId });
    return toUserDto(created);
  }

  async function update(id, data) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return null;

    const existing = await users.findOne({ _id: objectId });
    if (!existing) return null;

    const updates = toUserUpdateDocument(data);
    const legacyPatch = buildLegacyUserPatch(existing);

    const set = {
      ...(updates.$set || {}),
      ...legacyPatch,
    };

    if (Object.keys(set).length > 0) {
      await users.updateOne({ _id: objectId }, { $set: set });
    }

    const updated = await users.findOne({ _id: objectId });
    return toUserDto(updated);
  }

  async function remove(id) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return false;

    const result = await users.deleteOne({ _id: objectId });
    return result.deletedCount === 1;
  }

  async function getPassword(userId) {
    const doc = await findUserById(userId, {
      projection: { passwordHash: 1, password_hash: 1 },
    });

    if (!doc) return undefined;
    return doc.passwordHash || doc.password_hash;
  }

  async function setPassword(userId, hashedPassword) {
    const objectId = toObjectIdOrNull(userId);
    if (!objectId) return;

    const user = await users.findOne({ _id: objectId });
    if (!user) return;
    const legacyPatch = buildLegacyUserPatch(user);

    await users.updateOne(
      { _id: objectId },
      {
        $set: {
          ...legacyPatch,
          passwordHash: hashedPassword,
          updatedAt: new Date(),
        },
      }
    );
  }

  async function addToCart(userId, productId) {
    const userObjectId = toObjectIdOrNull(userId);
    if (!userObjectId) return null;

    const productObjectId = await assertProductExists(productId);
    if (!productObjectId) return null;

    const user = await users.findOne({ _id: userObjectId });
    if (!user) return null;

    const cartItems = normalizeCartItems(getLegacyCartItems(user));
    const key = productObjectId.toString();
    const existing = cartItems.find((item) => item.productId.toString() === key);

    if (existing) {
      existing.quantity += 1;
    } else {
      cartItems.push({ productId: productObjectId, quantity: 1 });
    }

    const legacyPatch = buildLegacyUserPatch(user);
    await users.updateOne(
      { _id: userObjectId },
      {
        $set: {
          ...legacyPatch,
          cartItems,
          updatedAt: new Date(),
        },
      }
    );

    return getById(userId);
  }

  async function addManyToCart(userId, productIds) {
    const userObjectId = toObjectIdOrNull(userId);
    if (!userObjectId) return null;

    const user = await users.findOne({ _id: userObjectId });
    if (!user) return null;

    const productObjectIds = [];
    const sourceIds = Array.isArray(productIds) ? productIds : [];

    for (const productId of sourceIds) {
      const objectId = await assertProductExists(productId);
      if (objectId) productObjectIds.push(objectId);
    }

    const cartItems = normalizeCartItems(getLegacyCartItems(user));

    for (const productObjectId of productObjectIds) {
      const key = productObjectId.toString();
      const existing = cartItems.find((item) => item.productId.toString() === key);
      if (existing) {
        existing.quantity += 1;
      } else {
        cartItems.push({ productId: productObjectId, quantity: 1 });
      }
    }

    const legacyPatch = buildLegacyUserPatch(user);
    await users.updateOne(
      { _id: userObjectId },
      {
        $set: {
          ...legacyPatch,
          cartItems,
          updatedAt: new Date(),
        },
      }
    );

    return getById(userId);
  }

  async function removeFromCart(userId, productId) {
    const userObjectId = toObjectIdOrNull(userId);
    const productObjectId = toObjectIdOrNull(productId);
    if (!userObjectId || !productObjectId) return null;

    const user = await users.findOne({ _id: userObjectId });
    if (!user) return null;

    const key = productObjectId.toString();
    const cartItems = normalizeCartItems(getLegacyCartItems(user)).filter(
      (item) => item.productId.toString() !== key
    );

    const legacyPatch = buildLegacyUserPatch(user);
    await users.updateOne(
      { _id: userObjectId },
      {
        $set: {
          ...legacyPatch,
          cartItems,
          updatedAt: new Date(),
        },
      }
    );

    return getById(userId);
  }

  async function clearCart(userId) {
    const userObjectId = toObjectIdOrNull(userId);
    if (!userObjectId) return null;

    const user = await users.findOne({ _id: userObjectId });
    if (!user) return null;

    const legacyPatch = buildLegacyUserPatch(user);
    await users.updateOne(
      { _id: userObjectId },
      {
        $set: {
          ...legacyPatch,
          cartItems: [],
          updatedAt: new Date(),
        },
      }
    );

    return getById(userId);
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
  buildMongoUserRepository,
};
