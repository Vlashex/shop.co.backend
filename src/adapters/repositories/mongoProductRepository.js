const { ObjectId } = require("mongodb");

function toObjectIdOrNull(value) {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    return null;
  }
  return new ObjectId(value);
}

function filterNonEmptyStrings(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))];
}

function mapCardDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    price: row.price,
    previousPrice: row.previousPrice,
    rate: row.rate,
    category: row.category,
    images: row.images,
    sizes: row.sizes,
    styles: row.styles,
    colors: row.colors,
  };
}

function buildCardPipeline({ match = {}, start, limit } = {}) {
  const pipeline = [];

  if (Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }

  pipeline.push({ $sort: { _id: 1 } });

  if (typeof start === "number" && start > 0) {
    pipeline.push({ $skip: start });
  }

  if (typeof limit === "number") {
    pipeline.push({ $limit: limit });
  }

  pipeline.push(
    {
      $lookup: {
        from: "categories",
        localField: "category_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "product_images",
        localField: "_id",
        foreignField: "product_id",
        as: "product_images",
      },
    },
    {
      $lookup: {
        from: "product_sizes",
        localField: "_id",
        foreignField: "product_id",
        as: "product_sizes",
      },
    },
    {
      $lookup: {
        from: "product_styles",
        localField: "_id",
        foreignField: "product_id",
        as: "product_styles",
      },
    },
    {
      $lookup: {
        from: "product_colors",
        localField: "_id",
        foreignField: "product_id",
        as: "product_colors",
      },
    },
    { $unwind: { path: "$product_images", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$product_sizes", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$product_styles", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$product_colors", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "sizes",
        localField: "product_sizes.size_id",
        foreignField: "_id",
        as: "size",
      },
    },
    {
      $lookup: {
        from: "styles",
        localField: "product_styles.style_id",
        foreignField: "_id",
        as: "style",
      },
    },
    {
      $lookup: {
        from: "colors",
        localField: "product_colors.color_id",
        foreignField: "_id",
        as: "color",
      },
    },
    { $unwind: { path: "$size", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$style", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$color", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$_id",
        title: { $first: "$title" },
        price: { $first: "$price" },
        previous_price: { $first: "$previous_price" },
        rate: { $first: "$rate" },
        category: { $first: "$category.name" },
        images: { $addToSet: "$product_images.url" },
        sizes: { $addToSet: "$size.name" },
        styles: { $addToSet: "$style.name" },
        colors: { $addToSet: "$color.name" },
      },
    },
    {
      $project: {
        _id: 0,
        id: { $toString: "$_id" },
        title: 1,
        price: 1,
        previousPrice: "$previous_price",
        rate: 1,
        category: { $ifNull: ["$category", ""] },
        images: {
          $filter: {
            input: "$images",
            as: "url",
            cond: { $and: [{ $ne: ["$$url", null] }, { $ne: ["$$url", ""] }] },
          },
        },
        sizes: {
          $filter: {
            input: "$sizes",
            as: "name",
            cond: { $and: [{ $ne: ["$$name", null] }, { $ne: ["$$name", ""] }] },
          },
        },
        styles: {
          $filter: {
            input: "$styles",
            as: "name",
            cond: { $and: [{ $ne: ["$$name", null] }, { $ne: ["$$name", ""] }] },
          },
        },
        colors: {
          $filter: {
            input: "$colors",
            as: "name",
            cond: { $and: [{ $ne: ["$$name", null] }, { $ne: ["$$name", ""] }] },
          },
        },
      },
    }
  );

  return pipeline;
}

function buildMongoProductRepository(collections) {
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

    const uniqueUrls = filterNonEmptyStrings(images);
    if (uniqueUrls.length === 0) return;

    await productImages.insertMany(
      uniqueUrls.map((url) => ({ product_id: productId, url }))
    );
  }

  async function syncProductJoin(
    productId,
    rawNames,
    dictionaryCollection,
    joinCollection,
    joinField
  ) {
    await joinCollection.deleteMany({ product_id: productId });

    const names = filterNonEmptyStrings(rawNames);
    if (names.length === 0) return;

    const rows = [];
    for (const name of names) {
      const refId = await getReferenceIdByName(dictionaryCollection, name);
      rows.push({ product_id: productId, [joinField]: refId });
    }

    await joinCollection.insertMany(rows);
  }

  async function getAll(start = 0, limit = 10) {
    const pipeline = buildCardPipeline({ start, limit });
    const rows = await products.aggregate(pipeline).toArray();
    return rows.map(mapCardDto);
  }

  async function getById(id) {
    const objectId = toObjectIdOrNull(id);
    if (!objectId) return null;

    const pipeline = buildCardPipeline({ match: { _id: objectId } });
    const rows = await products.aggregate(pipeline).toArray();
    return mapCardDto(rows[0] || null);
  }

  async function getByIds(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const objectIds = ids
      .map((id) => toObjectIdOrNull(id))
      .filter((value) => value !== null);

    if (objectIds.length === 0) return [];

    const pipeline = buildCardPipeline({ match: { _id: { $in: objectIds } } });
    const rows = await products.aggregate(pipeline).toArray();

    const mapById = new Map(rows.map((row) => [row.id, mapCardDto(row)]));
    return ids.map((id) => mapById.get(id)).filter((item) => Boolean(item));
  }

  async function create(data) {
    const categoryName = typeof data.category === "string" ? data.category.trim() : "";
    if (!categoryName) {
      throw new Error("category is required");
    }

    const categoryId = await getReferenceIdByName(categories, categoryName);

    const nowPrice = Number(data.price);
    const previousPrice =
      data.previousPrice !== undefined ? Number(data.previousPrice) : Number((nowPrice * 1.2).toFixed(2));

    const result = await products.insertOne({
      title: data.title,
      price: nowPrice,
      previous_price: previousPrice,
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
      const nextPrice = Number(data.price);
      updates.previous_price = existing.price;
      updates.price = nextPrice;
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
    buildCardPipeline,
  };
}

module.exports = {
  buildMongoProductRepository,
};