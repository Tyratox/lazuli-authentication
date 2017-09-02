const {
	PIWIK_TRACKING_SITE_BASE_URL,
	PIWIK_TRACKING_USER_AGENT,
	DEFAULT_REDIRECT_URI
} = require("lazuli-require")("lazuli-config");

const piwikTracker = require("lazuli-piwik-tracker");

/**
 * Generates an express middleware/endpoint that resets a users password
 * @param  {Object} User         The user database model
 * @return {Function} An express middleware/endpoint that resets a users password
 */
module.exports.passwordReset = User => {
	return (request, response, next) => {
		User.findOne({
			where: { emailVerified: request.body.email }
		})
			.then(user => {
				if (user) {
					user
						.updatePassword(request.body.password, request.body.resetCode)
						.then(() => {
							piwikTracker.track({
								url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
								action_name: "Authentication/PasswordReset",
								urlref: request.get("Referrer"),
								ua: PIWIK_TRACKING_USER_AGENT,
								uid: user.emailVerified
							});
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
};

/**
  * Generates an express endpoint that initiates a passwort reset
  * @param  {Object} User The user database model
  * @return {Function} An express endpoint that initiates a passwort reset
  */
module.exports.initPasswordReset = User => {
	return (request, response, next) => {
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
};

/**
 * Express middleware/endpoint that does the last authentication step
 * @param  {Object}   err                 An error object
 * @param  {Object}   request             The express request object
 * @param  {Object}   response            The express response object
 * @param  {Object}   user                The passport user
 * @param  {String}   defaultRedirectUri  The uri to redirect if there's no requestUrl
 * @param  {Function} next                The function which is called on success
 * @return {void}
 */
const auth = (err, request, response, user, defaultRedirectUri, next) => {
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
			response.redirect(defaultRedirectUri);
		}
	});
};

/**
 * Generates an express endpoint that is the callback of the facebook authentication
 * @param  {Object} passport     The passport object
 * @return {Function} An express endpoint that is the callback of the facebook authentication
 */
module.exports.authFacebookCallback = passport => {
	return (request, response, next) => {
		passport.authenticate("facebook", (err, user, info) => {
			if (!err && user) {
				piwikTracker.track({
					url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/FacebookLogin",
					urlref: request.get("Referrer"),
					ua: PIWIK_TRACKING_USER_AGENT,
					uid: user.get("emailVerified")
				});
			}

			auth(err, request, response, user, DEFAULT_REDIRECT_URI, next);
		})(request, response, next);
	};
};

/**
  * Generates an express endpoint that is the callback of the google authentication
  * @param  {Object} passport     The passport object
  * @return {Function} An express endpoint that is the callback of the google authentication
  */
module.exports.authGoogleCallback = passport => {
	return (request, response, next) => {
		passport.authenticate("google", (err, user, info) => {
			if (!err && user) {
				piwikTracker.track({
					url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/GoogleLogin",
					urlref: request.get("Referrer"),
					ua: PIWIK_TRACKING_USER_AGENT,
					uid: user.get("emailVerified")
				});
			}

			auth(err, request, response, user, DEFAULT_REDIRECT_URI, next);
		})(request, response, next);
	};
};

/**
 * Generates an express endpoint that verifies the users email
 * @param  {Object} User         The user database model
 * @return {Function} An express endpoint that verifies the users email
 */
module.exports.verifyEmail = User => {
	return (request, response, next) => {
		let email = request.body.email,
			emailVerificationCode = request.body.emailVerificationCode,
			password = request.body.password;

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
									piwikTracker.track({
										url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
										action_name: "Authentication/VerifyEmail",
										urlref: request.get("Referrer"),
										ua: PIWIK_TRACKING_USER_AGENT,
										uid: email
									});
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
};

/**
  * Generates an express endpoint that registers a user
  * @param  {Object} User         The user database model
  * @return {Function} An express endpoint that registers a user
  */
module.exports.registration = User => {
	return (request, response, next) => {
		let firstName = request.body.firstName,
			email = request.body.email,
			locale = request.body.locale;

		if (!locale) {
			locale = request.getLocale();
		}

		User.register(firstName, email, locale)
			.then(() => {
				piwikTracker.track({
					url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/Registration",
					urlref: request.get("Referrer"),
					ua: PIWIK_TRACKING_USER_AGENT,
					uid: email
				});
				return response.redirect(
					"/views/verify-email?register=true&email=" + email
				);
			})
			.catch(next);
	};
};

/**
 * Middleware to check whether the user is authenticated. If not, redirect the user to the login screen
 * @param  {Object}   request  The express request object
 * @param  {Object}   response The express response object
 * @param  {Function} next     The function which is called on success
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
 * @param  {Object} passport     The passport object
 * @return {Function} An express middleware for local authentication
 */
module.exports.authLocal = passport => {
	return (request, response, next) => {
		passport.authenticate("local", (err, user, info) => {
			if (!err && user) {
				piwikTracker.track({
					url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/AuthLocal",
					urlref: request.get("Referrer"),
					ua: PIWIK_TRACKING_USER_AGENT,
					uid: user.emailVerified
				});
			}

			auth(err, request, response, user, DEFAULT_REDIRECT_URI, next);
		})(request, response, next);
	};
};
