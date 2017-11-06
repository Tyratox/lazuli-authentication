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

const OauthCode = require("../models/oauth-code");

/**
 * The oauth code type module
 * @module lazuli-authentication/types/oauth-code
 */

/**
 * The graphql type for the oauth code
 * @class
 * @memberof module:lazuli-authentication/types/oauth-code
 *
 * @type {GraphQLObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.type.oauth-code.association The association fields inside the graphql schema
 *
 * @see module:lazuli-authentication/models/oauth-code
 */
const OauthCodeType = new GraphQLObjectType({
	name: OauthCode.name,
	description: "An oauth code",
	fields: () => {
		const UserType = require("../types/user");
		const OauthClientType = require("./oauth-client");
		const OauthScopeType = require("./oauth-scope");

		const userConnection = sequelizeConnection({
			name: "OauthCodeUser",
			nodeType: UserType,
			target: OauthCode.User
		});

		const oauthClientConnection = sequelizeConnection({
			name: "OauthCodeOauthClient",
			nodeType: OauthClientType,
			target: OauthCode.OauthClient
		});

		const oauthScopeConnection = sequelizeConnection({
			name: "OauthCodeOauthScope",
			nodeType: OauthScopeType,
			target: OauthCode.OauthScopes
		});

		return {
			...attributeFields(OauthCode, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable(
				"authentication.graphql.type.oauth-code.association",
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

module.exports = OauthCodeType;
