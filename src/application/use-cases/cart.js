function buildCartUseCases({ userRepository }) {
  async function addItem(userId, productId) {
    return userRepository.addToCart(userId, productId);
  }

  async function addItems(userId, productIds) {
    return userRepository.addManyToCart(userId, productIds);
  }

  async function removeItem(userId, productId) {
    return userRepository.removeFromCart(userId, productId);
  }

  async function clear(userId) {
    return userRepository.clearCart(userId);
  }

  async function getUserCart(userId) {
    return userRepository.getById(userId);
  }

  return {
    addItem,
    addItems,
    removeItem,
    clear,
    getUserCart,
  };
}

module.exports = {
  buildCartUseCases,
};
