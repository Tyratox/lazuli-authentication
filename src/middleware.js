const passport = require("./passport");

/**
 * Generates a middleware that checks for the passed permissions
 * @param  {Array} permissions The express request object
 * @return {Function} The express middleware generator accepting a permissions array
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
