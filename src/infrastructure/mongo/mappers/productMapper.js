const { Int32 } = require("mongodb");

const { filterNonEmptyUniqueStrings } = require("../../../domain/shared/stringList");
const { calculatePreviousPrice } = require("../../../domain/product/pricing");

const DEFAULT_VARIANT_STOCK = 25;

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value, fallback = 0) {
  return Math.round(toNumber(value, fallback) * 100) / 100;
}

function toNonNegativeInteger(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.max(0, Math.floor(fallback));
  }
  return Math.max(0, Math.floor(parsed));
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function makeVariantKey(variant) {
  return `${variant.size || ""}|${variant.style || ""}|${variant.color || ""}`;
}

function toSlugPart(value, fallback = "x") {
  const cleaned = normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "") || fallback;
}

function createVariantId(candidate, index, usedIds) {
  let id = normalizeText(candidate);

  if (!id) {
    id = `v-${index + 1}`;
  }

  const base = toSlugPart(id, `v-${index + 1}`);
  let unique = base;
  let suffix = 2;

  while (usedIds.has(unique)) {
    unique = `${base}-${suffix}`;
    suffix += 1;
  }

  usedIds.add(unique);
  return unique;
}

function deriveAttributesFromVariants(variants, fallback = {}) {
  const sizes = filterNonEmptyUniqueStrings(variants.map((variant) => variant.size));
  const styles = filterNonEmptyUniqueStrings(variants.map((variant) => variant.style));
  const colors = filterNonEmptyUniqueStrings(variants.map((variant) => variant.color));

  return {
    sizes: sizes.length > 0 ? sizes : filterNonEmptyUniqueStrings(fallback.sizes),
    styles: styles.length > 0 ? styles : filterNonEmptyUniqueStrings(fallback.styles),
    colors: colors.length > 0 ? colors : filterNonEmptyUniqueStrings(fallback.colors),
  };
}

function buildVariantsFromAttributes(attributes, basePrice, defaultStock) {
  const sizes = filterNonEmptyUniqueStrings(attributes?.sizes);
  const styles = filterNonEmptyUniqueStrings(attributes?.styles);
  const colors = filterNonEmptyUniqueStrings(attributes?.colors);

  const sizeValues = sizes.length > 0 ? sizes : [""];
  const styleValues = styles.length > 0 ? styles : [""];
  const colorValues = colors.length > 0 ? colors : [""];

  const variants = [];

  for (const size of sizeValues) {
    for (const style of styleValues) {
      for (const color of colorValues) {
        variants.push({
          id: "",
          size,
          style,
          color,
          price: basePrice,
          stock: defaultStock,
        });
      }
    }
  }

  return variants;
}

function normalizeVariants(
  rawVariants,
  {
    basePrice = 0,
    defaultStock = DEFAULT_VARIANT_STOCK,
    fallbackAttributes = null,
  } = {}
) {
  let source = Array.isArray(rawVariants) ? rawVariants : [];

  if (source.length === 0 && fallbackAttributes) {
    source = buildVariantsFromAttributes(fallbackAttributes, basePrice, defaultStock);
  }

  if (source.length === 0) {
    source = [
      {
        id: "default",
        size: "",
        style: "",
        color: "",
        price: basePrice,
        stock: defaultStock,
      },
    ];
  }

  const usedIds = new Set();

  return source.map((variant, index) => {
    const size = normalizeText(variant?.size);
    const style = normalizeText(variant?.style);
    const color = normalizeText(variant?.color);

    const suggestedId =
      normalizeText(variant?.id) ||
      `${toSlugPart(size, "size")}-${toSlugPart(style, "style")}-${toSlugPart(color, "color")}`;

    return {
      id: createVariantId(suggestedId, index, usedIds),
      size,
      style,
      color,
      price: toMoney(variant?.price, basePrice),
      stock: new Int32(toNonNegativeInteger(variant?.stock, defaultStock)),
    };
  });
}

function rebuildVariantsByAttributes(existingVariants, nextAttributes, basePrice) {
  const existingByKey = new Map(
    existingVariants.map((variant) => [makeVariantKey(variant), variant])
  );

  const nextRaw = buildVariantsFromAttributes(nextAttributes, basePrice, 0).map((variant) => {
    const existing = existingByKey.get(makeVariantKey(variant));
    if (!existing) return variant;

    return {
      id: existing.id,
      size: variant.size,
      style: variant.style,
      color: variant.color,
      price: basePrice,
      stock: existing.stock,
    };
  });

  return normalizeVariants(nextRaw, {
    basePrice,
    defaultStock: 0,
    fallbackAttributes: null,
  });
}

function toProductDocument(payload = {}, now = new Date()) {
  const title = normalizeText(payload.title);
  const category = normalizeText(payload.category);
  const currentPrice = toMoney(payload.price);
  const previousPrice = toMoney(calculatePreviousPrice(payload.price, payload.previousPrice));

  const variants = normalizeVariants(payload.variants, {
    basePrice: currentPrice,
    defaultStock: toNonNegativeInteger(payload.defaultVariantStock, DEFAULT_VARIANT_STOCK),
    fallbackAttributes: {
      sizes: payload.sizes,
      styles: payload.styles,
      colors: payload.colors,
    },
  });

  return {
    title,
    pricing: {
      current: currentPrice,
      previous: previousPrice,
    },
    rating: toNumber(payload.rate),
    category,
    images: filterNonEmptyUniqueStrings(payload.images),
    attributes: deriveAttributesFromVariants(variants, payload),
    variants,
    updatedAt: now,
    createdAt: now,
  };
}

function toProductUpdateDocument(payload = {}, existingDoc = {}) {
  const updates = {};
  const set = {};

  const existingCurrentPrice = toMoney(
    existingDoc.pricing?.current !== undefined ? existingDoc.pricing?.current : existingDoc.price
  );
  const existingPreviousPrice = toMoney(
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
    const current = toMoney(payload.price, existingCurrentPrice);
    set.pricing = {
      current,
      previous:
        payload.previousPrice !== undefined
          ? toMoney(payload.previousPrice, existingPreviousPrice || current)
          : existingCurrentPrice || current,
    };
  } else if (payload.previousPrice !== undefined) {
    set.pricing = {
      current: existingCurrentPrice,
      previous: toMoney(payload.previousPrice, existingPreviousPrice),
    };
  }

  if (payload.rate !== undefined) {
    set.rating = toNumber(payload.rate);
  }

  if (payload.category !== undefined) {
    const category = normalizeText(payload.category);
    if (!category) {
      throw new Error("category cannot be empty");
    }
    set.category = category;
  }

  if (payload.images !== undefined) {
    set.images = filterNonEmptyUniqueStrings(payload.images);
  }

  const basePrice = set.pricing?.current ?? existingCurrentPrice;
  const existingVariants = normalizeVariants(existingDoc.variants, {
    basePrice,
    defaultStock: 0,
    fallbackAttributes: {
      sizes: existingDoc.attributes?.sizes || existingDoc.sizes,
      styles: existingDoc.attributes?.styles || existingDoc.styles,
      colors: existingDoc.attributes?.colors || existingDoc.colors,
    },
  });

  if (payload.variants !== undefined) {
    const nextVariants = normalizeVariants(payload.variants, {
      basePrice,
      defaultStock: 0,
      fallbackAttributes: null,
    });
    set.variants = nextVariants;
    set.attributes = deriveAttributesFromVariants(nextVariants, payload);
  } else if (
    payload.sizes !== undefined ||
    payload.styles !== undefined ||
    payload.colors !== undefined
  ) {
    const nextAttributes = {
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

    const rebuiltVariants = rebuildVariantsByAttributes(
      existingVariants,
      nextAttributes,
      basePrice
    );

    set.variants = rebuiltVariants;
    set.attributes = deriveAttributesFromVariants(rebuiltVariants, nextAttributes);
  } else if (payload.price !== undefined) {
    set.variants = existingVariants.map((variant) => ({
      ...variant,
      price: toMoney(basePrice),
    }));
  }

  if (Object.keys(set).length > 0) {
    updates.$set = { ...set, updatedAt: new Date() };
  }

  return updates;
}

function toProductDto(doc) {
  if (!doc) return null;

  const currentPrice =
    doc.pricing?.current !== undefined ? doc.pricing.current : toMoney(doc.price);
  const previousPrice =
    doc.pricing?.previous !== undefined
      ? doc.pricing.previous
      : doc.previous_price !== undefined
        ? doc.previous_price
        : doc.previousPrice;
  const rating = doc.rating !== undefined ? doc.rating : doc.rate;

  const variants = normalizeVariants(doc.variants, {
    basePrice: currentPrice,
    defaultStock: 0,
    fallbackAttributes: {
      sizes: doc.attributes?.sizes || doc.sizes,
      styles: doc.attributes?.styles || doc.styles,
      colors: doc.attributes?.colors || doc.colors,
    },
  });

  const attributes = deriveAttributesFromVariants(variants, {
    sizes: doc.attributes?.sizes || doc.sizes,
    styles: doc.attributes?.styles || doc.styles,
    colors: doc.attributes?.colors || doc.colors,
  });

  return {
    id: doc._id.toString(),
    title: doc.title,
    price: toMoney(currentPrice),
    previousPrice: toMoney(previousPrice),
    rate: toNumber(rating),
    category:
      typeof doc.category === "string" && doc.category.trim().length > 0
        ? doc.category
        : "uncategorized",
    images: filterNonEmptyUniqueStrings(doc.images),
    sizes: attributes.sizes,
    styles: attributes.styles,
    colors: attributes.colors,
    variants: variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      style: variant.style,
      color: variant.color,
      price: toMoney(variant.price, currentPrice),
      stock: toNonNegativeInteger(variant.stock, 0),
    })),
  };
}

module.exports = {
  toProductDocument,
  toProductUpdateDocument,
  toProductDto,
};
