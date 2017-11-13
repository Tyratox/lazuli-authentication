const crypto = require("crypto");

const { HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-config");

/**
 * Crypto utilities
 * @module lazuli-authentication/utilities/crypto
 */

/**
 * Generates random string of characters
 * @function generateRandomString
 * @param {number} length Length of the random string.
 * @return {string} A random string of a given length
 */
const generateRandomString = length => {
	return crypto
		.randomBytes(length)
		.toString("base64")
		.slice(0, length);
};

module.exports.generateRandomString = generateRandomString;

/**
 * Generates random alphanumeric string of characters
 * @function generateRandomAlphanumString
 * @param {number} length Length of the random string.
 * @return {string} A random string of a given length
 */
const generateRandomAlphanumString = length => {
	return crypto
		.randomBytes(length)
		.toString("hex")
		.slice(0, length);
};

module.exports.generateRandomAlphanumString = generateRandomAlphanumString;

/**
 * Hash data
 * @function generateHash
 * @param {string} data The data to hash
 * @param {string} [salt=null] The salt which should be used
 * @param {string} [algorithm=HASH_ALGORITHM] The hash algorithm that should be used
 * @return {object} The hashed string, the generated salt and the
 * used hash algorithm {hash: '', salt: '', algorithm: ''}
 */
const generateHash = (data, salt = null, algorithm = HASH_ALGORITHM) => {
	if (!salt && salt !== false) {
		salt = generateRandomString(SALT_LENGTH);
	}

	let hmacOrHash;

	if (salt) {
		hmacOrHash = crypto.createHmac(algorithm, salt);
	} else {
		hmacOrHash = crypto.createHash(algorithm);
	}

	hmacOrHash.update(data);

	return { hash: hmacOrHash.digest("hex"), salt: salt, algorithm: algorithm };
};

module.exports.generateHash = generateHash;
