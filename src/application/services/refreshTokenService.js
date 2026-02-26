const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60;
const ALGORITHM = "HS256";

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function buildRefreshTokenService(refreshStore, tokenService, auditLogger = console) {
  const refreshSecret = getRequiredEnv("REFRESH_TOKEN_SECRET");
  const tokenHashSecret = getRequiredEnv("REFRESH_TOKEN_HASH_SECRET");
  const issuer = getRequiredEnv("JWT_ISSUER");
  const audience = getRequiredEnv("JWT_AUDIENCE");
  const keyVersion = process.env.JWT_KEY_VERSION || "v1";

  function hashToken(token) {
    return crypto
      .createHmac("sha256", tokenHashSecret)
      .update(token)
      .digest("hex");
  }

  function safeEqualHex(leftHex, rightHex) {
    if (
      typeof leftHex !== "string" ||
      typeof rightHex !== "string" ||
      leftHex.length !== rightHex.length
    ) {
      return false;
    }

    const left = Buffer.from(leftHex, "hex");
    const right = Buffer.from(rightHex, "hex");
    if (left.length !== right.length || left.length === 0) {
      return false;
    }

    return crypto.timingSafeEqual(left, right);
  }

  function verifyRefreshToken(refreshToken) {
    return jwt.verify(refreshToken, refreshSecret, {
      algorithms: [ALGORITHM],
      issuer,
      audience,
    });
  }

  function decodeRefreshUnsafe(refreshToken) {
    const decoded = jwt.decode(refreshToken);
    if (!decoded || typeof decoded !== "object") return null;
    return decoded;
  }

  async function persistIssuedRefresh(refreshToken, metadata = {}) {
    const decoded = decodeRefreshUnsafe(refreshToken);
    if (!decoded || typeof decoded.sub !== "string" || typeof decoded.jti !== "string") {
      throw new Error("Issued refresh token is malformed");
    }
    if (typeof decoded.exp !== "number") {
      throw new Error("Issued refresh token missing exp");
    }

    const userId = decoded.sub;
    const jti = decoded.jti;
    const expiresInSeconds = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);

    const session = {
      jti,
      userId,
      familyId: jti,
      tokenHash: hashToken(refreshToken),
      rotatedTo: null,
      revokedAt: null,
      keyVersion,
      ip: metadata.ip || null,
      userAgent: metadata.userAgent || null,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
    };

    await refreshStore.save(session, expiresInSeconds);
    await refreshStore.addUserJti(userId, jti, expiresInSeconds);
  }

  async function revokeAllUserTokens(userId, reason) {
    const jtis = await refreshStore.getUserJtis(userId);
    await Promise.all(
      jtis.map((jti) =>
        refreshStore.revoke(jti, {
          reason,
          revokedAt: new Date().toISOString(),
        })
      )
    );
    await refreshStore.clearUserJtis(userId);
  }

  async function rotate(refreshToken, metadata = {}) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error && error.name === "TokenExpiredError") {
        return { data: null, error: { code: "TOKEN_EXPIRED", statusCode: 401 } };
      }
      return { data: null, error: { code: "TOKEN_INVALID", statusCode: 401 } };
    }

    if (
      typeof payload.sub !== "string" ||
      typeof payload.jti !== "string" ||
      payload.sub.length === 0 ||
      payload.jti.length === 0
    ) {
      return { data: null, error: { code: "TOKEN_INVALID", statusCode: 401 } };
    }

    const userId = payload.sub;
    const jti = payload.jti;
    const session = await refreshStore.getByJti(jti);

    if (!session) {
      await revokeAllUserTokens(userId, "reuse-detected-missing-session");
      auditLogger.warn?.("[AUDIT] Refresh token reuse detected: missing session", {
        userId,
        jti,
        ip: metadata.ip || null,
        userAgent: metadata.userAgent || null,
      });
      return { data: null, error: { code: "TOKEN_REUSE", statusCode: 401 } };
    }

    const hashedIncoming = hashToken(refreshToken);
    const hashMatches = safeEqualHex(session.tokenHash, hashedIncoming);
    const isReused =
      !hashMatches ||
      session.revokedAt !== null ||
      session.rotatedTo !== null ||
      session.userId !== userId;

    if (isReused) {
      await revokeAllUserTokens(userId, "reuse-detected");
      auditLogger.warn?.("[AUDIT] Refresh token reuse detected", {
        userId,
        jti,
        ip: metadata.ip || null,
        userAgent: metadata.userAgent || null,
      });
      return { data: null, error: { code: "TOKEN_REUSE", statusCode: 401 } };
    }

    const nextTokens = tokenService.signTokens(userId);
    const nextPayload = decodeRefreshUnsafe(nextTokens.refresh_token);

    if (
      !nextPayload ||
      typeof nextPayload.jti !== "string" ||
      typeof nextPayload.exp !== "number"
    ) {
      return { data: null, error: { code: "TOKEN_INVALID", statusCode: 500 } };
    }

    const nextExpiresIn = Math.max(nextPayload.exp - Math.floor(Date.now() / 1000), 1);

    await refreshStore.revoke(jti, {
      reason: "rotated",
      revokedAt: new Date().toISOString(),
      rotatedTo: nextPayload.jti,
    });

    await refreshStore.save(
      {
        jti: nextPayload.jti,
        userId,
        familyId: session.familyId || session.jti,
        tokenHash: hashToken(nextTokens.refresh_token),
        rotatedTo: null,
        revokedAt: null,
        keyVersion,
        ip: metadata.ip || null,
        userAgent: metadata.userAgent || null,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(nextPayload.exp * 1000).toISOString(),
      },
      nextExpiresIn
    );

    await refreshStore.addUserJti(userId, nextPayload.jti, nextExpiresIn);
    await refreshStore.removeUserJti(userId, jti);

    return { data: nextTokens, error: null };
  }

  async function revokeFromToken(refreshToken) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return;
    }

    if (typeof payload.jti !== "string" || typeof payload.sub !== "string") return;
    await refreshStore.revoke(payload.jti, {
      reason: "logout",
      revokedAt: new Date().toISOString(),
    });
    await refreshStore.removeUserJti(payload.sub, payload.jti);
  }

  return {
    persistIssuedRefresh,
    rotate,
    revokeFromToken,
    revokeAllUserTokens,
    refreshTokenTtlSeconds: REFRESH_TTL_SECONDS,
  };
}

module.exports = {
  buildRefreshTokenService,
};
