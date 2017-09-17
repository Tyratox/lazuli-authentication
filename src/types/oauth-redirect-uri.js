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

const OauthRedirectUri = require("../models/oauth-redirect-uri");

/**
 * The graphql object type for this model
 * @type {GraphQLObjectType}
 */
module.exports = new GraphQLObjectType({
	name: OauthRedirectUri.name,
	description: "An oauth redirect uri",
	fields: () => {
		const OauthClientType = require("./oauth-client");

		const oauthRedirectUriConnection = sequelizeConnection({
			name: "oauthRedirectUriOauthClient",
			nodeType: OauthClientType,
			target: OauthRedirectUri.OauthClient,
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		return {
			...attributeFields(OauthRedirectUri, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable("graphql.type.oauth-redirect-uri.association", {
				oauthClients: {
					type: oauthRedirectUriConnection.connectionType,
					arsg: oauthRedirectUriConnection.connectionArgs,
					resolve: oauthRedirectUriConnection.resolve
				}
			})
		};
	},
	interfaces: [nodeInterface]
});
