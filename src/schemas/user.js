const Promise = require("bluebird");
const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const { Op } = require("sequelize");

const Joi = require("joi");

const { resolver, attributeFields } = require("graphql-sequelize");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const { escapeLikeString } = require("../utilities/sql");
const { pick } = require("../utilities/object");
const { checkAuthorization } = require("../utilities/graphql");

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
			return checkAuthorization(context.request.user).then(() => {
				return resolver(User)(root, args, context, info);
			});
		}
	},
	users: {
		type: new GraphQLList(User.graphQlType),
		args: {
			//pass all user fields
			...attributeFields(User, { allowNull: true }),
			limit: {
				type: GraphQLInt
			}
		},
		resolve: (root, args, context, info) => {
			const { request: { user } } = context;

			return checkAuthorization(user)
				.then(() => {
					return user.can("admin.user.list");
				})
				.then(() => {
					return user.can("admin.user").catch(() => {
						//if the user doesn't have the permission,
						//only allow uncritical search keys
						args = pick(
							args,
							valueFilter.filterable(
								"authentication.graphql.query.user.list.args",
								["id", "nameDisplay", "nameFirst", "nameLast"]
							)
						);
					});
				})
				.then(() =>
					resolver(User, {
						before: (findOptions, args) => {
							if (findOptions.where) {
								if (findOptions.where.nameDisplay) {
									findOptions.where.nameDisplay = {
										[Op.like]: `%${escapeLikeString(args.nameDisplay)}%`
									};
								}
								if (findOptions.where.nameFirst) {
									findOptions.where.nameFirst = {
										[Op.like]: `%${escapeLikeString(args.nameFirst)}%`
									};
								}
								if (findOptions.where.nameLast) {
									findOptions.where.nameLast = {
										[Op.like]: `%${escapeLikeString(args.nameLast)}%`
									};
								}
								if (findOptions.where.emailVerified) {
									findOptions.where.emailVerified = {
										[Op.like]: `%${args.emailVerified}%`
									};
								}
								if (findOptions.where.locale) {
									findOptions.where.locale = {
										[Op.like]: `%${escapeLikeString(args.locale)}%`
									};
								}
							}

							return findOptions;
						}
					})(root, args, context, info)
				);
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
		resolve: (root, { user: input }, context, info) => {
			//first check if the passed user object meets all requirements. graphql
			//only checks the input types.
			const staticValidation = Joi.validate(input, UserInputTypeValidation);
			const { request: { user } } = context;

			if (staticValidation.error) {
				return Promise.reject(staticValidation.error);
			}

			return Promise.resolve()
				.then(() => {
					//If there's no error check what we need to do: update or insert

					if (input.id) {
						//if the user object contains an id it's not sure yet what action
						//should be taken.
						//should a user with the given id exist, it will be updated
						return checkAuthorization(user)
							.then(() => {
								return User.findById(input.id);
							})
							.then(userModel => {
								if (userModel) {
									return user
										.can("admin.user.update")
										.catch(err => {
											if (userModel.get("id") !== user.get("id")) {
												return Promise.reject(err);
											}
										})
										.then(() => Promise.resolve(userModel));
								} else {
									//if not, a new user with the given id will be created
									return user.can("admin.user.create").then(() => {
										return User.create({ id: input.id });
									});
								}
							});
					} else {
						//if the user object doesn't contain an id, a new user will be created
						return checkAuthorization(user, "admin.user.create").then(() =>
							User.create()
						);
					}
				})
				.then(userModel => {
					//all of the previous possibilities will return a promise returning the
					//user model to update

					//if the user posseses required permission, all given keys will be
					//updated
					return user
						.can("admin.user.upsert")
						.catch(() => {
							//otherwise we pick a few. these keys can be changed by using a
							//filter
							userModel.set(
								pick(
									input,
									valueFilter.filterable(
										"authentication.graphql.mutation.user.upsert.keys",
										["nameDisplay", "nameFirst", "nameLast", "locale"]
									)
								)
							);
							//after setting the new values, save the user model to the database
						})
						.then(() => userModel.set(input))
						.then(() => userModel.save())
						.then(() => {
							//after saving all columns in the user table we also have to
							//update the associations

							if (!input.permissions) {
								return Promise.resolve();
							}
							//if the user is allowed to, we update the models permissions
							return user
								.can("admin")
								.then(() => userModel.setPermissionArray(input.permissions));
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
		}
	},
	deleteUser: {
		type: GraphQLBoolean,
		args: {
			id: { type: GraphQLInt }
		},
		resolve: (root, { id }, { request: { user } }, info) => {
			return checkAuthorization(user, "admin.user.delete").then(() =>
				User.findById(id).then(userModel => {
					if (!userModel) {
						return Promise.reject(
							new OperationalError("The given user couldn't be found!")
						);
					}
					//triggers hooks and deletes associations
					return userModel.destroy().then(() => {
						return Promise.resolve(true);
					});
				})
			);
		}
	}
};
