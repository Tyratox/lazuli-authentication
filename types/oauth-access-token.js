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

const eventEmitter = require("lazuli-core/event-emitter");
const valueFilter = require("lazuli-core/value-filter");
const {
	nodeInterface,
	attributeFieldsCache
} = require("lazuli-core/sequelize");

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

		const userConnection = sequelizeConnection({
			name: "OauthAccessTokenUser",
			nodeType: UserType,
			target: OauthAccessToken.User
		});

		const oauthClientConnection = sequelizeConnection({
			name: "OauthAccessTokenOauthClient",
			nodeType: OauthClientType,
			target: OauthAccessToken.OauthClient
		});

		const oauthScopeConnection = sequelizeConnection({
			name: "OauthAccessTokenOauthScope",
			nodeType: OauthScopeType,
			target: OauthAccessToken.OauthScopes
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
						type: userConnection.connectionType,
						args: userConnection.connectionArgs,
						resolve: userConnection.resolve
					},
					oauthClient: {
						type: oauthClientConnection.connectionType,
						args: oauthClientConnection.connectionArgs,
						resolve: oauthClientConnection.resolve
					},
					oauthScope: {
						type: oauthScopeConnection.connectionType,
						args: oauthScopeConnection.connectionArgs,
						resolve: oauthScopeConnection.resolve
					}
				}
			)
		};
	},
	interfaces: [nodeInterface]
});

module.exports = OauthAccessTokenType;
