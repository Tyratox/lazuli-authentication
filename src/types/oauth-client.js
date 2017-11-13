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

const { protectGraphqlSchemaFields } = require("../utilities/graphql");

const OauthClient = require("../models/oauth-client");

/**
 * The oauth client type module
 * @module lazuli-authentication/types/oauth-client
 */

/**
 * The graphql type for the oauth client
 * @class
 * @memberof module:lazuli-authentication/types/oauth-client
 *
 * @type {GraphQLObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.type.oauth-client.association The association fields inside the graphql schema
 *
 * @see module:lazuli-authentication/models/oauth-client
 */
const OauthClientType = new GraphQLObjectType({
	name: OauthClient.name,
	description: "An oauth client",
	fields: () => {
		//lazy loaded
		const UserType = require("./user");
		const OauthCodeType = require("./oauth-code");
		const OauthAccessTokenType = require("./oauth-access-token");
		const OauthRedirectUriType = require("./oauth-redirect-uri");

		const userConnection = sequelizeConnection({
			name: "OauthClientUser",
			nodeType: UserType,
			target: OauthClient.User
		});

		const oauthCodeConnection = sequelizeConnection({
			name: "OauthClientOauthCode",
			nodeType: OauthCodeType,
			target: OauthClient.OauthCodes
		});

		const oauthAccessTokenConnection = sequelizeConnection({
			name: "OauthClientOauthAccessToken",
			nodeType: OauthAccessTokenType,
			target: OauthClient.OauthAccessTokens
		});

		const oauthRedirectUriConnection = sequelizeConnection({
			name: "OauthClientOauthRedirectUri",
			nodeType: OauthRedirectUriType,
			target: OauthClient.OauthRedirectUris
		});

		return protectGraphqlSchemaFields(OauthClient.name, ["id"], {
			...attributeFields(OauthClient, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			secret: {
				type: GraphQLString
			},
			...valueFilter.filterable("graphql.type.oauth-client.association", {
				user: {
					type: userConnection.connectionType,
					args: userConnection.connectionArgs,
					resolve: userConnection.resolve
				},
				oauthCodes: {
					type: oauthCodeConnection.connectionType,
					args: oauthCodeConnection.connectionArgs,
					resolve: oauthCodeConnection.resolve
				},
				oauthAccessTokens: {
					type: oauthAccessTokenConnection.connectionType,
					args: oauthAccessTokenConnection.connectionArgs,
					resolve: oauthAccessTokenConnection.resolve
				},
				oauthRedirectUris: {
					type: oauthRedirectUriConnection.connectionType,
					args: oauthRedirectUriConnection.connectionArgs,
					resolve: oauthRedirectUriConnection.resolve
				}
			})
		});
	},
	interfaces: [nodeInterface]
});

module.exports = OauthClientType;
