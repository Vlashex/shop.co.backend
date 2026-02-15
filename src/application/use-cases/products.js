function buildProductUseCases({ productRepository }) {
  async function listProducts(start, limit) {
    return productRepository.getAll(start, limit);
  }

  async function getProduct(id) {
    return productRepository.getById(id);
  }

  async function getProductsByIds(ids) {
    return productRepository.getByIds(ids);
  }

  async function createProduct(data) {
    return productRepository.create(data);
  }

  async function updateProduct(id, data) {
    return productRepository.update(id, data);
  }

  async function deleteProduct(id) {
    return productRepository.remove(id);
  }

  return {
    listProducts,
    getProduct,
    getProductsByIds,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

module.exports = {
  buildProductUseCases,
};
