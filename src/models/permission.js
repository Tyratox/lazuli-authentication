const Sequelize = require("sequelize");

const path = require("path");
const graphQlType = require(path.join(__dirname, "..", "types", "permission"));

/**
  * Generates the permission sequelize model
	* @param {Object} eventEmitter The global event emitter
  * @param {Object} valueFilter The global value filter object
  * @param {Object} sequelize The sequelize object to define the model on
  */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	const { nodeInterface, attributeFieldsCache } = sequelize;

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

		this.graphQlType = graphQlType(
			eventEmitter,
			valueFilter,
			models,
			nodeInterface,
			attributeFieldsCache
		);
	};

	eventEmitter.addListener(
		"model.association",
		Permission.associate.bind(Permission)
	);

	return Permission;
};
