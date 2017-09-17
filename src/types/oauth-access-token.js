const {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLEnumType,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const {
	resolver,
	attributeFields,
	relay: { sequelizeConnection }
} = require("graphql-sequelize");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const { nodeInterface, attributeFieldsCache } = require("lazuli-require")(
	"lazuli-core/globals/sequelize"
);

const OauthAccessToken = require("../models/oauth-access-token");
const UserType = require("../types/user");
const OauthClientType = require("../types/oauth-client");

/**
 * The graphql object type for this model
 * @type {GraphQLObjectType}
 */
module.exports = oauthClientType = new GraphQLObjectType({
	name: OauthAccessToken.name,
	description: "An oauth access token",
	fields: () => {
		const oauthAccessTokenUserConnection = sequelizeConnection({
			name: "oauthAccessTokenUser",
			nodeType: UserType,
			target: OauthAccessToken.User,
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		const oauthAccessTokenOauthClientConnection = sequelizeConnection({
			name: "oauthAccessTokenOauthClient",
			nodeType: OauthClientType,
			target: OauthAccessToken.OauthClient,
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		return {
			...attributeFields(OauthAccessToken, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable("graphql.type.oauth-access-token.association", {
				user: {
					type: oauthAccessTokenUserConnection.connectionType,
					args: oauthAccessTokenUserConnection.connectionArgs,
					resolve: oauthAccessTokenUserConnection.resolve
				},
				oauthClient: {
					type: oauthAccessTokenOauthClientConnection.connectionType,
					args: oauthAccessTokenOauthClientConnection.connectionArgs,
					resolve: oauthAccessTokenOauthClientConnection.resolve
				}
			})
		};
	},
	interfaces: [nodeInterface]
});
