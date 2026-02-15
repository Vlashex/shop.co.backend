const { createProduct } = require("../../domain/entities");

function buildProductRepository(store) {
  function getAll(start = 0, limit = 10) {
    return store.products.slice(start, start + limit);
  }

  function getById(id) {
    return store.products.find((p) => p.id === id) || null;
  }

  function getByIds(ids) {
    return store.products.filter((p) => ids.includes(p.id));
  }

  function create(data) {
    const product = createProduct({
      id: store.nextProductId++,
      title: data.title,
      price: data.price,
      rate: data.rate,
      images: data.images,
      category: data.category,
      sizes: data.sizes,
      styles: data.styles,
      colors: data.colors,
    });

    store.products.push(product);
    return product;
  }

  function update(id, data) {
    const index = store.products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const existing = store.products[index];
    const next = { ...existing, ...data };

    if (data.price !== undefined) {
      next.previousPrice = data.price * 1.2;
    }

    store.products[index] = next;
    return next;
  }

  function remove(id) {
    const index = store.products.findIndex((p) => p.id === id);
    if (index === -1) return false;

    store.products.splice(index, 1);
    return true;
  }

  return {
    getAll,
    getById,
    getByIds,
    create,
    update,
    remove,
  };
}

module.exports = {
  buildProductRepository,
};
