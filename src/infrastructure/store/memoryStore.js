const { products } = require("../data/products");
const {
  buildProductRepository,
} = require("../../adapters/repositories/inMemoryProductRepository");
const {
  buildUserRepository,
} = require("../../adapters/repositories/inMemoryUserRepository");

function buildRepositories() {
  const maxProductId = products.length
    ? Math.max(...products.map((p) => p.id))
    : 0;

  const store = {
    users: [],
    products: [...products],
    userPasswords: new Map(),
    nextUserId: 1,
    nextProductId: maxProductId + 1,
  };

  return {
    productRepository: buildProductRepository(store),
    userRepository: buildUserRepository(store),
  };
}

module.exports = {
  buildRepositories,
};
