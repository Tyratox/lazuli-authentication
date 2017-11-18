const Promise = require("bluebird");
const { celebrate, Joi } = require("celebrate");

const CsrfToken = require("lazuli-core/models/csrf-token");
const OperationalError = require("lazuli-core/operational-error");

const { LOCALES, HTTP_ORIGIN } = require("lazuli-config");

const User = require("./models/user");
const { passport } = require("./passport");

/**
 * A set of general authentication middlewares
 * @module lazuli-authentication/middleware
 */

/**
 * Express middleware that checks whether the user is currently logged in
 * If an error is passed to the callback, the authentication failed.
 * @param  {object} request The express request object
 * @param  {object} response The express response object
 * @param  {function} next The middleware callback function
 * @return {void}
 */
const isUserLoggedIn = (request, response, next) => {
	if (request.user && request.user.get("id")) {
		return next();
	} else {
		next(new OperationalError("Unauthorized"));
	}
};
module.exports.isUserLoggedIn = isUserLoggedIn;

/**
 * Express middleware that verifies csrf tokens
 * Also fails if the user isn't authenticated as this makes
 * csrf tokens useless
 * @type {Array}
 */
const verifyCsrfToken = [
	isUserLoggedIn,
	(request, response, next) => {
		CsrfToken.verifyToken(request.body.csrfToken, request.user.get("id"))
			.then(() => {
				next();
			})
			.catch(() => {
				next(new OperationalError("Invalid csrf token!"));
			});
	}
];
module.exports.verifyCsrfToken = verifyCsrfToken;

/**
 * Express middleware that checks verifies that the request
 * comes from the server itself
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function
 */
const verifySameOrigin = (request, response, next) => {
	if (request.get("origin") === HTTP_ORIGIN) {
		return next();
	}

	next(new OperationalError("The origin header didn't match"));
};
module.exports.verifySameOrigin = verifySameOrigin;

/**
 * An express middleware that resets a users password
 * If the next middleware is called with an error object, the
 * password reset failed.
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function 
 * @return {void}
 */
module.exports.passwordReset = [
	verifySameOrigin,
	celebrate({
		body: {
			email: Joi.string()
				.email()
				.required(),
			resetCode: Joi.string().required(),
			password: Joi.string()
				.min(8)
				.max(255)
		}
	}),
	(request, response, next) => {
		User.findOne({
			where: { emailVerified: request.body.email }
		})
			.then(user => {
				if (user) {
					user
						.updatePassword(request.body.password, request.body.resetCode)
						.then(() => next())
						.catch(next);
				} else {
					//Return always the same error to not leak whether this email
					//is registered
					return next(
						new OperationalError("The password reset code was invalid!")
					);
				}
			})
			.catch(next);
	}
];

/**
 * An express middleware that initiates a passwort reset
 * If the next middleware is called with an error object, the
 * initialization failed.
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function
 * @return {void}
 */
module.exports.initPasswordReset = [
	verifySameOrigin,
	celebrate({
		body: {
			email: Joi.string()
				.email()
				.required()
		}
	}),
	(request, response, next) => {
		User.findOne({
			where: { emailVerified: request.body.email }
		})
			.then(user => {
				if (user) {
					user
						.initPasswordReset()
						.then(() => next())
						.catch(next);
				} else {
					return Promise.reject(
						new OperationalError("The given email is not registered!")
					);
				}
			})
			.catch(next);
	}
];

/**
 * An express middleware that verifies the users email
 * If an error is passed to the callback, the verification failed.
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function 
 * @return {void}
 */
module.exports.verifyEmail = [
	verifySameOrigin,
	celebrate({
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
	}),
	(request, response, next) => {
		const { email, password, emailVerificationCode } = request.body;

		User.findOne({ where: { emailUnverified: email } })
			.then(user => {
				return user.verifyEmail(email, emailVerificationCode).then(() => {
					if (password) {
						//during registration the password reset code is set equal to the email
						//verification code
						return user
							.updatePassword(password, emailVerificationCode)
							.then(() => next());
					} else {
						next();
					}
				});
			})
			.catch(next);
	}
];

/**
 * An express middleware that registers a user
 * If an error is passed to the callback, the registration failed.
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function 
 * @return {void}
 */
module.exports.registration = [
	verifySameOrigin,
	celebrate({
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
	}),
	(request, response, next) => {
		let { nameFirst, email, locale } = request.body;

		if (!locale) {
			locale = request.getLocale().toLowerCase();
		}

		User.register(nameFirst, email, locale)
			.then(() => next())
			.catch(next);
	}
];

/**
 * Express middleware for bearer authentication
 * @param  {object} request The express request object
 * @param  {object} response The express response object
 * @param  {function} next The middleware callback function
 * @return {void}
 */
module.exports.authenticateBearer = [
	passport.authenticate("bearer", { session: false })
];

/**
 * Express middleware for bearer authentication. Doesn't error if
 * the login wasn't possible
 * @param  {object} request The express request object
 * @param  {object} response The express response object
 * @param  {function} next The middleware callback function
 * @return {void}
 */
module.exports.authenticateBearerSoft = [
	(request, response, next) => {
		return passport.authenticate(
			"bearer",
			{ session: false },
			(err, user, info) => {
				if (err) {
					return next(err);
				}
				if (user) {
					return request.logIn(user, next);
				}

				next();
			}
		)(request, response, next);
	}
];

/**
 * Express middleware for local authentication
 * If an error is passed to the callback, the authentication failed.
 * @param  {object} request The express request object
 * @param  {object} response The express response object
 * @param  {function} next The middleware callback function
 * @return {void}
 */
module.exports.authenticateUser = [
	verifySameOrigin,
	celebrate({
		body: {
			email: Joi.string()
				.email()
				.required(),
			password: Joi.string().required()
		}
	}),
	passport.authenticate("local-user")
];

/**
 * Express middleware for local oauth client authentication
 * If an error is passed to the callback, the authentication failed.
 * @param  {object} request The express request object
 * @param  {object} response The express response object
 * @param  {function} next The middleware callback function
 * @return {void}
 */
module.exports.authenticateOauthClient = [
	celebrate({
		body: {
			clientId: Joi.number().required(),
			clientSecret: Joi.string().required(),
			code: Joi.string(),
			grant_type: Joi.string()
		}
	}),
	passport.authenticate("local-client", { session: false })
];
