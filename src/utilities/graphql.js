const Promise = require("bluebird");

/**
 * Graphql utilities
 * @module lazuli-authentication/utilities/graphql
 */

/**
 * Protects graphql fields by adding a resolver and checking for permissions
 * @param  {string} [name=""]         The models name, used in the permission string
 * @param  {array}  [publicFields=[]] Fields that shouldn't be protected
 * @param  {object} [fields={}]       The fields object to protect
 * @return {object}                   The protected field object
 */
module.exports.protectGraphqlSchemaFields = (
	name = "",
	exclude = [],
	fields = {}
) => {
	const protectedFields = { ...fields };

	Object.keys(fields).forEach(key => {
		if (exclude.indexOf(key) !== -1) {
			return; //continue
		}

		const origResolve = fields[key].resolve;

		protectedFields[key].resolve = (model, args, context, info) => {
			const { request } = context;

			return Promise.resolve()
				.then(() => {
					if (!request.user) {
						return Promise.reject(
							new OperationalError(
								"Access Denied! You have to be logged in to access this field!"
							)
						);
					}
					return request.user
						.can("admin." + name + ".read." + key)
						.then(() => Promise.resolve(model.get(key)));
				})
				.then(value => {
					return origResolve
						? origResolve(model, args, context, info)
						: Promise.resolve(value);
				});
		};
	});

	return protectedFields;
};

/**
 * Checks whether the user is logged in and posseses the passed permissions
 * @param  {module:lazuli-authentication/models/user.User} user The user to check
 * @param  {string|string[]} [permissions=[]] The permissions to check
 * @return {promise<object>}
 */
module.exports.checkAuthorization = (user, permissions = []) => {
	permissions = Array.isArray(permissions) ? permissions : [permissions];

	return user ? user.can(permissions) : Promise.reject("Unauthorized");
};
