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

const OauthProvider = require("../models/oauth-provider");

/**
 * The graphql object type for this model
 * @type {GraphQLObjectType}
 */
module.exports = new GraphQLObjectType({
	name: OauthProvider.name,
	description: "An oauth provider",
	fields: () => {
		const UserType = require("./user");

		const oauthProviderUserConnection = sequelizeConnection({
			name: "oauthProviderUser",
			nodeType: UserType,
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
