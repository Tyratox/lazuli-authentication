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

module.exports = new GraphQLInputObjectType({
	name: "OauthProvider",
	fields: valueFilter.filterable("graphql.input-types.oauth-provider.fields", {
		id: { type: GraphQLInt },
		provider: {
			type: new GraphQLEnumType({
				name: "Provider",
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
