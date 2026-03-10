const { filterNonEmptyUniqueStrings } = require("../../../domain/shared/stringList");
const { calculatePreviousPrice } = require("../../../domain/product/pricing");

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toProductDocument(payload = {}, now = new Date()) {
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const category = typeof payload.category === "string" ? payload.category.trim() : "";

  return {
    title,
    pricing: {
      current: toNumber(payload.price),
      previous: calculatePreviousPrice(payload.price, payload.previousPrice),
    },
    rating: toNumber(payload.rate),
    category,
    images: filterNonEmptyUniqueStrings(payload.images),
    attributes: {
      sizes: filterNonEmptyUniqueStrings(payload.sizes),
      styles: filterNonEmptyUniqueStrings(payload.styles),
      colors: filterNonEmptyUniqueStrings(payload.colors),
    },
    updatedAt: now,
    createdAt: now,
  };
}

function toProductUpdateDocument(payload = {}, existingDoc = {}) {
  const updates = {};
  const set = {};

  const existingCurrentPrice = toNumber(
    existingDoc.pricing?.current !== undefined
      ? existingDoc.pricing?.current
      : existingDoc.price
  );
  const existingPreviousPrice = toNumber(
    existingDoc.pricing?.previous !== undefined
      ? existingDoc.pricing?.previous
      : existingDoc.previous_price !== undefined
        ? existingDoc.previous_price
        : existingDoc.previousPrice
  );

  if (typeof payload.title === "string") {
    const title = payload.title.trim();
    if (title.length > 0) {
      set.title = title;
    }
  }

  if (payload.price !== undefined) {
    const current = toNumber(payload.price, existingCurrentPrice);
    set.pricing = {
      current,
      previous:
        payload.previousPrice !== undefined
          ? toNumber(payload.previousPrice, existingPreviousPrice || current)
          : existingCurrentPrice || current,
    };
  } else if (payload.previousPrice !== undefined) {
    set.pricing = {
      current: existingCurrentPrice,
      previous: toNumber(payload.previousPrice, existingPreviousPrice),
    };
  }

  if (payload.rate !== undefined) {
    set.rating = toNumber(payload.rate);
  }

  if (payload.category !== undefined) {
    const category = typeof payload.category === "string" ? payload.category.trim() : "";
    if (category.length === 0) {
      throw new Error("category cannot be empty");
    }
    set.category = category;
  }

  if (payload.images !== undefined) {
    set.images = filterNonEmptyUniqueStrings(payload.images);
  }

  if (
    payload.sizes !== undefined ||
    payload.styles !== undefined ||
    payload.colors !== undefined
  ) {
    set.attributes = {
      sizes:
        payload.sizes !== undefined
          ? filterNonEmptyUniqueStrings(payload.sizes)
          : filterNonEmptyUniqueStrings(existingDoc.attributes?.sizes || existingDoc.sizes),
      styles:
        payload.styles !== undefined
          ? filterNonEmptyUniqueStrings(payload.styles)
          : filterNonEmptyUniqueStrings(existingDoc.attributes?.styles || existingDoc.styles),
      colors:
        payload.colors !== undefined
          ? filterNonEmptyUniqueStrings(payload.colors)
          : filterNonEmptyUniqueStrings(existingDoc.attributes?.colors || existingDoc.colors),
    };
  }

  if (Object.keys(set).length > 0) {
    updates.$set = { ...set, updatedAt: new Date() };
  }

  return updates;
}

function toProductDto(doc) {
  if (!doc) return null;

  const currentPrice = doc.pricing?.current !== undefined ? doc.pricing.current : doc.price;
  const previousPrice =
    doc.pricing?.previous !== undefined
      ? doc.pricing.previous
      : doc.previous_price !== undefined
        ? doc.previous_price
        : doc.previousPrice;
  const rating = doc.rating !== undefined ? doc.rating : doc.rate;

  return {
    id: doc._id.toString(),
    title: doc.title,
    price: toNumber(currentPrice),
    previousPrice: toNumber(previousPrice),
    rate: toNumber(rating),
    category:
      typeof doc.category === "string" && doc.category.trim().length > 0
        ? doc.category
        : "uncategorized",
    images: filterNonEmptyUniqueStrings(doc.images),
    sizes: filterNonEmptyUniqueStrings(doc.attributes?.sizes || doc.sizes),
    styles: filterNonEmptyUniqueStrings(doc.attributes?.styles || doc.styles),
    colors: filterNonEmptyUniqueStrings(doc.attributes?.colors || doc.colors),
  };
}

module.exports = {
  toProductDocument,
  toProductUpdateDocument,
  toProductDto,
};
