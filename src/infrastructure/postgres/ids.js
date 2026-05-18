const { ObjectId } = require("mongodb");
const { normalizeObjectIdString } = require("../../domain/shared/objectId");

function makeEntityId() {
  return new ObjectId().toString();
}

function normalizeEntityId(value) {
  return normalizeObjectIdString(value);
}

module.exports = {
  makeEntityId,
  normalizeEntityId,
};
