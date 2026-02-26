const { ObjectId } = require("mongodb");
const { normalizeObjectIdString } = require("../../domain/shared/objectId");

function toObjectIdOrNull(value) {
  const normalized = normalizeObjectIdString(value);
  if (!normalized) return null;
  return new ObjectId(normalized);
}

module.exports = {
  toObjectIdOrNull,
};