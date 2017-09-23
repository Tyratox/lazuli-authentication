const request = require("request-promise-native");

module.exports = function({ url, headers }) {
	if (!url) throw new Error("url parameter is missing!");

	return {
		query: (query, variables) => {
			return request.post(url, { json: { query, variables }, headers });
		}
	};
};
