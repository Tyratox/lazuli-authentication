const Joi = require("joi");

/**
 * Validates the graphql input for an oauth client type in detail
 * @module lazuli-authentication/graphql-validation/oauth-client
 * 
 * @see module:lazuli-authentication/types/oauth-client.OauthClientType
 */

/**
 * The joi validation object
 * @type {object}
 */
module.exports = {
	id: Joi.number()
		.integer()
		.positive(),

	name: Joi.string()
		.regex(/[A-z]+/)
		.max(511),
	oauthRedirectUris: Joi.array().items(
		Joi.string().uri({ scheme: ["https", "http"] })
	),
	userId: Joi.number()
		.integer()
		.positive(),
	trusted: Joi.boolean()
};
