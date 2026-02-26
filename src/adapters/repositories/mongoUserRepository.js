const { ObjectId } = require("mongodb");

function toObjectIdOrNull(value) {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    return null;
  }
  return new ObjectId(value);
}

function mapUserDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    cart: Array.isArray(row.cart) ? row.cart : [],
  };
}

function buildUserWithCartPipeline(match = {}) {
  const pipeline = [];

  if (Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }

  pipeline.push(
    {
      $lookup: {
        from: "cart_items",
        localField: "_id",
        foreignField: "user_id",
        as: "cart_items",
      },
    },
    { $unwind: { path: "$cart_items", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$_id",
        email: { $first: "$email" },
        name: { $first: "$name" },
        cart: { $addToSet: "$cart_items.product_id" },
      },
    },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        email: 1,
        name: 1,
        cart: {
          $filter: {
            input: {
              $map: {
                input: "$cart",
                as: "productId",
                in: {
                  $cond: [
                    { $eq: ["$$productId", null] },
                    null,
                    { $toString: "$$productId" },
                  ],
                },
              },
            },
            as: "productId",
            cond: { $ne: ["$$productId", null] },
          },
        },
      },
    }
  );

  return pipeline;
}

function buildMongoUserRepository(collections) {
  const { users, cartItems } = collections;

  async function getAll() {
    const rows = await users.aggregate(buildUserWithCartPipeline()).toArray();
    return rows.map(mapUserDto);
  }

  async function getById(id) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return null;

    const rows = await users
      .aggregate(buildUserWithCartPipeline({ _id: objectId }))
      .toArray();

    return mapUserDto(rows[0] || null);
  }

  async function getByEmail(email) {
    const rows = await users
      .aggregate(buildUserWithCartPipeline({ email }))
      .toArray();

    return mapUserDto(rows[0] || null);
  }

  async function create(data, hashedPassword) {
    const result = await users.insertOne({
      email: data.email,
      name: data.name,
      password_hash: hashedPassword,
    });

    return {
      id: result.insertedId.toString(),
      email: data.email,
      name: data.name,
      cart: [],
    };
  }

  async function update(id, data) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return null;

    const updates = {};
    if (data.email !== undefined) updates.email = data.email;
    if (data.name !== undefined) updates.name = data.name;

    if (Object.keys(updates).length > 0) {
      await users.updateOne({ _id: objectId }, { $set: updates });
    }

    return getById(id);
  }

  async function remove(id) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return false;

    const [userResult] = await Promise.all([
      users.deleteOne({ _id: objectId }),
      cartItems.deleteMany({ user_id: objectId }),
    ]);

    return userResult.deletedCount === 1;
  }

  async function getPassword(userId) {
    const objectId = toObjectIdOrNull(userId);
    if (!objectId) return undefined;

    const doc = await users.findOne(
      { _id: objectId },
      { projection: { password_hash: 1 } }
    );

    return doc ? doc.password_hash : undefined;
  }

  async function setPassword(userId, hashedPassword) {
    const objectId = toObjectIdOrNull(userId);
    if (!objectId) return;

    await users.updateOne(
      { _id: objectId },
      { $set: { password_hash: hashedPassword } }
    );
  }

  async function addToCart(userId, productId) {
    const userObjectId = toObjectIdOrNull(userId);
    const productObjectId = toObjectIdOrNull(productId);

    if (!userObjectId || !productObjectId) return null;

    const userExists = await users.findOne(
      { _id: userObjectId },
      { projection: { _id: 1 } }
    );
    if (!userExists) return null;

    await cartItems.updateOne(
      { user_id: userObjectId, product_id: productObjectId },
      { $inc: { quantity: 1 } },
      { upsert: true }
    );

    return getById(userId);
  }

  async function addManyToCart(userId, productIds) {
    const userObjectId = toObjectIdOrNull(userId);
    if (!userObjectId) return null;

    const userExists = await users.findOne(
      { _id: userObjectId },
      { projection: { _id: 1 } }
    );
    if (!userExists) return null;

    const productObjectIds = (Array.isArray(productIds) ? productIds : [])
      .map((id) => toObjectIdOrNull(id))
      .filter((id) => id !== null);

    if (productObjectIds.length > 0) {
      await cartItems.bulkWrite(
        productObjectIds.map((productObjectId) => ({
          updateOne: {
            filter: { user_id: userObjectId, product_id: productObjectId },
            update: { $inc: { quantity: 1 } },
            upsert: true,
          },
        }))
      );
    }

    return getById(userId);
  }

  async function removeFromCart(userId, productId) {
    const userObjectId = toObjectIdOrNull(userId);
    const productObjectId = toObjectIdOrNull(productId);

    if (!userObjectId || !productObjectId) return null;

    const userExists = await users.findOne(
      { _id: userObjectId },
      { projection: { _id: 1 } }
    );
    if (!userExists) return null;

    await cartItems.deleteOne({
      user_id: userObjectId,
      product_id: productObjectId,
    });

    return getById(userId);
  }

  async function clearCart(userId) {
    const userObjectId = toObjectIdOrNull(userId);
    if (!userObjectId) return null;

    const userExists = await users.findOne(
      { _id: userObjectId },
      { projection: { _id: 1 } }
    );
    if (!userExists) return null;

    await cartItems.deleteMany({ user_id: userObjectId });
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
    buildUserWithCartPipeline,
  };
}

module.exports = {
  buildMongoUserRepository,
};