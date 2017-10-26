const { STRING } = require("sequelize");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

/**
 * The permission sequelize model
 * @module lazuli-authentication/models/permission
 * 
 * @type {Permission}
 * @class
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
 * @memberof Permission
 * @static
 * @public
 * 
 * @fires "authentication.model.permission.association"
 * 
 * @param {object} models The models to associate with
 * @param {object} models.User The user model
 * @return {promise<void>}
 */
Permission.associate = function({ User }) {
	/**
	 * The Permission - User relation
	 * @since 1.0
	 * @type {object}
	 * @public
	 * @static
	 * @memberof Permission
	 */
	this.Users = this.belongsToMany(User, {
		as: "Users",
		foreignKey: "permissionId",
		otherKey: "userId",
		through: "permission_relations"
	});

	/**
	 * The related graphql type
	 * @since 1.0
	 * @type {object}
	 * @public
	 * @static
	 * @memberof Permission
	 * 
	 * @see module:lazuli-authentication/types/permission
	 */
	this.graphQlType = require("../types/permission");

	/**
     * Event that is fired before the password reset code and
	 * its expiration date are set during a password reset.
	 * This event can (and should) be used to hand the reset code
	 * the the user via e.g. email.
     *
     * @event "authentication.model.permission.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {object} Permission The user model
     */
	return eventEmitter.emit("authentication.model.permission.association", {
		Permission: this
	});
};

module.exports = Permission;
