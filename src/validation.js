const { LOCALES } = require("lazuli-require")("lazuli-config");

const Joi = require("joi");

module.exports.login = {
	body: {
		email: Joi.string()
			.email()
			.required(),
		password: Joi.string().required()
	}
};

module.exports.clientLogin = {
	body: {
		clientId: Joi.number().required(),
		clientSecret: Joi.string().required()
	}
};

module.exports.initPasswordReset = {
	body: {
		email: Joi.string()
			.email()
			.required()
	}
};

module.exports.passwordReset = {
	body: {
		email: Joi.string()
			.email()
			.required(),
		resetCode: Joi.string().required(),
		password: Joi.string()
			.min(8)
			.max(255)
	}
};

module.exports.registration = {
	body: {
		nameFirst: Joi.string()
			.regex(/[A-z]+/)
			.min(2)
			.max(256)
			.required(),
		email: Joi.string()
			.email()
			.required(),
		locale: Joi.string().regex(new RegExp(LOCALES.join("|")))
	}
};

module.exports.emailVerification = {
	body: {
		email: Joi.string()
			.email()
			.required(),
		emailVerificationCode: Joi.string().required(),
		password: Joi.string()
			.min(8)
			.max(255)
			.allow("", null)
	}
};
