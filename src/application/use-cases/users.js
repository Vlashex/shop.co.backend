function buildUserUseCases({ userRepository }, hashService) {
  async function listUsers() {
    return userRepository.getAll();
  }

  async function getUser(id) {
    return userRepository.getById(id);
  }

  async function createUser(data) {
    const hashedPassword = await hashService.hash(data.password);
    return userRepository.create(data, hashedPassword);
  }

  async function updateUser(id, data) {
    const updates = { ...data };

    if (typeof updates.password === "string" && updates.password.length > 0) {
      const hashedPassword = await hashService.hash(updates.password);
      await userRepository.setPassword(id, hashedPassword);
      delete updates.password;
    }

    return userRepository.update(id, updates);
  }

  async function deleteUser(id) {
    return userRepository.remove(id);
  }

  return {
    listUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
  };
}

module.exports = {
  buildUserUseCases,
};
