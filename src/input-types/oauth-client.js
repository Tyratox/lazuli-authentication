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

const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);

module.exports = new GraphQLInputObjectType({
	name: "OauthClient",
	fields: valueFilter.filterable("graphql.input-types.oauth-client.fields", {
		id: { type: GraphQLInt },
		name: { type: GraphQLString },
		oauthRedirectUris: { type: new GraphQLList(GraphQLString) },
		userId: { type: GraphQLInt },
		trusted: { type: GraphQLBoolean }
	})
});
