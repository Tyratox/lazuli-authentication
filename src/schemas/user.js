const {
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const { resolver } = require("graphql-sequelize");

module.exports = (eventEmitter, valueFilter, User) => {
	const UserSchema = new GraphQLSchema({
		query: new GraphQLObjectType({
			name: "UserQuery",
			fields: {
				user: {
					type: User.graphQLObjectType,
					args: {
						id: {
							description: "The id of the user",
							type: new GraphQLNonNull(GraphQLInt)
						}
					},
					resolve: resolver(User)
				},
				users: {
					type: new GraphQLList(User.graphQLObjectType),
					args: {},
					resolve: resolver(User)
				}
			}
		}),
		mutation: new GraphQLObjectType({
			name: "UserMutation",
			fields: {
				createUser: {
					type: User.graphQlType,
					args: {
						user: { type: User.graphQlType }
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
						user: { type: User.graphQlType }
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
			}
		})
	});

	return UserSchema;
};
