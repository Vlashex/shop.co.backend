const { createProduct } = require("../../domain/entities");

function buildMongoProductRepository(collection, nextId) {
  async function getAll(start = 0, limit = 10) {
    return collection
      .find({})
      .skip(start)
      .limit(limit)
      .toArray();
  }

  async function getById(id) {
    return collection.findOne({ id });
  }

  async function getByIds(ids) {
    return collection.find({ id: { $in: ids } }).toArray();
  }

  async function create(data) {
    const id = await nextId("products");
    const product = createProduct({
      id,
      title: data.title,
      price: data.price,
      rate: data.rate,
      images: data.images,
      category: data.category,
      sizes: data.sizes,
      styles: data.styles,
      colors: data.colors,
    });

    await collection.insertOne(product);
    return product;
  }

  async function update(id, data) {
    const updates = { ...data };
    if (updates.price !== undefined) {
      updates.previousPrice = updates.price * 1.2;
    }

    const result = await collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: "after" }
    );

    return result.value || null;
  }

  async function remove(id) {
    const result = await collection.deleteOne({ id });
    return result.deletedCount === 1;
  }

  return {
    getAll,
    getById,
    getByIds,
    create,
    update,
    remove,
  };
}

module.exports = {
  buildMongoProductRepository,
};
