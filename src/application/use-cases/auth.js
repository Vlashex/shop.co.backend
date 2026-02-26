function buildAuthUseCases(
  { userRepository },
  hashService,
  tokenService,
  refreshTokenService
) {
  async function signUp(data, context = {}) {
    const existing = await userRepository.getByEmail(data.email);
    if (existing) {
      return {
        data: null,
        error: { statusCode: 409, message: "User with this email already exists" },
      };
    }

    const hashedPassword = await hashService.hash(data.password);

    const user = await userRepository.create(data, hashedPassword);
    const tokens = tokenService.signTokens(user.id);
    await refreshTokenService.persistIssuedRefresh(tokens.refresh_token, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    return { data: { user, tokens: tokens }, error: null };
  }

  async function signIn(data, context = {}) {
    const user = await userRepository.getByEmail(data.email);
    if (!user) {
      return { data: null, error: { statusCode: 401, message: "Invalid credentials" } };
    }

    const storedPassword = await userRepository.getPassword(user.id);
    const matches = storedPassword
      ? await hashService.verify(data.password, storedPassword)
      : false;

    if (!matches) {
      return { data: null, error: { statusCode: 401, message: "Invalid credentials" } };
    }

    const tokens = tokenService.signTokens(user.id);
    await refreshTokenService.persistIssuedRefresh(tokens.refresh_token, {
      ip: context.ip,
      userAgent: context.userAgent,
    });
    return { data: { user, tokens }, error: null };
  }

  async function refreshSession(refreshToken, context = {}) {
    const result = await refreshTokenService.rotate(refreshToken, {
      ip: context.ip,
      userAgent: context.userAgent,
    });

    if (result.error) {
      if (result.error.code === "TOKEN_EXPIRED") {
        return { data: null, error: { statusCode: 401, message: "Refresh token expired" } };
      }

      if (result.error.code === "TOKEN_REUSE") {
        return { data: null, error: { statusCode: 401, message: "Refresh token reuse detected" } };
      }

      return { data: null, error: { statusCode: 401, message: "Invalid refresh token" } };
    }

    return { data: result.data, error: null };
  }

  async function signOut(refreshToken) {
    await refreshTokenService.revokeFromToken(refreshToken);
    return { data: { success: true }, error: null };
  }

  return {
    signUp,
    signIn,
    refreshSession,
    signOut,
  };
}

module.exports = {
  buildAuthUseCases,
};
