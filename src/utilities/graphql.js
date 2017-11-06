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
							new Error(
								"Access Denied! You have to be logged in to access this field!"
							)
						);
					}
					return request.user
						.can("admin." + name + ".read." + key)
						.then(havePermission => {
							if (!havePermission) {
								return Promise.reject(
									new Error(
										"Access Denied! You're not allowed to access this field!"
									)
								);
							}

							return Promise.resolve(model.get(key));
						});
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
