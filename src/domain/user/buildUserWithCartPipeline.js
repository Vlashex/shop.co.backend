function buildUserWithCartPipeline(collectionNames, match = {}) {
  const pipeline = [];

  if (Object.keys(match).length > 0) {
    pipeline.push({ $match: match });
  }

  pipeline.push(
    {
      $lookup: {
        from: collectionNames.cartItems,
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

module.exports = {
  buildUserWithCartPipeline,
};