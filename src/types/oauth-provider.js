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
	{ OauthProvider, User },
	nodeInterface,
	attributeFieldsCache
) => {
	/**
   * The graphql object type for this model
   * @type {GraphQLObjectType}
   */
	const oauthProviderType = new GraphQLObjectType({
		name: OauthProvider.name,
		description: "An oauth provider",
		fields: () => {
			const oauthProviderUserConnection = sequelizeConnection({
				name: "oauthProviderUser",
				nodeType: User.graphQlType,
				target: OauthProvider.User,
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {},
				edgeFields: {}
			});

			return {
				...attributeFields(OauthProvider, {
					globalId: true,
					allowNull: false,
					cache: attributeFieldsCache
				}),
				...valueFilter.filterable("graphql.type.oauth-provider.association", {
					oauthClients: {
						type: oauthProviderUserConnection.connectionType,
						arsg: oauthProviderUserConnection.connectionArgs,
						resolve: oauthProviderUserConnection.resolve
					}
				})
			};
		},
		interfaces: [nodeInterface]
	});

	return oauthProviderType;
};
