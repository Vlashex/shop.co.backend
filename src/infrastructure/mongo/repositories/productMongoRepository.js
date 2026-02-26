const { buildCardPipeline } = require("../../../domain/product/buildCardPipeline");
const { mapCardDto } = require("../../../domain/product/mapCardDto");
const { calculatePreviousPrice } = require("../../../domain/product/pricing");
const { filterNonEmptyUniqueStrings } = require("../../../domain/shared/stringList");
const { toObjectIdOrNull } = require("../objectId");

function buildMongoProductRepository(collections, collectionNames) {
  const {
    products,
    categories,
    sizes,
    styles,
    colors,
    productImages,
    productSizes,
    productStyles,
    productColors,
  } = collections;

  async function getReferenceIdByName(collection, name) {
    const cleanName = typeof name === "string" ? name.trim() : "";
    if (!cleanName) return null;

    const existing = await collection.findOne({ name: cleanName }, { projection: { _id: 1 } });
    if (existing) return existing._id;

    const result = await collection.insertOne({ name: cleanName });
    return result.insertedId;
  }

  async function syncProductImages(productId, images) {
    await productImages.deleteMany({ product_id: productId });

    const uniqueUrls = filterNonEmptyUniqueStrings(images);
    if (uniqueUrls.length === 0) return;

    await productImages.insertMany(uniqueUrls.map((url) => ({ product_id: productId, url })));
  }

  async function syncProductJoin(productId, rawNames, dictionaryCollection, joinCollection, joinField) {
    await joinCollection.deleteMany({ product_id: productId });

    const names = filterNonEmptyUniqueStrings(rawNames);
    if (names.length === 0) return;

    const rows = [];
    for (const name of names) {
      const refId = await getReferenceIdByName(dictionaryCollection, name);
      rows.push({ product_id: productId, [joinField]: refId });
    }

    await joinCollection.insertMany(rows);
  }

  async function getAll(start = 0, limit = 10) {
    const pipeline = buildCardPipeline(collectionNames, { start, limit });
    const rows = await products.aggregate(pipeline).toArray();
    return rows.map(mapCardDto);
  }

  async function getById(id) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return null;

    const pipeline = buildCardPipeline(collectionNames, { match: { _id: objectId } });
    const rows = await products.aggregate(pipeline).toArray();
    return mapCardDto(rows[0] || null);
  }

  async function getByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const objectIds = ids
      .map((id) => toObjectIdOrNull(id))
      .filter((value) => value !== null);

    if (objectIds.length === 0) return [];

    const pipeline = buildCardPipeline(collectionNames, { match: { _id: { $in: objectIds } } });
    const rows = await products.aggregate(pipeline).toArray();

    const mapById = new Map(rows.map((row) => [row.id, mapCardDto(row)]));
    return ids.map((id) => mapById.get(id)).filter(Boolean);
  }

  async function create(data) {
    const categoryName = typeof data.category === "string" ? data.category.trim() : "";
    if (!categoryName) {
      throw new Error("category is required");
    }

    const categoryId = await getReferenceIdByName(categories, categoryName);

    const result = await products.insertOne({
      title: data.title,
      price: Number(data.price),
      previous_price: calculatePreviousPrice(data.price, data.previousPrice),
      rate: Number(data.rate),
      category_id: categoryId,
    });

    const productId = result.insertedId;

    await Promise.all([
      syncProductImages(productId, data.images),
      syncProductJoin(productId, data.sizes, sizes, productSizes, "size_id"),
      syncProductJoin(productId, data.styles, styles, productStyles, "style_id"),
      syncProductJoin(productId, data.colors, colors, productColors, "color_id"),
    ]);

    return getById(productId.toString());
  }

  async function update(id, data) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return null;

    const existing = await products.findOne({ _id: objectId });
    if (!existing) return null;

    const updates = {};

    if (typeof data.title === "string" && data.title.trim().length > 0) {
      updates.title = data.title.trim();
    }

    if (data.price !== undefined) {
      updates.previous_price = existing.price;
      updates.price = Number(data.price);
    }

    if (data.rate !== undefined) {
      updates.rate = Number(data.rate);
    }

    if (data.category !== undefined) {
      const categoryName = typeof data.category === "string" ? data.category.trim() : "";
      if (categoryName.length === 0) {
        throw new Error("category cannot be empty");
      }
      updates.category_id = await getReferenceIdByName(categories, categoryName);
    }

    if (Object.keys(updates).length > 0) {
      await products.updateOne({ _id: objectId }, { $set: updates });
    }

    const syncTasks = [];
    if (data.images !== undefined) {
      syncTasks.push(syncProductImages(objectId, data.images));
    }
    if (data.sizes !== undefined) {
      syncTasks.push(syncProductJoin(objectId, data.sizes, sizes, productSizes, "size_id"));
    }
    if (data.styles !== undefined) {
      syncTasks.push(syncProductJoin(objectId, data.styles, styles, productStyles, "style_id"));
    }
    if (data.colors !== undefined) {
      syncTasks.push(syncProductJoin(objectId, data.colors, colors, productColors, "color_id"));
    }

    if (syncTasks.length > 0) {
      await Promise.all(syncTasks);
    }

    return getById(id);
  }

  async function remove(id) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return false;

    const [productResult] = await Promise.all([
      products.deleteOne({ _id: objectId }),
      productImages.deleteMany({ product_id: objectId }),
      productSizes.deleteMany({ product_id: objectId }),
      productStyles.deleteMany({ product_id: objectId }),
      productColors.deleteMany({ product_id: objectId }),
    ]);

    return productResult.deletedCount === 1;
  }

  return {
    getAll,
    getById,
    getByIds,
    create,
    update,
    remove,
    buildCardPipeline: (options) => buildCardPipeline(collectionNames, options),
  };
}

module.exports = {
  buildMongoProductRepository,
};