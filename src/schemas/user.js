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

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const sequelize = require("lazuli-require")("lazuli-core/globals/sequelize");

const { pick } = require("../utilities/object");
const { escapeLikeString } = require("../utilities/sql");

const User = require("../models/user");

const UserInputType = require("../input-types/user");
const UserInputTypeValidation = require("../graphql-validation/user");

/**
 * The user query schema
 * @type {Object}
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
		resolve: resolver(User)
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
					new Error("You have to be logged in, in order to list users!")
				);
			}

			if (!request.user.doesHavePermission("admin.user.list")) {
				return Promise.reject(new Error("You're not allowed to list users!"));
			}

			if (!request.user.doesHavePermission("admin.user")) {
				//only allow uncritical search keys
				args = pick(
					args,
					valueFilter.filterable("graphql.query.user.list.args", [
						"id",
						"nameDisplay",
						"nameFirst",
						"nameLast"
					])
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

					return valueFilter.filterable(
						"graphql.query.user.list.find-options",
						findOptions
					);
				}
			})(root, args, context, info);
		}
	}
};

/**
 * The user mutation schema
 * @type {Object}
 */
module.exports.mutation = {
	//update or insert a user
	upsertUser: {
		type: User.graphQlType,
		args: {
			user: { type: UserInputType }
		},
		resolve: (root, { user }, context, info) => {
			//first check if the passed user object meets all requirements. graphql
			//only checks the input types.
			const staticValidation = Joi.validate(user, UserInputTypeValidation);

			if (!staticValidation.error) {
				//If there's no error check what we need to do: update or insert
				let promise;

				const { request } = context;

				if (user.id) {
					//if the user object contains an id it's not sure yet what action
					//should be taken.
					//should a user with the given id exist, it will be updated
					promise = User.findById(user.id).then(userModel => {
						if (userModel) {
							if (
								request.user &&
								(request.user.doesHavePermission("admin.user.update") ||
									userModel.get("id") === request.user.get("id"))
							) {
								return Promise.resolve(userModel);
							} else {
								return Promise.reject(
									new Error("You are not allowed to update this user!")
								);
							}
						} else {
							//if not, a new user with the given id will be created
							if (request.user.doesHavePermission("admin.user.create")) {
								return User.create({ id: user.id });
							} else {
								return Promise.reject(
									new Error("You're not allowed to create a new user!")
								);
							}
						}
					});
				} else {
					//if the user object doesn't contain an id, a new user will be created
					if (
						request.user &&
						request.user.doesHavePermission("admin.user.create")
					) {
						promise = User.create();
					} else {
						promise = Promise.reject(
							new Error("You're not allowed to create a new user!")
						);
					}
				}

				//all of the previous possibilities will return a promise returning the
				//user model to update
				return promise.then(userModel => {
					if (!userModel) {
						return Promise.reject(new Error("Something went terribly wrong!"));
					}

					//if the user posseses required permission, all given keys will be
					//updated
					if (request.user.doesHavePermission("admin.user.upsert")) {
						userModel.set(user);
					} else {
						//otherwise we pick a few. these keys can be changed by using a
						//filter
						userModel.set(
							pick(
								user,
								valueFilter.filterable("graphql.mutation.user.upsert.keys", [
									"nameDisplay",
									"nameFirst",
									"nameLast",
									"locale"
								])
							)
						);
					}

					//after setting the new values, save the user model to the database
					return userModel
						.save()
						.then(() => {
							//after saving all columns in the user table we also have to
							//update the associations

							//if the user is allowed to, we update the models permissions
							if (
								user.permissions &&
								request.user.doesHavePermission("admin")
							) {
								return userModel.setPermissionArray(user.permissions);
							} else {
								return Promise.resolve();
							}
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
			} else {
				return Promise.reject(validation.error);
			}
		}
	},
	deleteUser: {
		type: GraphQLBoolean,
		args: {
			userId: { type: GraphQLInt }
		},
		resolve: (root, { userId }, { request }, info) => {
			if (
				request.user &&
				(request.user.doesHavePermission("admin.user.delete") ||
					request.user.get("id") == userId)
			) {
				User.findById(userId).then(userModel => {
					if (userModel) {
						//triggers hooks and deletes associations
						return userModel.destory();
					} else {
						return Promise.reject(
							new Error("The given user couldn't be found!")
						);
					}
				});
			}
		}
	}
};
