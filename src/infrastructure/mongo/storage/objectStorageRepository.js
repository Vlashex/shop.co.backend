const { ObjectId } = require("mongodb");

function buildMongoObjectStorageRepository(db, options = {}) {
  const bucketName = options.bucketName || process.env.MONGODB_OBJECT_BUCKET || "objects";
  const objects = db.collection(bucketName);

  async function putObject({ key, body, contentType = "application/octet-stream", metadata = {} }) {
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey) {
      throw new Error("object key is required");
    }

    const now = new Date();
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body || "");
    await objects.updateOne(
      { key: normalizedKey },
      {
        $set: {
          body: buffer,
          contentType,
          metadata,
          size: buffer.length,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId(),
          key: normalizedKey,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return { key: normalizedKey, size: buffer.length, contentType };
  }

  async function getObject(key) {
    const doc = await objects.findOne({ key: String(key || "").trim() });
    if (!doc) return null;

    return {
      key: doc.key,
      body: Buffer.from(doc.body.buffer || doc.body),
      contentType: doc.contentType,
      metadata: doc.metadata || {},
      size: Number(doc.size || 0),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };
  }

  async function deleteObject(key) {
    const result = await objects.deleteOne({ key: String(key || "").trim() });
    return result.deletedCount === 1;
  }

  async function listObjects(prefix = "") {
    const normalizedPrefix = String(prefix || "");
    const query = normalizedPrefix
      ? { key: { $regex: `^${normalizedPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } }
      : {};

    return objects
      .find(query, { projection: { body: 0 } })
      .sort({ key: 1 })
      .toArray();
  }

  return {
    putObject,
    getObject,
    deleteObject,
    listObjects,
  };
}

module.exports = {
  buildMongoObjectStorageRepository,
};
