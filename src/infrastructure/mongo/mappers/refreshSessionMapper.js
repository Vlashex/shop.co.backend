function toRefreshSessionDocument(session) {
  return {
    jti: session.jti,
    userId: session.userId,
    familyId: session.familyId,
    tokenHash: session.tokenHash,
    rotatedTo: session.rotatedTo ?? null,
    revokedAt: session.revokedAt ?? null,
    keyVersion: session.keyVersion,
    ip: session.ip ?? null,
    userAgent: session.userAgent ?? null,
    reason: session.reason ?? null,
    createdAt: new Date(session.createdAt),
    expiresAt: new Date(session.expiresAt),
    updatedAt: new Date(),
  };
}

function toRefreshSessionDto(doc) {
  if (!doc) return null;

  return {
    jti: doc.jti,
    userId: doc.userId,
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
