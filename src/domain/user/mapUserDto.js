function mapUserDto(row) {
  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    cart: Array.isArray(row.cart) ? row.cart : [],
  };
}

module.exports = {
  mapUserDto,
};