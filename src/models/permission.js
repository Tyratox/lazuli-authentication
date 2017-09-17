const Sequelize = require("sequelize");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const sequelize = require("lazuli-require")("lazuli-core/globals/sequelize");

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
		foreignKey: "permission_id",
		otherKey: "user_id",
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
