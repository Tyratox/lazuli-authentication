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

const OauthRedirectUri = require("../models/oauth-redirect-uri");

/**
 * The oauth redirect uri type module
 * @module lazuli-authentication/types/oauth-redirect-uri
 */

/**
 * The graphql type for the oauth redirect uri
 * @class
 * @memberof module:lazuli-authentication/types/oauth-redirect-uri
 *
 * @type {GraphQLObjectType}
 * @version 1.0
 * @since 1.0
 *
 * @see module:lazuli-authentication/models/oauth-redirect-uri
 */
const OauthRedirectUriType = new GraphQLObjectType({
	name: OauthRedirectUri.name,
	description: "An oauth redirect uri",
	fields: () => {
		const OauthClientType = require("./oauth-client");

		const oauthRedirectUriConnection = sequelizeConnection({
			name: "oauthRedirectUriOauthClient",
			nodeType: OauthClientType,
			target: OauthRedirectUri.OauthClient,
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		return {
			...attributeFields(OauthRedirectUri, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable("graphql.type.oauth-redirect-uri.association", {
				oauthClients: {
					type: oauthRedirectUriConnection.connectionType,
					arsg: oauthRedirectUriConnection.connectionArgs,
					resolve: oauthRedirectUriConnection.resolve
				}
			})
		};
	},
	interfaces: [nodeInterface]
});

module.exports = OauthRedirectUriType;
