const Joi = require("joi");

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
