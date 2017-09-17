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

const OauthCode = require("../models/oauth-code");
const UserType = require("../types/user");
const OauthClientType = require("../types/oauth-client");

/**
 * The graphql object type for this model
 * @type {GraphQLObjectType}
 */
module.exports = new GraphQLObjectType({
	name: OauthCode.name,
	description: "An oauth code",
	fields: () => {
		const oauthCodeUserConnection = sequelizeConnection({
			name: "oauthCodeUser",
			nodeType: UserType,
			target: OauthCode.User,
			where: function(key, value, currentWhere) {
				return { [key]: value };
			},
			connectionFields: {},
			edgeFields: {}
		});

		const oauthCodeOauthClientConnection = sequelizeConnection({
			name: "oauthCodeOauthClient",
			nodeType: OauthClientType,
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
