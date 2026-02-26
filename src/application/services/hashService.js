const argon2 = require("argon2");
const pLimitModule = require("p-limit");
const pLimit = pLimitModule.default || pLimitModule;

const MAX_CONCURRENT_HASHES = 4; // подобрать под сервер
const HASH_TIMEOUT_MS = 5000;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Hash timeout")), ms)
    ),
  ]);
}

function buildHashService() {
  const PEPPER = getRequiredEnv("PASSWORD_PEPPER");

  const limit = pLimit(MAX_CONCURRENT_HASHES);

  async function hash(value) {
    return limit(() =>
      withTimeout(
        argon2.hash(value + PEPPER, {
          type: argon2.argon2id,
          memoryCost: 2 ** 16,
          timeCost: 4,
          parallelism: 1,
        }),
        HASH_TIMEOUT_MS
      )
    );
  }

  async function verify(value, storedHash) {
    return limit(() =>
      withTimeout(
        argon2.verify(storedHash, value + PEPPER),
        HASH_TIMEOUT_MS
      )
    );
  }

  return { hash, verify };
}

module.exports = { buildHashService };