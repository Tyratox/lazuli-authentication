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

const User = require("../models/user");

/**
 * The graphql object type for this model
 * @type {GraphQLObjectType}
 */
module.exports = new GraphQLObjectType({
	name: User.name,
	description: "A user",
	fields: () => {
		const PermissionType = require("./permission");
		const OauthProviderType = require("./oauth-provider");
		const OauthAccessTokenType = require("./oauth-access-token");
		const OauthCodeType = require("./oauth-code");
		const OauthClientType = require("./oauth-client");

		const userPermissionConnection = sequelizeConnection({
			name: "userPermission",
			nodeType: PermissionType,
			target: User.Permissions,
			orderBy: new GraphQLEnumType({
				name: "UserPermissionOrderBy",
				values: {
					ID: { value: ["id", "ASC"] },
					NAME: { value: ["permission", "DESC"] }
				}
			}),
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {
				total: {
					type: GraphQLInt,
					resolve: ({ source }) => {
						return source.countPermissions();
					}
				}
			},
			edgeFields: {}
		});

		const userOauthProviderConnection = sequelizeConnection({
			name: "userOauthProvider",
			nodeType: OauthProviderType,
			target: User.OauthProviders,
			orderBy: new GraphQLEnumType({
				name: "userOauthProviderOrderBy",
				values: {
					ID: { value: ["id", "ASC"] },
					TYPE: { value: ["type", "DESC"] }
				}
			}),
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {
				total: {
					type: GraphQLInt,
					resolve: ({ source }) => source.countOauthProviders()
				}
			},
			edgeFields: {}
		});

		const userOauthAccessTokenConnection = sequelizeConnection({
			name: "userOauthAccessToken",
			nodeType: OauthAccessTokenType,
			target: User.OauthAccessTokens,
			orderBy: new GraphQLEnumType({
				name: "UserOauthAccessTokenOrderBy",
				values: {
					ID: { value: ["id", "ASC"] }
				}
			}),
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {
				total: {
					type: GraphQLInt,
					resolve: ({ source }) => source.countOauthAccessTokens()
				}
			},
			edgeFields: {}
		});

		const userOauthCodeConnection = sequelizeConnection({
			name: "userOauthCode",
			nodeType: OauthCodeType,
			target: User.OauthCodes,
			orderBy: new GraphQLEnumType({
				name: "UserOauthCodeOrderBy",
				values: {
					ID: { value: ["id", "ASC"] }
				}
			}),
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {
				total: {
					type: GraphQLInt,
					resolve: ({ source }) => source.countOauthCodes()
				}
			},
			edgeFields: {}
		});

		const userOauthClientConnection = sequelizeConnection({
			name: "userOauthClient",
			nodeType: OauthClientType,
			target: User.OauthClients,
			orderBy: new GraphQLEnumType({
				name: "UserOauthClientOrderBy",
				values: {
					ID: { value: ["id", "ASC"] }
				}
			}),
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {
				total: {
					type: GraphQLInt,
					resolve: ({ source }) => source.countOauthClients()
				}
			},
			edgeFields: {}
		});

		return {
			...attributeFields(User, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable("graphql.type.user.association", {
				permissions: {
					type: userPermissionConnection.connectionType,
					args: userPermissionConnection.connectionArgs,
					resolve: userPermissionConnection.resolve
				},
				oauthProviders: {
					type: userOauthProviderConnection.connectionType,
					args: userOauthProviderConnection.connectionArgs,
					resolve: userOauthProviderConnection.resolve
				},
				oauthAccessTokens: {
					type: userOauthAccessTokenConnection.connectionType,
					args: userOauthAccessTokenConnection.connectionArgs,
					resolve: userOauthAccessTokenConnection.resolve
				},
				oauthCodes: {
					type: userOauthCodeConnection.connectionType,
					args: userOauthCodeConnection.connectionArgs,
					resolve: userOauthCodeConnection.resolve
				},
				oauthClients: {
					type: userOauthClientConnection.connectionType,
					args: userOauthClientConnection.connectionArgs,
					resolve: userOauthClientConnection.resolve
				}
			})
		};
	},
	interfaces: [nodeInterface]
});
