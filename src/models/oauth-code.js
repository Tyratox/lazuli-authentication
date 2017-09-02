const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

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

const { TOKEN_LENGTH } = require("lazuli-require")("lazuli-config");

/**
 * Generates the oauth code sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 * @param {Object} DataTypes Sequelize datatypes
 */
module.exports = (eventEmitter, valueFilter, sequelize, DataTypes) => {
	let OAuthCode = sequelize.define(
		"oauth-code",
		{
			hash: {
				type: DataTypes.STRING
			},
			expires: {
				type: DataTypes.DATE
			}
		},
		{
			charset: "utf8",
			collate: "utf8_unicode_ci"
		}
	);

	/**
	 * The graphql object type for this model
	 * @type {GraphQLObjectType}
	 */
	OAuthCode.graphQLType = attributeFields(OAuthCode, {
		allowNull: false
	});

	/**
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	OAuthCode.associate = function({ User, OAuthClient }) {
		eventEmitter.emit("model.oauth-code.association.before", this);
		this.belongsTo(User, {
			as: "User",
			foreignKey: "user_id"
		});
		this.belongsTo(OAuthClient, {
			as: "OAuthClient",
			foreignKey: "oauth_client_id"
		});
		eventEmitter.emit("model.oauth-code.association.after", this);

		eventEmitter.emit("graphql.type.oauth-code.association.before", this);
		OAuthCode.graphQLType = OAuthCode.graphQLType.merge(
			new GraphQLObjectType({
				fields: valueFilter.filterable("graphql.type.oauth-code.association", {
					user: {
						type: GraphQLNonNull(User.graphQLType),
						resolve: resolver(User)
					},
					oauthClient: {
						type: GraphQLNonNull(OAuthClient.graphQLType),
						resolve: resolver(OAuthClient)
					}
				})
			})
		);
		eventEmitter.emit("graphql.type.oauth-code.association.after", this);
	};

	eventEmitter.addListener("model.association", OAuthCode.associate);

	/**
	 * Generates a oauth code
	 * @return {String} The generated oauth code
	 */
	OAuthCode.generateCode = function() {
		return cryptoUtilities.generateRandomString(TOKEN_LENGTH);
	};

	/**
	 * Hashes an oauth code without salt
	 * @param  {String} code      The code to hash
	 * @return {String}           The unsalted hash
	 */
	OAuthCode.hashCode = function(code) {
		return cryptoUtilities.generateHash(code, false).hash;
	};

	/**
	 * Searches for an oauth code entry
	 * @param  {String} code  The unhashed oauth code
	 * @return {Promise}      A sequelize find promise
	 */
	OAuthCode.findByCode = function(code) {
		return this.findOne({
			where: { hash: this.hashCode(code) }
		});
	};

	return OAuthCode;
};
