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
  if (!Number.isFinite(parsed)) return Math.max(0, Math.floor(fallback));
  return Math.max(0, Math.floor(parsed));
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function toSlugPart(value, fallback = "x") {
  const cleaned = normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return cleaned.replace(/^-+|-+$/g, "") || fallback;
}

function createVariantId(candidate, index, usedIds) {
  const base = toSlugPart(candidate || `v-${index + 1}`, `v-${index + 1}`);
  let unique = base;
  let suffix = 2;
  while (usedIds.has(unique)) {
    unique = `${base}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(unique);
  return unique;
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
        variants.push({ id: "", size, style, color, price: basePrice, stock: defaultStock });
      }
    }
  }

  return variants;
}

function normalizeVariants(rawVariants, options = {}) {
  const basePrice = toMoney(options.basePrice);
  const defaultStock = toNonNegativeInteger(options.defaultStock, DEFAULT_VARIANT_STOCK);
  let source = Array.isArray(rawVariants) ? rawVariants : [];

  if (source.length === 0 && options.fallbackAttributes) {
    source = buildVariantsFromAttributes(options.fallbackAttributes, basePrice, defaultStock);
  }

  if (source.length === 0) {
    source = [{ id: "default", size: "", style: "", color: "", price: basePrice, stock: defaultStock }];
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
      stock: toNonNegativeInteger(variant?.stock, defaultStock),
    };
  });
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

function makeVariantKey(variant) {
  return `${variant.size || ""}|${variant.style || ""}|${variant.color || ""}`;
}

function rebuildVariantsByAttributes(existingVariants, nextAttributes, basePrice) {
  const existingByKey = new Map(existingVariants.map((variant) => [makeVariantKey(variant), variant]));
  return normalizeVariants(buildVariantsFromAttributes(nextAttributes, basePrice, 0).map((variant) => {
    const existing = existingByKey.get(makeVariantKey(variant));
    return existing ? { ...variant, id: existing.id, stock: existing.stock } : variant;
  }), { basePrice, defaultStock: 0 });
}

function toProductRecord(payload = {}, now = new Date()) {
  const title = normalizeText(payload.title);
  const category = normalizeText(payload.category);
  const current = toMoney(payload.price);
  const previous = toMoney(calculatePreviousPrice(payload.price, payload.previousPrice));
  const variants = normalizeVariants(payload.variants, {
    basePrice: current,
    defaultStock: toNonNegativeInteger(payload.defaultVariantStock, DEFAULT_VARIANT_STOCK),
    fallbackAttributes: { sizes: payload.sizes, styles: payload.styles, colors: payload.colors },
  });

  return {
    title,
    pricing: { current, previous },
    rating: toNumber(payload.rate),
    category,
    images: filterNonEmptyUniqueStrings(payload.images),
    attributes: deriveAttributesFromVariants(variants, payload),
    variants,
    createdAt: now,
    updatedAt: now,
  };
}

function applyProductUpdates(existing, payload = {}) {
  const next = {
    title: existing.title,
    pricing: { ...existing.pricing },
    rating: existing.rating,
    category: existing.category,
    images: [...existing.images],
    attributes: { ...existing.attributes },
    variants: normalizeVariants(existing.variants, { basePrice: existing.pricing.current, defaultStock: 0 }),
  };

  if (typeof payload.title === "string" && payload.title.trim()) next.title = payload.title.trim();
  if (payload.price !== undefined) {
    const current = toMoney(payload.price, next.pricing.current);
    next.pricing = {
      current,
      previous: payload.previousPrice !== undefined ? toMoney(payload.previousPrice, next.pricing.previous) : next.pricing.previous,
    };
    next.variants = next.variants.map((variant) => ({ ...variant, price: current }));
  } else if (payload.previousPrice !== undefined) {
    next.pricing.previous = toMoney(payload.previousPrice, next.pricing.previous);
  }
  if (payload.rate !== undefined) next.rating = toNumber(payload.rate);
  if (payload.category !== undefined) {
    const category = normalizeText(payload.category);
    if (!category) throw new Error("category cannot be empty");
    next.category = category;
  }
  if (payload.images !== undefined) next.images = filterNonEmptyUniqueStrings(payload.images);
  if (payload.variants !== undefined) {
    next.variants = normalizeVariants(payload.variants, { basePrice: next.pricing.current, defaultStock: 0 });
    next.attributes = deriveAttributesFromVariants(next.variants, payload);
  } else if (payload.sizes !== undefined || payload.styles !== undefined || payload.colors !== undefined) {
    next.attributes = {
      sizes: payload.sizes !== undefined ? filterNonEmptyUniqueStrings(payload.sizes) : filterNonEmptyUniqueStrings(next.attributes.sizes),
      styles: payload.styles !== undefined ? filterNonEmptyUniqueStrings(payload.styles) : filterNonEmptyUniqueStrings(next.attributes.styles),
      colors: payload.colors !== undefined ? filterNonEmptyUniqueStrings(payload.colors) : filterNonEmptyUniqueStrings(next.attributes.colors),
    };
    next.variants = rebuildVariantsByAttributes(next.variants, next.attributes, next.pricing.current);
    next.attributes = deriveAttributesFromVariants(next.variants, next.attributes);
  }

  next.updatedAt = new Date();
  return next;
}

function rowToProduct(row) {
  if (!row) return null;
  return {
    id: String(row.id).trim(),
    title: row.title,
    price: toMoney(row.pricing?.current),
    previousPrice: toMoney(row.pricing?.previous),
    rate: toNumber(row.rating),
    category: row.category || "uncategorized",
    images: filterNonEmptyUniqueStrings(row.images),
    sizes: filterNonEmptyUniqueStrings(row.attributes?.sizes),
    styles: filterNonEmptyUniqueStrings(row.attributes?.styles),
    colors: filterNonEmptyUniqueStrings(row.attributes?.colors),
    variants: normalizeVariants(row.variants, { basePrice: row.pricing?.current, defaultStock: 0 }).map((variant) => ({
      ...variant,
      price: toMoney(variant.price, row.pricing?.current),
      stock: toNonNegativeInteger(variant.stock, 0),
    })),
  };
}

module.exports = {
  applyProductUpdates,
  rowToProduct,
  toMoney,
  toProductRecord,
};
