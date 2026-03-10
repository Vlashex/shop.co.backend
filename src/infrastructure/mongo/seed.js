const { toProductDocument } = require("./mappers/productMapper");

function isValidVariant(variant) {
  const stock = Number(variant?.stock);
  return (
    typeof variant?.id === "string" &&
    variant.id.trim().length > 0 &&
    Number.isInteger(stock) &&
    stock >= 0
  );
}

function shouldNormalizeProduct(doc) {
  if (!doc) return false;

  const hasPricing =
    doc.pricing &&
    Number.isFinite(Number(doc.pricing.current)) &&
    Number.isFinite(Number(doc.pricing.previous));
  const hasAttributes =
    doc.attributes &&
    Array.isArray(doc.attributes.sizes) &&
    Array.isArray(doc.attributes.styles) &&
    Array.isArray(doc.attributes.colors);
  const hasCategory = typeof doc.category === "string" && doc.category.trim().length > 0;
  const hasVariants = Array.isArray(doc.variants) && doc.variants.length > 0;
  const allVariantsValid = hasVariants && doc.variants.every(isValidVariant);

  return !(hasPricing && hasAttributes && hasCategory && allVariantsValid);
}

function toLegacyPayload(doc) {
  return {
    title: doc.title,
    price: doc.pricing?.current ?? doc.price,
    previousPrice:
      doc.pricing?.previous ?? doc.previous_price ?? doc.previousPrice,
    rate: doc.rating ?? doc.rate,
    category:
      typeof doc.category === "string" && doc.category.trim().length > 0
        ? doc.category
        : "uncategorized",
    images: doc.images,
    sizes: doc.attributes?.sizes || doc.sizes,
    styles: doc.attributes?.styles || doc.styles,
    colors: doc.attributes?.colors || doc.colors,
    variants: doc.variants,
  };
}

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

async function ensureProductInventoryShape(collections) {
  const now = new Date();
  const docs = await collections.products.find({}).toArray();

  for (const doc of docs) {
    if (!shouldNormalizeProduct(doc)) continue;

    const createdAt = doc.createdAt instanceof Date ? doc.createdAt : now;
    const normalized = toProductDocument(toLegacyPayload(doc), createdAt);
    normalized.updatedAt = now;

    await collections.products.updateOne(
      { _id: doc._id },
      {
        $set: normalized,
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
  }
}

module.exports = {
  ensureSeedProducts,
  ensureProductInventoryShape,
};
