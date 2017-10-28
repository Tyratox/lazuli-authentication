/**
 * Sql utilities
 * @module lazuli-authentication/utilities/sql
 */

/**
 * Escapes a string for a sql like query
 * @param  {string} value The string to escape
 * @return {string} The escaped string
 */
module.exports.escapeLikeString = value => {
	return value.replace(/[\%\_]/g, "\\$&");
};
