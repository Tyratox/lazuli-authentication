const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

const { TOKEN_LENGTH, HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-require")(
	"lazuli-config"
);

const {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const { resolver, attributeFields } = require("graphql-sequelize");

// graphql-js prototypes are automatically extended
require("graphql-schema-utils");

const pick = require("lodash/pick");

/**
 * Generates the oauth provider sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 * @param {Object} DataTypes Sequelize datatypes
 */
module.exports = (eventEmitter, valueFilter, sequelize, DataTypes) => {
	let OAuthProvider = sequelize.define(
		"oauth-provider",
		valueFilter.filterable("authentication-models-oauth-provider-attributes", {
			type: {
				type: DataTypes.ENUM,
				values: ["google", "facebook"]
			},
			accessToken: {
				type: DataTypes.STRING
			},
			refreshToken: {
				type: DataTypes.STRING
			}
		}),
		valueFilter.filterable("authentication-models-oauth-provider-options", {
			charset: "utf8",
			collate: "utf8_unicode_ci"
		})
	);

	/**
	 * The graphql object type for this model
	 * @type {GraphQLObjectType}
	 */
	OAuthProvider.graphQLType = attributeFields(OAuthProvider, {
		allowNull: false
	});

	/**
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	OAuthProvider.associate = function({ User }) {
		eventEmitter.emit("model.oauth-provider.association.before", this);
		this.belongsTo(User, {
			as: "User",
			foreignKey: "user_id"
		});
		eventEmitter.emit("model.oauth-provider.association.before", this);

		eventEmitter.emit("graphql.type.oauth-provider.association.before", this);
		OAuthProvider.graphQLType = OAuthProvider.graphQLType.merge(
			new GraphQLObjectType({
				fields: valueFilter.filterable(
					"graphql.type.oauth-provider.association",
					{
						user: {
							type: GraphQLNonNull(User.graphQLType),
							resolve: resolver(User)
						}
					}
				)
			})
		);
		eventEmitter.emit("graphql.type.oauth-provider.association.after", this);
	};

	eventEmitter.addListener("model.association", OAuthProvider.associate);

	return OAuthProvider;
};
