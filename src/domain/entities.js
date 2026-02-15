function createUser({ id, email, name }) {
  return {
    id,
    email,
    name,
    cart: [],
  };
}

function createProduct({
  id,
  title,
  price,
  rate,
  images,
  category = "",
  sizes = [],
  styles = [],
  colors = [],
}) {
  return {
    id,
    title,
    price,
    previousPrice: price * 1.2,
    rate,
    images,
    category,
    sizes,
    styles,
    colors,
  };
}

module.exports = {
  createUser,
  createProduct,
};
