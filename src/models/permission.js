const Sequelize = require("sequelize");

const {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLNonNull
} = require("graphql");

const { resolver, attributeFields } = require("graphql-sequelize");

// graphql-js prototypes are automatically extended
require("graphql-schema-utils");

/**
  * Generates the permission sequelize model
	* @param {Object} eventEmitter The global event emitter
  * @param {Object} valueFilter The global value filter object
  * @param {Object} sequelize The sequelize object to define the model on
  */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	let Permission = sequelize.define(
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
	 * The graphql object type for this model
	 * @type {GraphQLObjectType}
	 */
	Permission.graphQLType = attributeFields(Permission, {
		allowNull: false
	});

	/**
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	Permission.associate = function({ User }) {
		eventEmitter.emit("model.permission.association.before", this);

		this.belongsToMany(User, {
			as: "Users",
			foreignKey: "permission_id",
			otherKey: "user_id",
			through: "permission_relations"
		});

		eventEmitter.emit("model.permission.association.after", this);

		eventEmitter.emit("graphql.type.permission.association.before", this);

		Permission.graphQLType = Permission.graphQLType.merge(
			new GraphQLObjectType({
				fields: valueFilter.filterable("graphql.type.permission.association", {
					users: {
						type: GraphQLNonNull(GraphQLList(GraphQLNonNull(User.graphQLType))),
						resolve: resolver(User)
					}
				})
			})
		);

		eventEmitter.emit("graphql.type.permission.association.after", this);
	};

	eventEmitter.addListener("model.association", Permission.associate);

	return Permission;
};
