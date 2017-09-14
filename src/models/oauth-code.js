const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

const Sequelize = require("sequelize");

const path = require("path");
const graphQlType = require(path.join(__dirname, "..", "types", "oauth-code"));

const { TOKEN_LENGTH } = require("lazuli-require")("lazuli-config");

/**
 * Generates the oauth code sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	const { nodeInterface, attributeFieldsCache } = sequelize;

	const OauthCode = sequelize.define(
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
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	OauthCode.associate = function(models) {
		eventEmitter.emit("model.oauth-code.association.before", this);

		this.User = this.belongsTo(models.User, {
			as: "User",
			foreignKey: "user_id"
		});

		this.OauthClient = this.belongsTo(models.OauthClient, {
			as: "OauthClient",
			foreignKey: "oauth_client_id"
		});

		eventEmitter.emit("model.oauth-code.association.after", this);

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
		OauthCode.associate.bind(OauthCode)
	);

	/**
	 * Generates a oauth code
	 * @return {String} The generated oauth code
	 */
	OauthCode.generateCode = function() {
		return cryptoUtilities.generateRandomString(TOKEN_LENGTH);
	};

	/**
	 * Hashes an oauth code without salt
	 * @param  {String} code      The code to hash
	 * @return {String}           The unsalted hash
	 */
	OauthCode.hashCode = function(code) {
		return cryptoUtilities.generateHash(code, false).hash;
	};

	/**
	 * Searches for an oauth code entry
	 * @param  {String} code  The unhashed oauth code
	 * @return {Promise}      A sequelize find promise
	 */
	OauthCode.findByCode = function(code) {
		return this.findOne({
			where: { hash: this.hashCode(code) }
		});
	};

	return OauthCode;
};
