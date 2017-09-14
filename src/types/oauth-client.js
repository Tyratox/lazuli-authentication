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
	{ OauthClient, User, OauthCode, OauthAccessToken, OauthRedirectUri },
	nodeInterface,
	attributeFieldsCache
) => {
	/**
   * The graphql object type for this model
   * @type {GraphQLObjectType}
   */
	const oauthClientType = new GraphQLObjectType({
		name: OauthClient.name,
		description: "An oauth client",
		fields: () => {
			const oauthClientUserConnection = sequelizeConnection({
				name: "oauthClientUser",
				nodeType: User.graphQlType,
				target: OauthClient.User,
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			const oauthClientOauthCodeConnection = sequelizeConnection({
				name: "oauthClientOauthCode",
				nodeType: OauthCode.graphQlType,
				target: OauthClient.OauthCodes,
				orderBy: new GraphQLEnumType({
					name: "OauthClientOauthCodeOrderBy",
					values: {
						ID: { value: ["id", "ASC"] }
					}
				}),
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			const oauthClientOauthAccessTokenConnection = sequelizeConnection({
				name: "oauthClientOauthAccessToken",
				nodeType: OauthAccessToken.graphQlType,
				target: OauthClient.OauthAccessTokens,
				orderBy: new GraphQLEnumType({
					name: "OauthClientOauthAccessTokenOrderBy",
					values: {
						ID: { value: ["id", "ASC"] }
					}
				}),
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			const oauthClientOauthRedirectUriConnection = sequelizeConnection({
				name: "oauthClientOauthRedirectUri",
				nodeType: OauthRedirectUri.graphQlType,
				target: OauthClient.OauthRedirectUris,
				orderBy: new GraphQLEnumType({
					name: "OauthClientRedirectUriOrderBy",
					values: {
						ID: { value: ["id", "ASC"] }
					}
				}),
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			return {
				...attributeFields(OauthClient, {
					globalId: true,
					allowNull: false,
					cache: attributeFieldsCache
				}),
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
			};
		},
		interfaces: [nodeInterface]
	});

	return oauthClientType;
};
