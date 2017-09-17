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

const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);

module.exports = new GraphQLInputObjectType({
	name: "UserInputType",
	fields: valueFilter.filterable("graphql.input-types.user.fields", {
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
	})
});
