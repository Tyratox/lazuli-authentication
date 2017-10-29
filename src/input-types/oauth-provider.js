const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLBoolean,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList,
	GraphQLInputObjectType,
	GraphQLEnumType
} = require("graphql");

const valueFilter = require("lazuli-require")("lazuli-core/value-filter");

/**
 * The oauth provider input type module
 * @module lazuli-authentication/input-types/oauth-provider
 */

/**
 * The graphql input type for the oauth provider model
 * @class
 * @memberof module:lazuli-authentication/input-types/oauth-provider
 *
 * @type {GraphQLInputObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.input-types.oauth-provider.fields The graphql input fields
 *
 * @see module:lazuli-authentication/types/oauth-provider
 * @see module:lazuli-authentication/models/oauth-provider
 */
const OauthProviderInputType = new GraphQLInputObjectType({
	name: "OauthProvider",
	fields: valueFilter.filterable(
		"authentication.graphql.input-types.oauth-provider.fields",
		{
			id: { type: GraphQLInt },
			provider: { type: GraphQLString },
			accessToken: { type: GraphQLString },
			refreshToken: { type: GraphQLString }
		}
	)
});

module.exports = OauthProviderInputType;
