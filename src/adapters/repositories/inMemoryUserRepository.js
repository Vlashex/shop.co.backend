const { createUser } = require("../../domain/entities");

function buildUserRepository(store) {
  function getAll() {
    return store.users;
  }

  function getById(id) {
    return store.users.find((u) => u.id === id) || null;
  }

  function getByEmail(email) {
    return store.users.find((u) => u.email === email) || null;
  }

  function create(data, hashedPassword) {
    const user = createUser({
      id: store.nextUserId++,
      email: data.email,
      name: data.name,
    });

    store.users.push(user);
    if (hashedPassword) {
      store.userPasswords.set(user.id, hashedPassword);
    }

    return user;
  }

  function update(id, data) {
    const index = store.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    store.users[index] = { ...store.users[index], ...data };
    return store.users[index];
  }

  function remove(id) {
    const index = store.users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    store.users.splice(index, 1);
    store.userPasswords.delete(id);
    return true;
  }

  function getPassword(userId) {
    return store.userPasswords.get(userId);
  }

  function setPassword(userId, hashedPassword) {
    store.userPasswords.set(userId, hashedPassword);
  }

  function addToCart(userId, productId) {
    const user = getById(userId);
    if (!user) return null;

    if (!user.cart.includes(productId)) {
      user.cart.push(productId);
    }

    return user;
  }

  function addManyToCart(userId, productIds) {
    const user = getById(userId);
    if (!user) return null;

    for (const id of productIds) {
      if (!user.cart.includes(id)) user.cart.push(id);
    }

    return user;
  }

  function removeFromCart(userId, productId) {
    const user = getById(userId);
    if (!user) return null;

    user.cart = user.cart.filter((id) => id !== productId);
    return user;
  }

  function clearCart(userId) {
    const user = getById(userId);
    if (!user) return null;

    user.cart = [];
    return user;
  }

  return {
    getAll,
    getById,
    getByEmail,
    create,
    update,
    remove,
    getPassword,
    setPassword,
    addToCart,
    addManyToCart,
    removeFromCart,
    clearCart,
  };
}

module.exports = {
  buildUserRepository,
};
