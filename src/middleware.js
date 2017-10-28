const passport = require("./passport");

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
