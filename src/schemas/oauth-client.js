const {
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const { resolver } = require("graphql-sequelize");

/**
  * Generates the oauth client graphql schema
  * @param {Object} eventEmitter The global event emitter
  * @param {Object} valueFilter The global value filter object
  * @param {Object} models An object containing all registered database models
  */
module.exports = (eventEmitter, valueFilter, models) => {
	const OAuthClientSchema = new GraphQLSchema({
		query: new GraphQLObjectType({
			name: "OAuthClientQuery",
			fields: {
				oauthClient: {
					type: OAuthClient.graphQLObjectType,
					args: {
						id: {
							description: "The id of the oauth client",
							type: new GraphQLNonNull(GraphQLInt)
						}
					},
					resolve: resolver(OAuthClient)
				},
				oauthClients: {
					type: new GraphQLList(OAuthClient.graphQLObjectType),
					args: {},
					resolve: resolver(OAuthClient)
				}
			}
		}),
		mutation: new GraphQLObjectType({
			name: "OAuthClientMutation",
			fields: {
				createoOAuthClient: {
					type: OAuthClient.graphQlType,
					args: {
						oauthClient: { type: OAuthClient.graphQlType }
					},
					resolve: (root, { oauthClient }, info) => {
						return OAuthClient.create(oauthClient).then(oauthClientModel => {
							return resolver(OAuthClient)(
								root,
								{ id: oauthClientModel.get("id") },
								info
							);
						});
					}
				},
				updateUser: {
					type: OAuthClient.graphQlType,
					args: {
						user: { type: OAuthClient.graphQlType }
					},
					resolve: (root, { oauthClient }, info) => {
						return OAuthClient.update(oauthClient).then(oauthClientModel => {
							return resolver(OAuthClient)(
								root,
								{ id: oauthClientModel.get("id") },
								info
							);
						});
					}
				},
				deleteUser: {
					type: GraphQLBoolean,
					args: {
						userId: { type: GraphQLInt }
					},
					resolve: (root, { userId }, info) => {
						return OAuthClient.findById(userId).then(oauthClientModel => {
							return oauthClientModel.destroy();
						});
					}
				}
			}
		})
	});

	return OAuthClientSchema;
};
