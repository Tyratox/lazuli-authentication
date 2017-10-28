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

const OauthProviderInputType = require("./oauth-provider");

const valueFilter = require("lazuli-require")("lazuli-core/value-filter");

/**
 * The user input type module
 * @module lazuli-authentication/input-types/user
 */

/**
 * The graphql input type for the user model
 * @class
 * @memberof module:lazuli-authentication/input-types/user
 *
 * @type {GraphQLInputObjectType}
 * @version 1.0
 * @since 1.0
 * 
 * @filterable {object} authentication.graphql.input-types.user.fields The graphql input fields
 *
 * @see module:lazuli-authentication/types/user
 * @see module:lazuli-authentication/models/user
 */
const UserInputType = new GraphQLInputObjectType({
	name: "User",
	fields: valueFilter.filterable(
		"authentication.graphql.input-types.user.fields",
		{
			id: { type: GraphQLInt },
			nameDisplay: { type: GraphQLString },
			nameFirst: { type: GraphQLString },
			nameLast: { type: GraphQLString },

			emailVerified: { type: GraphQLString },
			emailUnverified: { type: GraphQLString },
			emailVerificationCode: { type: GraphQLString },

			passwordHash: { type: GraphQLString },
			passwordSalt: { type: GraphQLString },
			passwordAlgorithm: { type: GraphQLString },

			passwordResetCode: { type: GraphQLString },
			passwordResetCodeExpirationDate: { type: GraphQLInt },

			permissions: { type: new GraphQLList(GraphQLString) },

			locale: { type: GraphQLString },

			created: { type: GraphQLInt },

			oauthProviders: {
				type: new GraphQLList(OauthProviderInputType)
			},

			profilePictureId: { type: GraphQLInt }
		}
	)
});

module.exports = UserInputType;
