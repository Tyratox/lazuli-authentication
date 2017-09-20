/**
 * Escapes a string for a sql like query
 * @param  {String} value The string to escape
 * @return {String}       The escaped string
 */
module.exports.escapeLikeString = value => {
	return value.replace(/[\%\_]/g, "\\$&");
};
