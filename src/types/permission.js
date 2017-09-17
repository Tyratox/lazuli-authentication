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

const Permission = require("../models/permission");

/**
 * The graphql object type for this model
 * @type {GraphQLObjectType}
 */

module.exports = new GraphQLObjectType({
	name: Permission.name,
	description: "A permission",
	fields: () => {
		const UserType = require("./user");

		const permissionUsersConnection = sequelizeConnection({
			name: "permissionUser",
			nodeType: UserType,
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
