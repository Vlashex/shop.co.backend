function toMoney(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return Math.round(Number(fallback) * 100) / 100;
  }
  return Math.round(parsed * 100) / 100;
}

function toOrderDto(doc) {
  if (!doc) return null;

  return {
    id: doc._id.toString(),
    userId: doc.userId,
    status: doc.status,
    totalPrice: toMoney(doc.totalPrice),
    items: (Array.isArray(doc.items) ? doc.items : []).map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productTitle: item.productTitle,
      quantity: Number(item.quantity),
      unitPrice: toMoney(item.unitPrice),
      lineTotal: toMoney(item.lineTotal),
      variant: {
        size: item.variant?.size || "",
        style: item.variant?.style || "",
        color: item.variant?.color || "",
      },
    })),
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

module.exports = {
  toOrderDto,
};
