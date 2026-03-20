const {
  toRefreshSessionDocument,
  toRefreshSessionDto,
} = require("../mappers/refreshSessionMapper");
const { toObjectIdOrNull } = require("../objectId");

function toDateOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildMongoRefreshTokenRepository(collections) {
  const { refreshTokens } = collections;

  async function getByJti(jti) {
    const doc = await refreshTokens.findOne({ jti });
    return toRefreshSessionDto(doc);
  }

  async function save(session) {
    const doc = toRefreshSessionDocument(session);

    const { createdAt, ...updateFields } = doc;

    await refreshTokens.updateOne(
      { jti: doc.jti },
      {
        $set: {
          ...updateFields,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt,
        },
      },
      { upsert: true },
    );
  }

  async function revoke(jti, patch = {}) {
    const existing = await refreshTokens.findOne({ jti }, { projection: { userId: 1 } });
    const updates = {};

    if (patch.reason !== undefined) updates.reason = patch.reason;
    if (patch.revokedAt !== undefined) updates.revokedAt = toDateOrNull(patch.revokedAt);
    if (patch.rotatedTo !== undefined) updates.rotatedTo = patch.rotatedTo;

    if (existing?.userId !== undefined && existing?.userId !== null) {
      const normalizedUserId = toObjectIdOrNull(existing.userId);
      if (normalizedUserId) {
        updates.userId = normalizedUserId;
      }
    }

    updates.updatedAt = new Date();

    await refreshTokens.updateOne({ jti }, { $set: updates });
  }

  async function listActiveByUserId(userId) {
    const userObjectId = toObjectIdOrNull(userId);
    if (!userObjectId) return [];

    const now = new Date();
    const docs = await refreshTokens
      .find({
        userId: userObjectId,
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
