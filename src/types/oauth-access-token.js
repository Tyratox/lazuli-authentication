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

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const { nodeInterface, attributeFieldsCache } = require("lazuli-require")(
	"lazuli-core/sequelize"
);

const OauthAccessToken = require("../models/oauth-access-token");

/**
 * The oauth access token type module
 * @module lazuli-authentication/types/oauth-acccess-token
 */

/**
 * The graphql type for the oauth access token
 * @class
 * @memberof module:lazuli-authentication/types/oauth-acccess-token
 *
 * @type {GraphQLObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.type.oauth-access-token.association The association fields inside the graphql schema
 *
 * @see module:lazuli-authentication/models/oauth-access-token
 */
const OauthAccessTokenType = new GraphQLObjectType({
	name: OauthAccessToken.name,
	description: "An oauth access token",
	fields: () => {
		//lazy loaded
		const UserType = require("./user");
		const OauthClientType = require("./oauth-client");
		const OauthScopeType = require("./oauth-scope");

		const oauthAccessTokenUserConnection = sequelizeConnection({
			name: "oauthAccessTokenUser",
			nodeType: UserType,
			target: OauthAccessToken.User,
			where: (key, value, currentWhere) => {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		const oauthAccessTokenOauthClientConnection = sequelizeConnection({
			name: "oauthAccessTokenOauthClient",
			nodeType: OauthClientType,
			target: OauthAccessToken.OauthClient,
			where: (key, value, currentWhere) => {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		const oauthScopeConnection = sequelizeConnection({
			name: "oauthScope",
			nodeType: OauthScopeType,
			target: OauthAccessToken.OauthScopes,
			orderBy: new GraphQLEnumType({
				name: "OauthScopeOrderBy",
				values: {
					ID: { value: ["id", "ASC"] },
					SCOPE: { value: ["scope", "DESC"] }
				}
			}),
			where: (key, value, currentWhere) => {
				return { [key]: value };
			},
			connectionFields: {
				total: {
					type: GraphQLInt,
					resolve: ({ source }) => {
						return source.countOauthScopes();
					}
				}
			},
			edgeFields: {}
		});

		return {
			...attributeFields(OauthAccessToken, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable(
				"authentication.graphql.type.oauth-access-token.association",
				{
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
				}
			)
		};
	},
	interfaces: [nodeInterface]
});

module.exports = OauthAccessTokenType;
