const User = require("./models/user");
const passport = require("./passport");

/**
 * A set of general authentication endpoints
 * @module lazuli-authentication/endpoint
 */

/**
 * An express middleware/endpoint that resets a users password
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function 
 * @return {void}
 */
module.exports.passwordReset = (request, response, next) => {
	User.findOne({
		where: { emailVerified: request.body.email }
	})
		.then(user => {
			if (user) {
				user
					.updatePassword(request.body.password, request.body.resetCode)
					.then(() => {
						response.redirect("/views/login");
					})
					.catch(next);
			} else {
				//Return always the same error to not leak whether this email
				//is registered
				return next(new Error("The password reset code was invalid!"));
			}
		})
		.catch(next);
};

/**
  *An express endpoint that initiates a passwort reset
  * @param {object} request The express request object
  * @param {object} response The express response object
  * @param {object} next The middleware callback function
  * @return {void}
  */
module.exports.initPasswordReset = (request, response, next) => {
	User.findOne({
		where: { emailVerified: request.body.email }
	})
		.then(user => {
			if (user) {
				let user = user;
				user
					.initPasswordReset()
					.then(() => {
						return response.redirect(
							"/views/password-reset?email=" + request.body.email
						);
					})
					.catch(next);
			} else {
				//ALWAYS redirect to not leak whether this email is registered
				return response.redirect(
					"/views/password-reset?email=" + request.body.email
				);
			}
		})
		.catch(next);
};

/**
 * Express middleware/endpoint that does the last authentication step
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

	request.logIn(user, err => {
		if (err) {
			return next(err);
		}

		if (request.session.requestedURL) {
			response.redirect(request.session.requestedURL);
		} else {
			response.redirect("/");
		}
	});
};

/**
 * An express endpoint that is the callback of the facebook authentication
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function 
 * @return {void}
 */
module.exports.authFacebookCallback = (request, response, next) => {
	passport.authenticate("facebook", (err, user, info) => {
		auth(err, request, response, user, next);
	})(request, response, next);
};

/**
  * An express endpoint that is the callback of the google authentication
  * @param {object} request The express request object
  * @param {object} response The express response object
  * @param {object} next The middleware callback function 
  * @return {void}
  */
module.exports.authGoogleCallback = (request, response, next) => {
	passport.authenticate("google", (err, user, info) => {
		auth(err, request, response, user, next);
	})(request, response, next);
};

/**
 * An express endpoint that verifies the users email
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function 
 * @return {void}
 */
module.exports.verifyEmail = (request, response, next) => {
	const { email, password, emailVerificationCode } = request.body;

	User.findOne({ where: { emailUnverified: email } })
		.then(user => {
			user
				.verifyEmail(email, emailVerificationCode)
				.then(() => {
					if (password) {
						//still requires the password reset code so this should be safe
						user
							.updatePassword(password, emailVerificationCode)
							.then(() => {
								response.redirect("/views/login");
							})
							.catch(next);
					} else {
						response.redirect("/views/login");
					}
				})
				.catch(next);
		})
		.catch(next);
};

/**
 * An express endpoint that registers a user
 * @param {object} request The express request object
 * @param {object} response The express response object
 * @param {object} next The middleware callback function 
 * @return {void}
 */
module.exports.registration = (request, response, next) => {
	let firstName = request.body.firstName,
		email = request.body.email,
		locale = request.body.locale;

	if (!locale) {
		locale = request.getLocale();
	}

	User.register(firstName, email, locale)
		.then(() => {
			return response.redirect(
				"/views/verify-email?register=true&email=" + email
			);
		})
		.catch(next);
};

/**
 * Middleware to check whether the user is authenticated. If not, redirect the user to the login screen
 * @param  {object}   request  The express request object
 * @param  {object}   response The express response object
 * @param  {function} next     The middleware callback function
 * @return {void}
 */
module.exports.isAuthenticated = (request, response, next) => {
	if (request.user) {
		next();
	} else {
		request.session.requestedURL = request.url;
		return response.redirect("/views/login");
	}
};

/**
 * Express middleware for local authentication
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
