const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList,
	GraphQLInputObjectType
} = require("graphql");

const valueFilter = require("lazuli-core/value-filter");

/**
 * The oauth client input type module
 * @module lazuli-authentication/input-types/oauth-client
 */

/**
 * The graphql input type for the oauth client model
 * @class
 * @memberof module:lazuli-authentication/input-types/oauth-client
 *
 * @type {GraphQLInputObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.input-types.oauth-client.fields The graphql input fields
 *
 * @see module:lazuli-authentication/types/oauth-client
 * @see module:lazuli-authentication/models/oauth-client
 */
const OauthClientInputType = new GraphQLInputObjectType({
	name: "OauthClient",
	fields: valueFilter.filterable(
		"authentication.graphql.input-types.oauth-client.fields",
		{
			id: { type: GraphQLInt },
			name: { type: GraphQLString },
			oauthRedirectUris: { type: new GraphQLList(GraphQLString) },
			userId: { type: GraphQLInt },
			trusted: { type: GraphQLBoolean }
		}
	)
});

module.exports = OauthClientInputType;
