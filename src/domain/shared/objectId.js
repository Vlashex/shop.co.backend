function isObjectIdString(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

function normalizeObjectIdString(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return isObjectIdString(trimmed) ? trimmed : "";
}

module.exports = {
  isObjectIdString,
  normalizeObjectIdString,
};