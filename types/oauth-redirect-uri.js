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
 * @filterable {object} authentication.graphql.type.oauth-redirect-uri.association The association fields inside the graphql schema
 *
 * @see module:lazuli-authentication/models/oauth-redirect-uri
 */
const OauthRedirectUriType = new GraphQLObjectType({
	name: OauthRedirectUri.name,
	description: "An oauth redirect uri",
	fields: () => {
		const OauthClientType = require("./oauth-client");

		const oauthClientConnection = sequelizeConnection({
			name: "OauthRedirectUriOauthClient",
			nodeType: OauthClientType,
			target: OauthRedirectUri.OauthClient
		});

		return {
			...attributeFields(OauthRedirectUri, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable(
				"authentication.graphql.type.oauth-redirect-uri.association",
				{
					oauthClients: {
						type: oauthClientConnection.connectionType,
						arsg: oauthClientConnection.connectionArgs,
						resolve: oauthClientConnection.resolve
					}
				}
			)
		};
	},
	interfaces: [nodeInterface]
});

module.exports = OauthRedirectUriType;
