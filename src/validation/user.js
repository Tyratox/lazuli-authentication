const Joi = require("joi");
const { LOCALES } = require("lazuli-require")("lazuli-config");

module.exports = {
	id: Joi.number()
		.integer()
		.positive(),

	nameDisplay: Joi.string()
		.regex(/[A-z]+/)
		.max(511),
	nameFirst: Joi.string()
		.regex(/[A-z]+/)
		.max(255),
	nameLast: Joi.string()
		.regex(/[A-z]+/)
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

	facebook: {
		accessToken: Joi.string().allow("", null),
		refreshToken: Joi.string().allow("", null)
	},

	google: {
		accessToken: Joi.string().allow("", null),
		refreshToken: Joi.string().allow("", null)
	},

	profilePictureId: Joi.number()
		.integer()
		.positive()
		.allow(null),

	newPassword: Joi.boolean().allow("", null),

	newEmail: Joi.string()
		.email()
		.allow("", null)
};
