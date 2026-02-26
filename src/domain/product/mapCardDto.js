function mapCardDto(row) {
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    price: row.price,
    previousPrice: row.previousPrice,
    rate: row.rate,
    category: row.category,
    images: row.images,
    sizes: row.sizes,
    styles: row.styles,
    colors: row.colors,
  };
}

module.exports = {
  mapCardDto,
};