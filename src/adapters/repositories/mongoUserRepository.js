const { createUser } = require("../../domain/entities");

function buildMongoUserRepository(collection, nextId) {
  const baseProjection = { _id: 0, passwordHash: 0 };

  async function getAll() {
    return collection.find({}, { projection: baseProjection }).toArray();
  }

  async function getById(id) {
    return collection.findOne({ id }, { projection: baseProjection });
  }

  async function getByEmail(email) {
    return collection.findOne({ email }, { projection: baseProjection });
  }

  async function create(data, hashedPassword) {
    const id = await nextId("users");
    const user = createUser({ id, email: data.email, name: data.name });
    await collection.insertOne({ ...user, passwordHash: hashedPassword });
    return user;
  }

  async function update(id, data) {
    const result = await collection.findOneAndUpdate(
      { id },
      { $set: data },
      { returnDocument: "after", projection: baseProjection }
    );

    return result.value || null;
  }

  async function remove(id) {
    const result = await collection.deleteOne({ id });
    return result.deletedCount === 1;
  }

  async function getPassword(userId) {
    const doc = await collection.findOne(
      { id: userId },
      { projection: { passwordHash: 1 } }
    );
    return doc ? doc.passwordHash : undefined;
  }

  async function setPassword(userId, hashedPassword) {
    await collection.updateOne(
      { id: userId },
      { $set: { passwordHash: hashedPassword } }
    );
  }

  async function addToCart(userId, productId) {
    const result = await collection.findOneAndUpdate(
      { id: userId },
      { $addToSet: { cart: productId } },
      { returnDocument: "after", projection: baseProjection }
    );
    return result.value || null;
  }

  async function addManyToCart(userId, productIds) {
    const result = await collection.findOneAndUpdate(
      { id: userId },
      { $addToSet: { cart: { $each: productIds } } },
      { returnDocument: "after", projection: baseProjection }
    );
    return result.value || null;
  }

  async function removeFromCart(userId, productId) {
    const result = await collection.findOneAndUpdate(
      { id: userId },
      { $pull: { cart: productId } },
      { returnDocument: "after", projection: baseProjection }
    );
    return result.value || null;
  }

  async function clearCart(userId) {
    const result = await collection.findOneAndUpdate(
      { id: userId },
      { $set: { cart: [] } },
      { returnDocument: "after", projection: baseProjection }
    );
    return result.value || null;
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
