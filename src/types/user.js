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

module.exports = (
	eventEmitter,
	valueFilter,
	{ User, OauthAccessToken, OauthClient, OauthCode, OauthProvider, Permission },
	nodeInterface,
	attributeFieldsCache
) => {
	/**
   * The graphql object type for this model
   * @type {GraphQLObjectType}
   */
	const userType = new GraphQLObjectType({
		name: User.name,
		description: "A user",
		fields: () => {
			const userPermissionConnection = sequelizeConnection({
				name: "userPermission",
				nodeType: Permission.graphQlType,
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
				nodeType: OauthProvider.graphQlType,
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
				nodeType: OauthAccessToken.graphQlType,
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
				nodeType: OauthCode.graphQlType,
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
				nodeType: OauthClient.graphQlType,
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

	return userType;
};
