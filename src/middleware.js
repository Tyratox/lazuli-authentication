const Promise = require("bluebird");
const { validate } = require("lazuli-require")("lazuli-core/express");

const User = require("./models/user");
const { passport } = require("./passport");

const {
	login,
	clientLogin,
	registration,
	initPasswordReset,
	passwordReset,
	emailVerification
} = require("./validation");

/**
 * A set of general authentication middlewares
 * @module lazuli-authentication/middleware
 */

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
	validate(passwordReset),
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
					return next(new Error("The password reset code was invalid!"));
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
	validate(initPasswordReset),
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
						new Error("The given email is not registered!")
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
	validate(emailVerification),
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
	validate(registration),
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
	validate(login),
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
	validate(clientLogin),
	passport.authenticate("local-client", { session: false })
];

/**
 * Express middleware that checks whether the user is currently logged in
 * If an error is passed to the callback, the authentication failed.
 * @param  {object} request The express request object
 * @param  {object} response The express response object
 * @param  {function} next The middleware callback function
 * @return {void}
 */
module.exports.isUserLoggedIn = (request, response, next) => {
	if (request.user && request.user.get("id")) {
		return next();
	} else {
		next(new Error("Unauthorized"));
	}
};
