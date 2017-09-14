const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList,
	GraphQLInputObjectType
} = require("graphql");

const { resolver } = require("graphql-sequelize");

const UserInputType = new GraphQLInputObjectType({
	name: "InputType",
	fields: {
		int: { type: GraphQLInt }
	}
});

/**
  * Generates the oauth client graphql schema
  * @param {Object} eventEmitter The global event emitter
  * @param {Object} valueFilter The global value filter object
  * @param {Object} sequelize The global sequelize object
  * @param {Object} User The user model
  */
module.exports = (eventEmitter, valueFilter, sequelize, User) => {
	const { nodeField } = sequelize;

	const UserSchema = new GraphQLSchema({
		query: new GraphQLObjectType({
			name: "UserQuery",
			fields: {
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
				},
				node: nodeField
			}
		}),
		mutation: new GraphQLObjectType({
			name: "UserMutation",
			fields: {
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
				},
				node: nodeField
			}
		})
	});

	return UserSchema;
};
