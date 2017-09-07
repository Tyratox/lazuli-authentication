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

const Sequelize = require("sequelize");

const { resolver, attributeFields } = require("graphql-sequelize");

// graphql-js prototypes are automatically extended
require("graphql-schema-utils");

const { TOKEN_LENGTH } = require("lazuli-require")("lazuli-config");

/**
 * Generates the oauth code sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	let OAuthCode = sequelize.define(
		"oauth_code",
		{
			hash: {
				type: Sequelize.STRING
			},
			expires: {
				type: Sequelize.DATE
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
	OAuthCode.graphQLType = new GraphQLObjectType({
		name: "oauth_code",
		description: "An oauth code",
		fields: attributeFields(OAuthCode, {
			allowNull: false
		})
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
				name: "oauth_code",
				fields: valueFilter.filterable("graphql.type.oauth-code.association", {
					user: {
						type: new GraphQLNonNull(User.graphQLType),
						resolve: resolver(User)
					},
					oauthClient: {
						type: new GraphQLNonNull(OAuthClient.graphQLType),
						resolve: resolver(OAuthClient)
					}
				})
			})
		);
		eventEmitter.emit("graphql.type.oauth-code.association.after", this);
	};

	eventEmitter.addListener(
		"model.association",
		OAuthCode.associate.bind(OAuthCode)
	);

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
