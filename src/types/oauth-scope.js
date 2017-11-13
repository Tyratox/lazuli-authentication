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

const OauthScope = require("../models/oauth-scope");

/**
 * The oauth scope type module
 * @module lazuli-authentication/types/oauth-scope
 */

/**
 * The graphql type for oauth scopes
 * @class
 * @memberof module:lazuli-authentication/types/oauth-scope
 *
 * @type {GraphQLObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.type.oauth-scope.association The association fields inside the graphql schema
 *
 * @see module:lazuli-authentication/models/oauth-scope
 */
const OauthScopeType = new GraphQLObjectType({
	name: OauthScope.name,
	description: "An oauth scope",
	fields: () => {
		const OauthAccessTokenType = require("./oauth-access-token");

		const oauthAccessTokenConnection = sequelizeConnection({
			name: "OauthScopeAccessToken",
			nodeType: OauthAccessTokenType,
			target: OauthScope.OauthAccessTokens
		});

		return {
			...attributeFields(OauthScope, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable(
				"authentication.graphql.type.oauth-scope.association",
				{
					users: {
						type: oauthAccessTokenConnection.connectionType,
						arsg: oauthAccessTokenConnection.connectionArgs,
						resolve: oauthAccessTokenConnection.resolve
					}
				}
			)
		};
	},
	interfaces: [nodeInterface]
});

module.exports = OauthScopeType;
