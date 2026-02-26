const { calculatePreviousPrice } = require("../../domain/product/pricing");
const { filterNonEmptyUniqueStrings } = require("../../domain/shared/stringList");

async function ensureLookupId(collection, name, cache) {
  if (cache.has(name)) return cache.get(name);

  const existing = await collection.findOne({ name }, { projection: { _id: 1 } });
  if (existing) {
    cache.set(name, existing._id);
    return existing._id;
  }

  const result = await collection.insertOne({ name });
  cache.set(name, result.insertedId);
  return result.insertedId;
}

async function ensureSeedProducts(collections, products) {
  const count = await collections.products.countDocuments();
  if (count > 0) return;

  const categoriesCache = new Map();
  const sizesCache = new Map();
  const stylesCache = new Map();
  const colorsCache = new Map();

  for (const product of products) {
    const categoryId = await ensureLookupId(
      collections.categories,
      product.category,
      categoriesCache
    );

    const productInsert = await collections.products.insertOne({
      title: product.title,
      price: Number(product.price),
      previous_price: calculatePreviousPrice(product.price, product.previousPrice),
      rate: Number(product.rate),
      category_id: categoryId,
    });

    const productId = productInsert.insertedId;

    const imageRows = filterNonEmptyUniqueStrings(product.images).map((url) => ({
      product_id: productId,
      url,
    }));
    if (imageRows.length > 0) {
      await collections.productImages.insertMany(imageRows);
    }

    const sizeRows = [];
    for (const sizeName of filterNonEmptyUniqueStrings(product.sizes)) {
      const sizeId = await ensureLookupId(collections.sizes, sizeName, sizesCache);
      sizeRows.push({ product_id: productId, size_id: sizeId });
    }
    if (sizeRows.length > 0) {
      await collections.productSizes.insertMany(sizeRows);
    }

    const styleRows = [];
    for (const styleName of filterNonEmptyUniqueStrings(product.styles)) {
      const styleId = await ensureLookupId(collections.styles, styleName, stylesCache);
      styleRows.push({ product_id: productId, style_id: styleId });
    }
    if (styleRows.length > 0) {
      await collections.productStyles.insertMany(styleRows);
    }

    const colorRows = [];
    for (const colorName of filterNonEmptyUniqueStrings(product.colors)) {
      const colorId = await ensureLookupId(collections.colors, colorName, colorsCache);
      colorRows.push({ product_id: productId, color_id: colorId });
    }
    if (colorRows.length > 0) {
      await collections.productColors.insertMany(colorRows);
    }
  }
}

module.exports = {
  ensureSeedProducts,
};