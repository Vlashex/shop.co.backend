const jwt = require("jsonwebtoken");

function buildTokenService() {
  const secret = process.env.SECRET_KEY || "dev-secret";

  function signTokens(userId) {
    const access_token = jwt.sign({ userId }, secret, { expiresIn: "15m" });
    const refresh_token = jwt.sign({ userId }, secret, { expiresIn: "7d" });
    return { access_token, refresh_token };
  }

  function getUserIdFromToken(token) {
    if (!token) return null;
    const rawToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    try {
      const payload = jwt.verify(rawToken, secret);
      return payload.userId;
    } catch {
      return null;
    }
  }

  return {
    signTokens,
    getUserIdFromToken,
  };
}

module.exports = {
  buildTokenService,
};
