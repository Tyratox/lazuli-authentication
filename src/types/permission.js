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
 * @filterable {object} authentication.graphql.type.permission.association The association fields inside the graphql schema
 *
 * @see module:lazuli-authentication/models/permission
 */
const PermissionType = new GraphQLObjectType({
	name: Permission.name,
	description: "A permission",
	fields: () => {
		const UserType = require("./user");

		const usersConnection = sequelizeConnection({
			name: "PermissionUser",
			nodeType: UserType,
			target: Permission.Users
		});

		return {
			...attributeFields(Permission, {
				globalId: true,
				allowNull: false,
				cache: attributeFieldsCache
			}),
			...valueFilter.filterable(
				"authentication.graphql.type.permission.association",
				{
					users: {
						type: usersConnection.connectionType,
						arsg: usersConnection.connectionArgs,
						resolve: usersConnection.resolve
					}
				}
			)
		};
	},
	interfaces: [nodeInterface]
});

module.exports = PermissionType;
