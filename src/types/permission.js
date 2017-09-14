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

module.exports = (
	eventEmitter,
	valueFilter,
	{ Permission, User },
	nodeInterface,
	attributeFieldsCache
) => {
	/**
   * The graphql object type for this model
   * @type {GraphQLObjectType}
   */
	const permissionType = new GraphQLObjectType({
		name: Permission.name,
		description: "A permission",
		fields: () => {
			const permissionUsersConnection = sequelizeConnection({
				name: "permissionUser",
				nodeType: User.graphQlType,
				target: Permission.Users,
				orderBy: new GraphQLEnumType({
					name: "PermissionUserOrderBy",
					values: {
						ID: { value: ["id", "ASC"] }
					}
				}),
				where: function(key, value, currentWhere) {
					return { [key]: value };
				},
				connectionFields: {
					total: {
						type: GraphQLInt,
						resolve: ({ source }) => source.countUsers()
					}
				},
				edgeFields: {}
			});

			return {
				...attributeFields(Permission, {
					globalId: true,
					allowNull: false,
					cache: attributeFieldsCache
				}),
				...valueFilter.filterable("graphql.type.permission.association", {
					users: {
						type: permissionUsersConnection.connectionType,
						arsg: permissionUsersConnection.connectionArgs,
						resolve: permissionUsersConnection.resolve
					}
				})
			};
		},
		interfaces: [nodeInterface]
	});

	return permissionType;
};
