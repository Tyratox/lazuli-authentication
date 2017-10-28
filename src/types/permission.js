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

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const { nodeInterface, attributeFieldsCache } = require("lazuli-require")(
	"lazuli-core/sequelize"
);

const Permission = require("../models/permission");

/**
 * The permission type module
 * @module lazuli-authentication/types/permission
 */

/**
 * The graphql type for the permission
 * @class
 * @memberof module:lazuli-authentication/types/permission
 *
 * @type {GraphQLObjectType}
 * @version 1.0
 * @since 1.0
 *
 * @see module:lazuli-authentication/models/permission
 */
const PermissionType = new GraphQLObjectType({
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

module.exports = PermissionType;
