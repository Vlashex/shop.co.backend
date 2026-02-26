function buildCardPipeline(collectionNames, { match = {}, start, limit } = {}) {
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
        from: collectionNames.categories,
        localField: "category_id",
        foreignField: "_id",
        as: "category",
      },
    },
    { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: collectionNames.productImages,
        localField: "_id",
        foreignField: "product_id",
        as: "product_images",
      },
    },
    {
      $lookup: {
        from: collectionNames.productSizes,
        localField: "_id",
        foreignField: "product_id",
        as: "product_sizes",
      },
    },
    {
      $lookup: {
        from: collectionNames.productStyles,
        localField: "_id",
        foreignField: "product_id",
        as: "product_styles",
      },
    },
    {
      $lookup: {
        from: collectionNames.productColors,
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
        from: collectionNames.sizes,
        localField: "product_sizes.size_id",
        foreignField: "_id",
        as: "size",
      },
    },
    {
      $lookup: {
        from: collectionNames.styles,
        localField: "product_styles.style_id",
        foreignField: "_id",
        as: "style",
      },
    },
    {
      $lookup: {
        from: collectionNames.colors,
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

module.exports = {
  buildCardPipeline,
};