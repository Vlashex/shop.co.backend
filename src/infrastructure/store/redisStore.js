const { createClient } = require("redis");

const RT_PREFIX = "rt";
const USER_RT_PREFIX = "rtu";

function keyByJti(jti) {
  return `${RT_PREFIX}:${jti}`;
}

function userJtiKey(userId) {
  return `${USER_RT_PREFIX}:${userId}`;
}

function buildRedisRefreshTokenStore(client) {
  // Session schema example (stored at key `rt:{jti}`):
  // { jti, userId, familyId, tokenHash, rotatedTo, revokedAt, keyVersion, ip, userAgent, createdAt, expiresAt }
  async function getByJti(jti) {
    const payload = await client.get(keyByJti(jti));
    if (!payload) return null;
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  async function save(session, ttlSeconds) {
    await client.set(keyByJti(session.jti), JSON.stringify(session), {
      EX: ttlSeconds,
    });
  }

  async function revoke(jti, patch) {
    const session = await getByJti(jti);
    if (!session) return;
    const ttl = await client.ttl(keyByJti(jti));
    if (ttl <= 0) return;
    const next = { ...session, ...patch };
    await client.set(keyByJti(jti), JSON.stringify(next), { EX: ttl });
  }

  async function addUserJti(userId, jti, ttlSeconds) {
    const key = userJtiKey(userId);
    await client.sAdd(key, jti);
    await client.expire(key, ttlSeconds);
  }

  async function removeUserJti(userId, jti) {
    await client.sRem(userJtiKey(userId), jti);
  }

  async function getUserJtis(userId) {
    return client.sMembers(userJtiKey(userId));
  }

  async function clearUserJtis(userId) {
    await client.del(userJtiKey(userId));
  }

  return {
    getByJti,
    save,
    revoke,
    addUserJti,
    removeUserJti,
    getUserJtis,
    clearUserJtis,
  };
}

async function buildRedisStore() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL is required");
  }

  const client = createClient({ url: redisUrl });
  client.on("error", (error) => {
    console.error("[REDIS] client error", error);
  });

  await client.connect();

  return {
    client,
    refreshTokenStore: buildRedisRefreshTokenStore(client),
  };
}

module.exports = {
  buildRedisStore,
};
