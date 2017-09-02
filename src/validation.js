const { LOCALES } = require("lazuli-require")("lazuli-config");

const Joi = require("joi");

module.exports.localLoginValidation = {
	body: {
		username: Joi.string().email().required(),
		password: Joi.string().required()
	}
};

module.exports.initPasswordResetValidation = {
	body: {
		email: Joi.string().email().required()
	}
};

module.exports.passwordResetValidation = {
	body: {
		email: Joi.string().email().required(),
		resetCode: Joi.string().required(),
		password: Joi.string().min(8).max(255)
	}
};

module.exports.localRegistrationValidation = {
	body: {
		firstName: Joi.string().regex(/[A-z]+/).min(2).max(256).required(),
		email: Joi.string().email().required(),
		locale: Joi.string().regex(new RegExp(LOCALES.join("|")))
	}
};

module.exports.verifyMailValidation = {
	body: {
		email: Joi.string().email().required(),
		emailVerificationCode: Joi.string().required(),
		password: Joi.string().min(8).max(255).allow("", null),
		register: Joi.boolean().required()
	}
};
