const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const Joi = require("joi");

const { resolver, attributeFields } = require("graphql-sequelize");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const { escapeLikeString } = require("../utilities/sql");
const { pick } = require("../utilities/object");

const User = require("../models/user");

const UserInputType = require("../input-types/user");
const UserInputTypeValidation = require("../graphql-validation/user");

/**
 * The graphql schema for the user model
 * @module lazuli-authentication/schema/user
 * 
 * @filterable {object} authentication.graphql.query.user.list.args The user properties everyone can query
 * @filterable {object} authentication.graphql.mutation.user.upsert.keys The user properties the owner can update
 * 
 * @see module:lazuli-authentication/types/user
 * @see module:lazuli-authentication/input-types/user
 * @see module:lazuli-authentication/models/user
 */

/**
 * The user query schema
 * @type {object}
 */
module.exports.query = {
	user: {
		type: User.graphQlType,
		args: {
			id: {
				description: "The id of the user",
				type: new GraphQLNonNull(GraphQLInt)
			}
		},
		resolve: (root, args, context, info) => {
			const { request } = context;

			if (!request.user) {
				return Promise.reject(
					new Error(
						"Access Denied! You have to be logged in in order to view users!"
					)
				);
			}

			return resolver(User)(root, args, context, info);
		}
	},
	users: {
		type: new GraphQLList(User.graphQlType),
		args: {
			//generally allow to filter all fields
			...attributeFields(User, { allowNull: true }),
			limit: {
				type: GraphQLInt
			}
		},
		resolve: (root, args, context, info) => {
			const { request } = context;

			if (!request.user) {
				return Promise.reject(
					new Error(
						"Access Denied! You have to be logged in, in order to list users!"
					)
				);
			}

			return request.user
				.doesHavePermission("admin.user.list")
				.then(hasPermission => {
					return hasPermission
						? Promise.resolve()
						: Promise.reject(
								new Error("Access Denied! You're not allowed to list users!")
							);
				})
				.then(() => {
					return request.user.doesHavePermission("admin.user");
				})
				.then(hasPermission => {
					if (!hasPermission) {
						//if the user doesn't have the permission,
						//only allow uncritical search keys
						args = pick(
							args,
							valueFilter.filterable(
								"authentication.graphql.query.user.list.args",
								["id", "nameDisplay", "nameFirst", "nameLast"]
							)
						);
					}

					return resolver(User, {
						before: (findOptions, args) => {
							if (findOptions.where) {
								if (findOptions.where.nameDisplay) {
									findOptions.where.nameDisplay = {
										$like: `%${escapeLikeString(args.nameDisplay)}%`
									};
								}
								if (findOptions.where.nameFirst) {
									findOptions.where.nameFirst = {
										$like: `%${escapeLikeString(args.nameFirst)}%`
									};
								}
								if (findOptions.where.nameLast) {
									findOptions.where.nameLast = {
										$like: `%${escapeLikeString(args.nameLast)}%`
									};
								}
								if (findOptions.where.emailVerified) {
									findOptions.where.emailVerified = {
										$like: `%${args.emailVerified}%`
									};
								}
								if (findOptions.where.locale) {
									findOptions.where.locale = {
										$like: `%${escapeLikeString(args.locale)}%`
									};
								}
							}

							return findOptions;
						}
					})(root, args, context, info);
				});
		}
	}
};

/**
 * The user mutation schema
 * @type {object}
 */
module.exports.mutation = {
	//update or insert a user
	upsertUser: {
		type: User.graphQlType,
		args: {
			user: { type: new GraphQLNonNull(UserInputType) }
		},
		resolve: (root, { user }, context, info) => {
			//first check if the passed user object meets all requirements. graphql
			//only checks the input types.
			const staticValidation = Joi.validate(user, UserInputTypeValidation);
			const { request } = context;

			if (staticValidation.error) {
				return Promise.reject(staticValidation.error);
			}

			return Promise.resolve()
				.then(() => {
					//If there's no error check what we need to do: update or insert

					if (user.id) {
						//if the user object contains an id it's not sure yet what action
						//should be taken.
						//should a user with the given id exist, it will be updated
						return User.findById(user.id).then(userModel => {
							if (userModel) {
								if (!request.user) {
									return Promise.reject(
										new Error(
											"Access Denied! You are not allowed to update this user!"
										)
									);
								}
								return request.user
									.doesHavePermission("admin.user.update")
									.then(hasPermission => {
										if (
											!hasPermission &&
											userModel.get("id") !== request.user.get("id")
										) {
											return Promise.reject(
												new Error(
													"Access Denied! You are not allowed to update this user!"
												)
											);
										}

										return Promise.resolve(userModel);
									});
							} else {
								//if not, a new user with the given id will be created
								return request.user
									.doesHavePermission("admin.user.create")
									.then(hasPermission => {
										if (!hasPermission) {
											return Promise.reject(
												new Error(
													"Access Denied! You're not allowed to create a new user!"
												)
											);
										}
										return User.create({ id: user.id });
									});
							}
						});
					} else {
						//if the user object doesn't contain an id, a new user will be created
						if (!request.user) {
							return Promise.reject(
								new Error(
									"Access Denied! You're not allowed to create a new user!"
								)
							);
						}
						return request.user
							.doesHavePermission("admin.user.create")
							.then(hasPermission => {
								if (!hasPermission) {
									return Promise.reject(
										new Error(
											"Access Denied! You're not allowed to create a new user!"
										)
									);
								}
								return User.create();
							});
					}
				})
				.then(userModel => {
					//all of the previous possibilities will return a promise returning the
					//user model to update

					//if the user posseses required permission, all given keys will be
					//updated
					return request.user
						.doesHavePermission("admin.user.upsert")
						.then(hasPermission => {
							if (hasPermission) {
								userModel.set(user);
							} else {
								//otherwise we pick a few. these keys can be changed by using a
								//filter
								userModel.set(
									pick(
										user,
										valueFilter.filterable(
											"authentication.graphql.mutation.user.upsert.keys",
											["nameDisplay", "nameFirst", "nameLast", "locale"]
										)
									)
								);
							}

							//after setting the new values, save the user model to the database
							return userModel
								.save()
								.then(() => {
									//after saving all columns in the user table we also have to
									//update the associations

									if (!user.permissions) {
										return Promise.resolve();
									}
									//if the user is allowed to, we update the models permissions
									return request.user
										.doesHavePermission("admin")
										.then(hasPermission => {
											if (hasPermission) {
												return userModel.setPermissionArray(user.permissions);
											} else {
												return Promise.reject();
											}
										});
								})
								.then(() => {
									//in the end, we return the updated user object by using
									//graphql-sequelize's resolver
									return resolver(User)(
										root,
										{ id: userModel.get("id") },
										context,
										info
									);
								});
						});
				});
		}
	},
	deleteUser: {
		type: GraphQLBoolean,
		args: {
			id: { type: GraphQLInt }
		},
		resolve: (root, { id }, { request }, info) => {
			if (request.user) {
				return request.user
					.doesHavePermission("admin.user.delete")
					.then(hasPermission => {
						if (hasPermission || request.user.get("id") == id) {
							return Promise.resolve();
						} else {
							return Promise.reject(
								"Access Denied! You're not allowed to delete this user!"
							);
						}
					})
					.then(() => {
						return User.findById(id).then(userModel => {
							if (userModel) {
								//triggers hooks and deletes associations
								return userModel.destroy().then(() => {
									return Promise.resolve(true);
								});
							} else {
								return Promise.reject(
									new Error("The given user couldn't be found!")
								);
							}
						});
					});
			} else {
				return Promise.reject(
					"Access Denied! You have to be logged in in order delete this user!"
				);
			}
		}
	}
};
