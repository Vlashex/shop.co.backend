const crypto = require("crypto");

function buildHashService() {
  function hash(value) {
    const hash = crypto.createHash("sha256");
    hash.update(value);
    return hash.digest("hex");
  }

  function isLikelyHashed(value) {
    return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
  }

  return {
    hash,
    isLikelyHashed,
  };
}

module.exports = {
  buildHashService,
};
