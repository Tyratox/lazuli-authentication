const Sequelize = require("sequelize");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const Permission = sequelize.define(
	"permission",
	valueFilter.filterable("model.permission.attributes", {
		permission: {
			type: Sequelize.STRING,
			unique: true
		}
	}),
	valueFilter.filterable("model.permission.options", {
		charset: "utf8",
		collate: "utf8_unicode_ci"
	})
);

/**
 * Associates this model with others
 * @param  {Object} models An object containing all registered database models
 * @return {void}
 */
Permission.associate = function(models) {
	eventEmitter.emit("model.permission.association.before", this);

	this.Users = this.belongsToMany(models.User, {
		as: "Users",
		foreignKey: "permissionId",
		otherKey: "userId",
		through: "permission_relations"
	});

	eventEmitter.emit("model.permission.association.after", this);

	this.graphQlType = require("../types/permission");
};

eventEmitter.addListener(
	"model.association",
	Permission.associate.bind(Permission)
);

module.exports = Permission;
