function toDateIsoOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeSession(session) {
  if (!session) return null;

  return {
    jti: session.jti,
    userId: session.userId,
    familyId: session.familyId,
    tokenHash: session.tokenHash,
    rotatedTo: session.rotatedTo ?? null,
    revokedAt: toDateIsoOrNull(session.revokedAt),
    keyVersion: session.keyVersion || "v1",
    ip: session.ip ?? null,
    userAgent: session.userAgent ?? null,
    reason: session.reason ?? null,
    createdAt: new Date(session.createdAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString(),
  };
}

function secondsUntil(dateValue) {
  const expiresAt = new Date(dateValue).getTime();
  if (Number.isNaN(expiresAt)) return 0;
  return Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000));
}

function buildRedisRefreshTokenRepository(redis) {
  const sessionKey = (jti) => `refresh:session:${jti}`;
  const userSetKey = (userId) => `refresh:user:${userId}`;

  async function getByJti(jti) {
    const raw = await redis.get(sessionKey(jti));
    if (!raw) return null;

    try {
      return normalizeSession(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async function save(session) {
    const normalized = normalizeSession(session);
    const ttl = secondsUntil(normalized.expiresAt);

    await redis
      .multi()
      .set(sessionKey(normalized.jti), JSON.stringify(normalized), { EX: ttl })
      .sAdd(userSetKey(normalized.userId), normalized.jti)
      .expire(userSetKey(normalized.userId), ttl)
      .exec();
  }

  async function revoke(jti, patch = {}) {
    const existing = await getByJti(jti);
    if (!existing) return;

    const next = {
      ...existing,
      reason: patch.reason !== undefined ? patch.reason : existing.reason,
      revokedAt: patch.revokedAt !== undefined ? toDateIsoOrNull(patch.revokedAt) : existing.revokedAt,
      rotatedTo: patch.rotatedTo !== undefined ? patch.rotatedTo : existing.rotatedTo,
    };

    await save(next);
  }

  async function listActiveByUserId(userId) {
    const jtis = await redis.sMembers(userSetKey(userId));
    const now = Date.now();
    const sessions = await Promise.all(jtis.map(getByJti));

    return sessions
      .filter((session) => {
        if (!session) return false;
        if (session.revokedAt !== null) return false;
        return new Date(session.expiresAt).getTime() > now;
      })
      .map((session) => session.jti);
  }

  return {
    getByJti,
    save,
    revoke,
    listActiveByUserId,
  };
}

module.exports = {
  buildRedisRefreshTokenRepository,
};
