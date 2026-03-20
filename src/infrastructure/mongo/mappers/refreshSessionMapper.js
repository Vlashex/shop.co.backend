const { toObjectIdOrNull } = require("../objectId");

function toDateOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateOrNow(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toRefreshSessionDocument(session) {
  const userObjectId = toObjectIdOrNull(session.userId);
  if (!userObjectId) {
    throw new Error("refresh session userId must be a valid ObjectId");
  }

  return {
    jti: session.jti,
    userId: userObjectId,
    familyId: session.familyId,
    tokenHash: session.tokenHash,
    rotatedTo: session.rotatedTo ?? null,
    revokedAt: toDateOrNull(session.revokedAt),
    keyVersion: session.keyVersion || "v1",
    ip: session.ip ?? null,
    userAgent: session.userAgent ?? null,
    reason: session.reason ?? null,
    createdAt: toDateOrNow(session.createdAt),
    expiresAt: toDateOrNow(session.expiresAt),
    updatedAt: new Date(),
  };
}

function toRefreshSessionDto(doc) {
  if (!doc) return null;

  return {
    jti: doc.jti,
    userId:
      doc.userId && typeof doc.userId.toString === "function"
        ? doc.userId.toString()
        : String(doc.userId || ""),
    familyId: doc.familyId,
    tokenHash: doc.tokenHash,
    rotatedTo: doc.rotatedTo ?? null,
    revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
    keyVersion: doc.keyVersion,
    ip: doc.ip ?? null,
    userAgent: doc.userAgent ?? null,
    reason: doc.reason ?? null,
    createdAt: new Date(doc.createdAt).toISOString(),
    expiresAt: new Date(doc.expiresAt).toISOString(),
  };
}

module.exports = {
  toRefreshSessionDocument,
  toRefreshSessionDto,
};
