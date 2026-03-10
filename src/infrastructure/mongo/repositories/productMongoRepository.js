const { toObjectIdOrNull } = require("../objectId");
const {
  toProductDocument,
  toProductUpdateDocument,
  toProductDto,
} = require("../mappers/productMapper");

function buildMongoProductRepository(collections) {
  const { products } = collections;

  function isLegacyProductDoc(doc) {
    if (!doc) return false;

    return (
      !doc.pricing ||
      !doc.attributes ||
      typeof doc.category !== "string" ||
      doc.category.trim().length === 0
    );
  }

  function toLegacyCompatiblePayload(doc = {}, overrides = {}) {
    return {
      title: overrides.title ?? doc.title,
      price:
        overrides.price !== undefined
          ? overrides.price
          : doc.pricing?.current !== undefined
            ? doc.pricing.current
            : doc.price,
      previousPrice:
        overrides.previousPrice !== undefined
          ? overrides.previousPrice
          : doc.pricing?.previous !== undefined
            ? doc.pricing.previous
            : doc.previous_price !== undefined
              ? doc.previous_price
              : doc.previousPrice,
      rate:
        overrides.rate !== undefined
          ? overrides.rate
          : doc.rating !== undefined
            ? doc.rating
            : doc.rate,
      category:
        overrides.category !== undefined
          ? overrides.category
          : typeof doc.category === "string" && doc.category.trim().length > 0
            ? doc.category
            : "uncategorized",
      images: overrides.images ?? doc.images,
      sizes: overrides.sizes ?? doc.attributes?.sizes ?? doc.sizes,
      styles: overrides.styles ?? doc.attributes?.styles ?? doc.styles,
      colors: overrides.colors ?? doc.attributes?.colors ?? doc.colors,
    };
  }

  async function getAll(start = 0, limit = 10) {
    const docs = await products
      .find({})
      .sort({ _id: 1 })
      .skip(Math.max(0, Number(start) || 0))
      .limit(Math.max(1, Number(limit) || 10))
      .toArray();

    return docs.map(toProductDto);
  }

  async function getById(id) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return null;

    const doc = await products.findOne({ _id: objectId });
    return toProductDto(doc);
  }

  async function getByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const objectIds = ids.map(toObjectIdOrNull).filter(Boolean);
    if (objectIds.length === 0) return [];

    const docs = await products.find({ _id: { $in: objectIds } }).toArray();
    const byId = new Map(docs.map((doc) => [doc._id.toString(), toProductDto(doc)]));

    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  async function create(data) {
    const doc = toProductDocument(data);
    if (!doc.title) {
      throw new Error("title is required");
    }
    if (!doc.category) {
      throw new Error("category is required");
    }

    const result = await products.insertOne(doc);
    const created = await products.findOne({ _id: result.insertedId });
    return toProductDto(created);
  }

  async function update(id, data) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return null;

    const existing = await products.findOne({ _id: objectId });
    if (!existing) return null;

    if (isLegacyProductDoc(existing)) {
      const normalizedPayload = toLegacyCompatiblePayload(existing, data);
      const createdAt = existing.createdAt instanceof Date ? existing.createdAt : new Date();
      const normalizedDoc = toProductDocument(normalizedPayload, createdAt);
      normalizedDoc.updatedAt = new Date();

      await products.updateOne(
        { _id: objectId },
        {
          $set: normalizedDoc,
          $unset: {
            price: "",
            previous_price: "",
            previousPrice: "",
            rate: "",
            category_id: "",
            sizes: "",
            styles: "",
            colors: "",
          },
        }
      );
    } else {
      const updateDoc = toProductUpdateDocument(data, existing);
      if (Object.keys(updateDoc).length > 0) {
        await products.updateOne({ _id: objectId }, updateDoc);
      }
    }

    const updated = await products.findOne({ _id: objectId });
    return toProductDto(updated);
  }

  async function remove(id) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return false;

    const result = await products.deleteOne({ _id: objectId });
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
