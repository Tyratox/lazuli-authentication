const { STRING } = require("sequelize");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

/**
 * The permission sequelize module
 * @module lazuli-authentication/models/permission
 */

/**
 * The permission sequelize model
 * @class
 * @memberof module:lazuli-authentication/models/permission
 * 
 * @type {Permission}
 * @version 1.0
 * @since 1.0
 * 
 * @see module:lazuli-authentication/models/user
 */
const Permission = sequelize.define("permission", {
	permission: {
		type: STRING,
		unique: true
	}
});

/**
 * Associates this model with others
 * @version 1.0
 * @since 1.0
 * 
 * @static
 * @public
 * 
 * @fires "authentication.model.permission.association"
 * 
 * @param {object} models The models to associate with
 * @param {module:lazuli-authentication/models/user.User} models.User The user model
 * @return {promise<void>}
 */
Permission.associate = function({ User }) {
	/**
	 * The Permission - User relation
	 * @since 1.0
	 * @type {BelongsToMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/permission.Permission
	 */
	this.Users = this.belongsToMany(User, {
		as: "Users",
		foreignKey: "permissionId",
		otherKey: "userId",
		through: "permission_relations",
		hooks: true
	});

	/**
	 * The related graphql type
	 * @since 1.0
	 * @type {module:lazuli-authentication/types/permission.PermissionType}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/permission.Permission
	 * 
	 * @see module:lazuli-authentication/types/permission
	 */
	this.graphQlType = require("../types/permission");

	/**
     * Event that is fired after all internal associations have been created
	 * and additional ones can be added.
     *
     * @event "authentication.model.permission.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/permission.Permission} Permission The permission model
     */
	return eventEmitter.emit("authentication.model.permission.association", {
		Permission: this
	});
};

module.exports = Permission;
