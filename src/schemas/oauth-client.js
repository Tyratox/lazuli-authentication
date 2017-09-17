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
const { nodeField } = sequelize;

const OauthClient = require("../models/oauth-client");

const OauthClientSchema = new GraphQLSchema({
	query: new GraphQLObjectType({
		name: "OauthClientQuery",
		fields: {
			oauthClient: {
				type: OauthClient.graphQlType,
				args: {
					id: {
						description: "The id of the oauth client",
						type: new GraphQLNonNull(GraphQLInt)
					}
				},
				resolve: resolver(OauthClient)
			},
			oauthClients: {
				type: new GraphQLList(OauthClient.graphQlType),
				args: {},
				resolve: resolver(OauthClient)
			}
		}
	}),
	mutation: new GraphQLObjectType({
		name: "OauthClientMutation",
		fields: {
			createoOauthClient: {
				type: OauthClient.graphQlType,
				args: {
					oauthClient: { type: OauthClient.graphQlType }
				},
				resolve: (root, { oauthClient }, info) => {
					return OauthClient.create(oauthClient).then(oauthClientModel => {
						return resolver(OauthClient)(
							root,
							{ id: oauthClientModel.get("id") },
							info
						);
					});
				}
			},
			updateUser: {
				type: OauthClient.graphQlType,
				args: {
					user: { type: OauthClient.graphQlType }
				},
				resolve: (root, { oauthClient }, info) => {
					return OauthClient.update(oauthClient).then(oauthClientModel => {
						return resolver(OauthClient)(
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
					return OauthClient.findById(userId).then(oauthClientModel => {
						return oauthClientModel.destroy();
					});
				}
			}
		}
	})
});

return OauthClientSchema;
