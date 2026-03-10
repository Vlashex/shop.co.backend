const { toProductDocument } = require("./mappers/productMapper");

async function ensureSeedProducts(collections, products) {
  const count = await collections.products.countDocuments();
  if (count > 0) return;

  const now = new Date();
  const docs = products.map((product) =>
    toProductDocument(
      {
        title: product.title,
        price: product.price,
        previousPrice: product.previousPrice,
        rate: product.rate,
        category: product.category,
        images: product.images,
        sizes: product.sizes,
        styles: product.styles,
        colors: product.colors,
      },
      now
    )
  );

  if (docs.length > 0) {
    await collections.products.insertMany(docs);
  }
}

module.exports = {
  ensureSeedProducts,
};
