function buildAuthUseCases(
  { userRepository },
  hashService,
  tokenService
) {
  async function signUp(data) {
    const existing = await userRepository.getByEmail(data.email);
    if (existing) {
      return {
        data: null,
        error: { statusCode: 409, message: "User with this email already exists" },
      };
    }

    const hashedPassword = hashService.isLikelyHashed(data.password)
      ? data.password
      : hashService.hash(data.password);

    const user = await userRepository.create(data, hashedPassword);
    const tokens = tokenService.signTokens(user.id);

    return { data: { user, tokens }, error: null };
  }

  async function signIn(data) {
    const user = await userRepository.getByEmail(data.email);
    if (!user) {
      return { data: null, error: { statusCode: 401, message: "Invalid credentials" } };
    }

    const storedPassword = await userRepository.getPassword(user.id);
    const candidate = hashService.isLikelyHashed(data.password)
      ? data.password
      : hashService.hash(data.password);

    if (!storedPassword || storedPassword !== candidate) {
      return { data: null, error: { statusCode: 401, message: "Invalid credentials" } };
    }

    const tokens = tokenService.signTokens(user.id);
    return { data: { user, tokens }, error: null };
  }

  return {
    signUp,
    signIn,
  };
}

module.exports = {
  buildAuthUseCases,
};
