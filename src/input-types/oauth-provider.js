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

const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);

module.exports = new GraphQLInputObjectType({
	name: "OauthProviderInputType",
	fields: valueFilter.filterable("graphql.input-types.oauth-provider.fields", {
		type: {
			id: { type: GraphQLInt },
			type: new GraphQLEnumType({
				name: "OauthProviderType",
				values: {
					FACEBOOK: { value: "facebook" },
					GOOGLE: { value: "google" }
				}
			})
		},
		accessToken: { type: GraphQLString },
		refreshToken: { type: GraphQLString }
	})
});
