/**
 * Picks selected keys from an object
 * @param  {Object} obj  The object to pick the keys from
 * @param  {Array} keys  The array of keys to pick
 * @return {Object}      The new object only containing the picked keys
 */
module.exports.pick = (obj, keys) => {
	let o = {};
	keys.forEach(key => {
		o[key] = key in obj ? obj[key] : undefined;
	});

	return o;
};
