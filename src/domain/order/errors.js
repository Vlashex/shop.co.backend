class OrderDomainError extends Error {
  constructor(code, message, statusCode, details = null) {
    super(message);
    this.name = "OrderDomainError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = {
  OrderDomainError,
};
