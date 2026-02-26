const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { AbstractCursor } = require("mongodb");

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const ALGORITHM = "HS256";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function stripBearer(token) {
  if (typeof token !== "string") return "";
  return token.startsWith("Bearer ") ? token.slice(7) : token;
}

function buildTokenService() {
  const accessSecret = getRequiredEnv("ACCESS_TOKEN_SECRET");
  const refreshSecret = getRequiredEnv("REFRESH_TOKEN_SECRET");
  const issuer = getRequiredEnv("JWT_ISSUER");
  const audience = getRequiredEnv("JWT_AUDIENCE");
  const keyVersion = process.env.JWT_KEY_VERSION || "v1";

  function signTokens(userId) {
    const subject = String(userId);
    const header = { alg: ALGORITHM, typ: "JWT", kid: keyVersion };

    const access_token = jwt.sign(
      { sub: subject },
      accessSecret,
      {
        algorithm: ALGORITHM,
        issuer,
        audience,
        expiresIn: ACCESS_TTL_SECONDS,
        header,
      }
    );

    const refresh_token = jwt.sign(
      { sub: subject, jti: crypto.randomUUID() },
      refreshSecret,
      {
        algorithm: ALGORITHM,
        issuer,
        audience,
        expiresIn: REFRESH_TTL_SECONDS,
        header,
      }
    );

    return  { access_token: access_token, refresh_token: refresh_token };
  }

  function getUserIdFromToken(token) {
    const rawToken = stripBearer(token);
    if (!rawToken) return null;

    try {
      const payload = jwt.verify(rawToken, accessSecret, {
        algorithms: [ALGORITHM],
        issuer,
        audience,
      });
      return typeof payload.sub === "string" ? payload.sub : null;
    } catch {
      return null;
    }
  }

  return { signTokens, getUserIdFromToken };
}

module.exports = { buildTokenService };
