function calculatePreviousPrice(price, explicitPreviousPrice) {
  if (explicitPreviousPrice !== undefined) {
    return Number(explicitPreviousPrice);
  }

  return Number((Number(price) * 1.2).toFixed(2));
}

module.exports = {
  calculatePreviousPrice,
};