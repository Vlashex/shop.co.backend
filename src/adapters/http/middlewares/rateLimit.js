function buildRateLimiter({ windowMs, maxRequests }) {
  const hits = new Map();

  function cleanup(now) {
    for (const [key, value] of hits.entries()) {
      if (now - value.windowStartedAt >= windowMs) {
        hits.delete(key);
      }
    }
  }

  function consume(key) {
    const now = Date.now();
    cleanup(now);

    const current = hits.get(key);
    if (!current || now - current.windowStartedAt >= windowMs) {
      hits.set(key, { count: 1, windowStartedAt: now });
      return { allowed: true, remaining: Math.max(maxRequests - 1, 0), retryAfter: 0 };
    }

    if (current.count >= maxRequests) {
      const retryAfterMs = windowMs - (now - current.windowStartedAt);
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.max(Math.ceil(retryAfterMs / 1000), 1),
      };
    }

    current.count += 1;
    hits.set(key, current);
    return {
      allowed: true,
      remaining: Math.max(maxRequests - current.count, 0),
      retryAfter: 0,
    };
  }

  return { consume };
}

module.exports = {
  buildRateLimiter,
};
