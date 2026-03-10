const {
  toRefreshSessionDocument,
  toRefreshSessionDto,
} = require("../mappers/refreshSessionMapper");

function buildMongoRefreshTokenRepository(collections) {
  const { refreshTokens } = collections;

  async function getByJti(jti) {
    const doc = await refreshTokens.findOne({ jti });
    return toRefreshSessionDto(doc);
  }

  async function save(session) {
    const doc = toRefreshSessionDocument(session);

    await refreshTokens.updateOne(
      { jti: doc.jti },
      { $set: doc, $setOnInsert: { createdAt: doc.createdAt } },
      { upsert: true }
    );
  }

  async function revoke(jti, patch = {}) {
    const updates = {};

    if (patch.reason !== undefined) updates.reason = patch.reason;
    if (patch.revokedAt !== undefined) updates.revokedAt = patch.revokedAt;
    if (patch.rotatedTo !== undefined) updates.rotatedTo = patch.rotatedTo;
    updates.updatedAt = new Date();

    await refreshTokens.updateOne({ jti }, { $set: updates });
  }

  async function listActiveByUserId(userId) {
    const now = new Date();
    const docs = await refreshTokens
      .find({
        userId,
        revokedAt: null,
        expiresAt: { $gt: now },
      })
      .project({ jti: 1 })
      .toArray();

    return docs.map((doc) => doc.jti).filter(Boolean);
  }

  return {
    getByJti,
    save,
    revoke,
    listActiveByUserId,
  };
}

module.exports = {
  buildMongoRefreshTokenRepository,
};
