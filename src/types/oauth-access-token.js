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
	{ OauthAccessToken, User, OauthClient },
	nodeInterface,
	attributeFieldsCache
) => {
	/**
   * The graphql object type for this model
   * @type {GraphQLObjectType}
   */
	const oauthClientType = new GraphQLObjectType({
		name: OauthAccessToken.name,
		description: "An oauth access token",
		fields: () => {
			const oauthAccessTokenUserConnection = sequelizeConnection({
				name: "oauthAccessTokenUser",
				nodeType: User.graphQlType,
				target: OauthAccessToken.User,
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			const oauthAccessTokenOauthClientConnection = sequelizeConnection({
				name: "oauthAccessTokenOauthClient",
				nodeType: OauthClient.graphQlType,
				target: OauthAccessToken.OauthClient,
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			return {
				...attributeFields(OauthAccessToken, {
					globalId: true,
					allowNull: false,
					cache: attributeFieldsCache
				}),
				...valueFilter.filterable(
					"graphql.type.oauth-access-token.association",
					{
						user: {
							type: oauthAccessTokenUserConnection.connectionType,
							args: oauthAccessTokenUserConnection.connectionArgs,
							resolve: oauthAccessTokenUserConnection.resolve
						},
						oauthClient: {
							type: oauthAccessTokenOauthClientConnection.connectionType,
							args: oauthAccessTokenOauthClientConnection.connectionArgs,
							resolve: oauthAccessTokenOauthClientConnection.resolve
						}
					}
				)
			};
		},
		interfaces: [nodeInterface]
	});

	return oauthClientType;
};
