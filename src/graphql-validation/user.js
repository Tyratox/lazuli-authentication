const Joi = require("joi");
const { LOCALES } = require("lazuli-require")("lazuli-config");

module.exports = {
	id: Joi.number()
		.integer()
		.positive(),

	nameDisplay: Joi.string()
		.alphanum()
		.max(511),
	nameFirst: Joi.string()
		.alphanum()
		.max(255),
	nameLast: Joi.string()
		.alphanum()
		.max(255),

	emailVerified: Joi.string()
		.email()
		.allow(null),
	emailUnverified: Joi.string()
		.email()
		.allow(null),
	emailVerificationCode: Joi.string().allow(null),

	passwordHash: Joi.string().allow(null),
	passwordSalt: Joi.string().allow(null),
	passwordAlgorithm: Joi.string().allow(null),

	passwordResetCode: Joi.string().allow(null),
	passwordResetCodeExpirationDate: Joi.date().allow(null),

	permissions: Joi.array().items(Joi.string().max(255)),

	locale: Joi.string().valid(LOCALES),
	placeOfResidence: Joi.string().allow("", null),

	created: Joi.date(),

	oauthProviders: Joi.array().items(
		Joi.object().keys({
			type: Joi.string().valid("facebook", "google"),
			accessToken: Joi.string(),
			refreshToken: Joi.string()
		})
	),

	profilePictureId: Joi.number()
		.integer()
		.positive()
		.allow(null)
};
