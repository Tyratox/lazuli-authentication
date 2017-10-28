/**
 * Small object utilities
 * @module lazuli-authentication/utilities/object
 */

/**
 * Picks selected keys from an object
 * @param  {object} obj The object to pick the keys from
 * @param  {array} keys The array of keys to pick
 * @return {object} The new object only containing the picked keys
 */
module.exports.pick = (obj, keys) => {
	let o = {};
	keys.forEach(key => {
		o[key] = key in obj ? obj[key] : undefined;
	});

	return o;
};
