/**
 * @typedef {Object} Register
 * @property {string} email
 * @property {string} name
 * @property {string} password
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {string[]} cart
 */

/**
 * @typedef {Object} Tokens
 * @property {string} access_token
 * @property {string} refresh_token
 */

/**
 * @typedef {Object} Auth
 * @property {User|null} user
 * @property {Tokens|null} tokens
 */

/**
 * @typedef {Object} NewProduct
 * @property {string} title
 * @property {number} price
 * @property {number} rate
 * @property {string} category
 * @property {string[]} images
 * @property {string[]} [sizes]
 * @property {string[]} [styles]
 * @property {string[]} [colors]
 */

/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} title
 * @property {number} price
 * @property {number} previousPrice
 * @property {number} rate
 * @property {string[]} images
 * @property {string} category
 * @property {string[]} sizes
 * @property {string[]} styles
 * @property {string[]} colors
 */

/**
 * @typedef {Object} Filters
 * @property {number} page
 * @property {string[]} categorys
 * @property {string} price
 * @property {string[]} colors
 * @property {string[]} sizes
 * @property {string[]} styles
 */

module.exports = {};