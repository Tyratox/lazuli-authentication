const crypto = require("crypto");

/**
 * Generates random string of characters
 * @function generateRandomString
 * @param {number} length Length of the random string.
 * @return {String} A random string of a given length
 */
module.exports.generateRandomString = length => {
	return crypto
		.randomBytes(length)
		.toString("base64")
		.slice(0, length);
};

/**
 * Hash data
 * @function generateHash
 * @param {string} data The data to hash
 * @param {string} [salt=null] The salt which should be used
 * @param {string} algorithm The hash algorithm that should be used
 * @param {number} saltLength How long the random salt should be
 * @return {Object} The hashed string, the generated salt and the
 * used hash algorithm {hash: '', salt: '', algorithm: ''}
 */
module.exports.generateHash = (data, salt = null, algorithm, saltLength) => {
	if (!salt && salt !== false) {
		salt = generateRandomString(saltLength);
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
