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

const { resolver } = require("graphql-sequelize");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const sequelize = require("lazuli-require")("lazuli-core/globals/sequelize");

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
		args: {},
		resolve: resolver(User)
	}
};

/**
 * The user mutation schema
 * @type {Object}
 */
module.exports.mutation = {
	createUser: {
		type: User.graphQlType,
		args: {
			user: { type: UserInputType }
		},
		resolve: (root, { user }, context, info) => {
			const staticValidation = Joi.validate(user, UserInputTypeValidation);

			const { request } = context;

			if (!staticValidation.error) {
				if (
					request.user &&
					request.user.doesHavePermissions("admin.user.create")
				) {
					//change to sequelize keys
					user.profile_picture_id = user.profilePictureId;

					return User.create(user)
						.then(userModel => {
							//add relations as well

							//permissions
							if (user.permissions) {
								return userModel
									.setPermissionArray(user.permissions)
									.then(() => Promise.resolve(userModel));
							} else {
								return Promise.resolve(userModel);
							}
						})
						.then(userModel => {
							return resolver(User)(
								root,
								{ id: userModel.get("id") },
								context,
								info
							);
						});
				} else {
					return Promise.reject(new Error("Access denied"));
				}
			} else {
				return validation.error;
			}
		}
	},
	updateUser: {
		type: User.graphQlType,
		args: {
			user: { type: UserInputType }
		},
		resolve: (root, { user }, context, info) => {
			return User.update(user).then(userModel => {
				return resolver(User)(root, { id: userModel.get("id") }, info);
			});
		}
	},
	deleteUser: {
		type: GraphQLBoolean,
		args: {
			userId: { type: GraphQLInt }
		},
		resolve: (root, { userId }, info) => {
			return User.findById(userId).then(userModel => {
				return userModel.destroy();
			});
		}
	}
};
