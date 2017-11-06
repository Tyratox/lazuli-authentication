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
const User = require("../models/user");

/**
 * The user type module
 * @module lazuli-authentication/types/user
 */

/**
 * The graphql type for the user
 * @class
 * @memberof module:lazuli-authentication/types/user
 *
 * @type {GraphQLObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.type.user.association The association fields inside the graphql schema
 *
 * @see module:lazuli-authentication/models/user
 */
const UserType = new GraphQLObjectType({
	name: User.name,
	description: "A user",
	fields: () => {
		const PermissionType = require("./permission");
		const OauthProviderType = require("./oauth-provider");
		const OauthAccessTokenType = require("./oauth-access-token");
		const OauthCodeType = require("./oauth-code");
		const OauthClientType = require("./oauth-client");

		const permissionConnection = sequelizeConnection({
			name: "UserPermission",
			nodeType: PermissionType,
			target: User.Permissions
		});

		const oauthProviderConnection = sequelizeConnection({
			name: "UserOauthProvider",
			nodeType: OauthProviderType,
			target: User.OauthProviders
		});

		const oauthAccessTokenConnection = sequelizeConnection({
			name: "userOauthAccessToken",
			nodeType: OauthAccessTokenType,
			target: User.OauthAccessTokens
		});

		const oauthCodeConnection = sequelizeConnection({
			name: "userOauthCode",
			nodeType: OauthCodeType,
			target: User.OauthCodes
		});

		const oauthClientConnection = sequelizeConnection({
			name: "userOauthClient",
			nodeType: OauthClientType,
			target: User.OauthClients
		});

		return protectGraphqlSchemaFields(User.name, [], {
			...attributeFields(User, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable(
				"authentication.graphql.type.user.association",
				{
					permissions: {
						type: permissionConnection.connectionType,
						args: permissionConnection.connectionArgs,
						resolve: permissionConnection.resolve
					},
					oauthProviders: {
						type: oauthProviderConnection.connectionType,
						args: oauthProviderConnection.connectionArgs,
						resolve: oauthProviderConnection.resolve
					},
					oauthAccessTokens: {
						type: oauthAccessTokenConnection.connectionType,
						args: oauthAccessTokenConnection.connectionArgs,
						resolve: oauthAccessTokenConnection.resolve
					},
					oauthCodes: {
						type: oauthCodeConnection.connectionType,
						args: oauthCodeConnection.connectionArgs,
						resolve: oauthCodeConnection.resolve
					},
					oauthClients: {
						type: oauthClientConnection.connectionType,
						args: oauthClientConnection.connectionArgs,
						resolve: oauthClientConnection.resolve
					}
				}
			)
		});
	},
	interfaces: [nodeInterface]
});

module.exports = UserType;
