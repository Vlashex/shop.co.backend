function toMoney(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.round(Number(fallback) * 100) / 100;
  return Math.round(parsed * 100) / 100;
}

function toOrderDto(row) {
  if (!row) return null;

  return {
    id: String(row.id).trim(),
    userId: String(row.user_id).trim(),
    status: row.status,
    totalPrice: toMoney(row.total_price),
    items: (Array.isArray(row.items) ? row.items : []).map((item) => ({
      productId: String(item.productId || "").trim(),
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
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

module.exports = {
  toMoney,
  toOrderDto,
};
