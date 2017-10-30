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

		const oauthClientUserConnection = sequelizeConnection({
			name: "oauthClientUser",
			nodeType: UserType,
			target: OauthClient.User,
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		const oauthClientOauthCodeConnection = sequelizeConnection({
			name: "oauthClientOauthCode",
			nodeType: OauthCodeType,
			target: OauthClient.OauthCodes,
			orderBy: new GraphQLEnumType({
				name: "OauthClientOauthCodeOrderBy",
				values: {
					ID: { value: ["id", "ASC"] }
				}
			}),
			where: (key, value, currentWhere) => {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		const oauthClientOauthAccessTokenConnection = sequelizeConnection({
			name: "oauthClientOauthAccessToken",
			nodeType: OauthAccessTokenType,
			target: OauthClient.OauthAccessTokens,
			orderBy: new GraphQLEnumType({
				name: "OauthClientOauthAccessTokenOrderBy",
				values: {
					ID: { value: ["id", "ASC"] }
				}
			}),
			where: (key, value, currentWhere) => {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		const oauthClientOauthRedirectUriConnection = sequelizeConnection({
			name: "oauthClientOauthRedirectUri",
			nodeType: OauthRedirectUriType,
			target: OauthClient.OauthRedirectUris,
			orderBy: new GraphQLEnumType({
				name: "OauthClientRedirectUriOrderBy",
				values: {
					ID: { value: ["id", "ASC"] }
				}
			}),
			where: (key, value, currentWhere) => {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
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
					type: oauthClientUserConnection.connectionType,
					args: oauthClientUserConnection.connectionArgs,
					resolve: oauthClientUserConnection.resolve
				},
				oauthCodes: {
					type: oauthClientOauthCodeConnection.connectionType,
					args: oauthClientOauthCodeConnection.connectionArgs,
					resolve: oauthClientOauthCodeConnection.resolve
				},
				oauthAccessTokens: {
					type: oauthClientOauthAccessTokenConnection.connectionType,
					args: oauthClientOauthAccessTokenConnection.connectionArgs,
					resolve: oauthClientOauthAccessTokenConnection.resolve
				},
				oauthRedirectUris: {
					type: oauthClientOauthRedirectUriConnection.connectionType,
					args: oauthClientOauthRedirectUriConnection.connectionArgs,
					resolve: oauthClientOauthRedirectUriConnection.resolve
				}
			})
		});
	},
	interfaces: [nodeInterface]
});

module.exports = OauthClientType;
