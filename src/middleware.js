const { validate } = require("lazuli-require")("lazuli-core/express");

const User = require("./models/user");
const { passport } = require("./passport");

const {
	registration,
	initPasswordReset,
	passwordReset
} = require("./validation");

/**
 * A set of general authentication middlewares
 * @module lazuli-authentication/middleware
 */

/**
 * Generates a middleware that checks for the passed permissions
 * @param  {array} permissions The express request object
 * @return {function} The express middleware generator accepting a permissions array
 */
module.exports.isBearerAuthenticated = (permissions = []) => {
	return (request, response, next) => {
		request.requiredPermissions = permissions;

		passport.authenticate("bearer", { session: false }, (err, user, info) => {
			if (err) {
				return next(err);
			}

			if (!user) {
				return next(new Error("The sent access token is invalid!"));
			}

			request.logIn(user, next);
		})(request, response, next);
	};
};

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
 * Express middleware that does the last authentication step
 * If an error is passed to the callback, the authentication failed.
 * request.session.requestedUrl may contain the url, the user first
 * tried to access.
 * @param  {object}   err An error object
 * @param  {object}   request The express request object
 * @param  {object}   response The express response object
 * @param  {object}   user The passport user
 * @param  {function} next The middleware callback function
 * @return {void}
 */
const auth = (err, request, response, user, next) => {
	if (err) {
		return next(err);
	}

	if (!user) {
		return next(new Error("Couldn't find a user!"));
	}

	request.logIn(user, next);
};

/**
 * An express middleware that verifies the users email
 * If an error is passed to the callback, the verification failed.
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function 
 * @return {void}
 */
module.exports.verifyEmail = (request, response, next) => {
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
};

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
 * Middleware to check whether the user is authenticated.
 * Returns an error and sets `request.session.requestedUrl` to
 * `request.url` if the authentication failed.
 * @param  {object}   request  The express request object
 * @param  {object}   response The express response object
 * @param  {function} next     The middleware callback function
 * @return {void}
 */
module.exports.isAuthenticated = (request, response, next) => {
	if (request.user) {
		next();
	} else {
		request.session.requestedUrl = request.url;
		return next(new Error("Unauthenticated"));
	}
};

/**
 * Express middleware for local authentication
 * If an error is passed to the callback, the authentication failed.
 * @param  {object}   request  The express request object
 * @param  {object}   response The express response object
 * @param  {function} next     The middleware callback function
 * @return {void}
 */
module.exports.authLocal = (request, response, next) => {
	passport.authenticate("local", (err, user, info) => {
		auth(err, request, response, user, next);
	})(request, response, next);
};
