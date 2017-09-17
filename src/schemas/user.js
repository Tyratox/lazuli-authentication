const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const { resolver } = require("graphql-sequelize");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const sequelize = require("lazuli-require")("lazuli-core/globals/sequelize");

const User = require("../models/User");

const userInputType = require("../input-types/user");
const oauthProviderInputType = require("../input-types/oauth-provider");

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
		resolve: (root, { user }, info) => {
			return User.create(user).then(userModel => {
				return resolver(User)(root, { id: userModel.get("id") }, info);
			});
		}
	},
	updateUser: {
		type: User.graphQlType,
		args: {
			user: { type: UserInputType }
		},
		resolve: (root, { user }, info) => {
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
