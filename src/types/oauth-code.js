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
	{ OauthCode, User, OauthClient },
	nodeInterface,
	attributeFieldsCache
) => {
	/**
   * The graphql object type for this model
   * @type {GraphQLObjectType}
   */
	const oauthCodeType = new GraphQLObjectType({
		name: OauthCode.name,
		description: "An oauth code",
		fields: () => {
			const oauthCodeUserConnection = sequelizeConnection({
				name: "oauthCodeUser",
				nodeType: User.graphQlType,
				target: OauthCode.User,
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			const oauthCodeOauthClientConnection = sequelizeConnection({
				name: "oauthCodeOauthClient",
				nodeType: OauthClient.graphQlType,
				target: OauthCode.OauthClient,
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			return {
				...attributeFields(OauthCode, {
					globalId: true,
					allowNull: false,
					cache: attributeFieldsCache
				}),
				...valueFilter.filterable("graphql.type.oauth-code.association", {
					user: {
						type: oauthCodeUserConnection.connectionType,
						args: oauthCodeUserConnection.connectionArgs,
						resolve: oauthCodeUserConnection.resolve
					},
					oauthClient: {
						type: oauthCodeOauthClientConnection.connectionType,
						args: oauthCodeOauthClientConnection.connectionArgs,
						resolve: oauthCodeOauthClientConnection.resolve
					}
				})
			};
		},
		interfaces: [nodeInterface]
	});

	return oauthCodeType;
};
