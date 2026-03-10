/**
 * Core product and user contracts used across use-cases and repositories.
 * This module documents stable public shapes for long-term maintenance.
 */

/**
 * @typedef {string} ProductId
 * @typedef {string} UserId
 * @typedef {string} RefreshTokenJti
 */

/**
 * @typedef {Object} ProductAttributes
 * @property {string[]} sizes
 * @property {string[]} styles
 * @property {string[]} colors
 */

/**
 * @typedef {Object} ProductPricing
 * @property {number} current
 * @property {number} previous
 */

/**
 * @typedef {Object} ProductVariant
 * @property {string} id
 * @property {string} size
 * @property {string} style
 * @property {string} color
 * @property {number} price
 * @property {number} stock
 */

/**
 * @typedef {Object} Product
 * @property {ProductId} id
 * @property {string} title
 * @property {ProductPricing} pricing
 * @property {number} rating
 * @property {string} category
 * @property {string[]} images
 * @property {ProductAttributes} attributes
 * @property {ProductVariant[]} variants
 */

/**
 * Public API DTO currently returned by HTTP handlers.
 *
 * @typedef {Object} ProductDto
 * @property {ProductId} id
 * @property {string} title
 * @property {number} price
 * @property {number} previousPrice
 * @property {number} rate
 * @property {string} category
 * @property {string[]} images
 * @property {string[]} sizes
 * @property {string[]} styles
 * @property {string[]} colors
 * @property {ProductVariant[]} variants
 */

/**
 * @typedef {Object} CreateProductInput
 * @property {string} title
 * @property {number} price
 * @property {number} [previousPrice]
 * @property {number} rate
 * @property {string} category
 * @property {string[]} [images]
 * @property {string[]} [sizes]
 * @property {string[]} [styles]
 * @property {string[]} [colors]
 * @property {ProductVariant[]} [variants]
 */

/**
 * @typedef {Object} UpdateProductInput
 * @property {string} [title]
 * @property {number} [price]
 * @property {number} [previousPrice]
 * @property {number} [rate]
 * @property {string} [category]
 * @property {string[]} [images]
 * @property {string[]} [sizes]
 * @property {string[]} [styles]
 * @property {string[]} [colors]
 * @property {ProductVariant[]} [variants]
 */

/**
 * @typedef {Object} CartItem
 * @property {ProductId} productId
 * @property {number} quantity
 */

/**
 * @typedef {Object} User
 * @property {UserId} id
 * @property {string} email
 * @property {string} name
 * @property {CartItem[]} cartItems
 */

/**
 * Backward-compatible user DTO used by existing API consumers.
 *
 * @typedef {Object} UserDto
 * @property {UserId} id
 * @property {string} email
 * @property {string} name
 * @property {string[]} cart
 * @property {CartItem[]} cartItems
 */

/**
 * @typedef {Object} CreateUserInput
 * @property {string} email
 * @property {string} name
 * @property {string} password
 */

/**
 * @typedef {Object} UpdateUserInput
 * @property {string} [email]
 * @property {string} [name]
 * @property {string} [password]
 */

/**
 * @typedef {Object} Tokens
 * @property {string} access_token
 * @property {string} refresh_token
 */

/**
 * Persistence model stored in `refresh_tokens`.
 *
 * @typedef {Object} RefreshSession
 * @property {RefreshTokenJti} jti
 * @property {UserId} userId
 * @property {string} familyId
 * @property {string} tokenHash
 * @property {string|null} rotatedTo
 * @property {string|null} revokedAt
 * @property {string} keyVersion
 * @property {string|null} ip
 * @property {string|null} userAgent
 * @property {string} createdAt
 * @property {string} expiresAt
 * @property {string|null} [reason]
 */

/**
 * @typedef {"created"|"paid"|"fulfilled"|"canceled"} OrderStatus
 */

/**
 * @typedef {Object} OrderItemInput
 * @property {ProductId} productId
 * @property {string} variantId
 * @property {number} quantity
 */

/**
 * @typedef {Object} OrderItem
 * @property {ProductId} productId
 * @property {string} variantId
 * @property {string} productTitle
 * @property {{size: string, style: string, color: string}} variant
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} lineTotal
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {UserId} userId
 * @property {OrderStatus} status
 * @property {OrderItem[]} items
 * @property {number} totalPrice
 * @property {string} createdAt
 * @property {string} updatedAt
 */

module.exports = {};
