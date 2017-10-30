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
 * The oauth provider type module
 * @module lazuli-authentication/types/oauth-provider
 */

/**
 * The graphql type for the oauth provider
 * @class
 * @memberof module:lazuli-authentication/types/oauth-provider
 *
 * @type {GraphQLObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.type.oauth-provider.association The association fields inside the graphql schema
 *
 * @see module:lazuli-authentication/models/oauth-provider
 */
const OauthProviderType = new GraphQLObjectType({
	name: OauthProvider.name,
	description: "An oauth provider",
	fields: () => {
		const UserType = require("./user");

		const oauthProviderUserConnection = sequelizeConnection({
			name: "oauthProviderUser",
			nodeType: UserType,
			target: OauthProvider.User,
			where: (key, value, currentWhere) => {
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
			...valueFilter.filterable(
				"authentication.graphql.type.oauth-provider.association",
				{
					oauthClients: {
						type: oauthProviderUserConnection.connectionType,
						arsg: oauthProviderUserConnection.connectionArgs,
						resolve: oauthProviderUserConnection.resolve
					}
				}
			)
		};
	},
	interfaces: [nodeInterface]
});

module.exports = OauthProviderType;
