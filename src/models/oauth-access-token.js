const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

const { TOKEN_LENGTH, HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-require")(
	"lazuli-config"
);

const Sequelize = require("sequelize");

const path = require("path");
const graphQlType = require(path.join(
	__dirname,
	"..",
	"types",
	"oauth-access-token"
));

/**
 * Generates the oauth access token sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	const { nodeInterface, attributeFieldsCache } = sequelize;

	const OauthAccessToken = sequelize.define(
		"oauth_access_token",
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
	OauthAccessToken.associate = function(models) {
		eventEmitter.emit("model.oauth-access-token.association.before", this);

		this.User = this.belongsTo(models.User, {
			as: "User",
			foreignKey: "user_id"
		});

		this.OauthClient = this.belongsTo(models.OauthClient, {
			as: "OauthClient",
			foreignKey: "oauth_client_id"
		});

		eventEmitter.emit("model.oauth-access-token.association.after", this);

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
		OauthAccessToken.associate.bind(OauthAccessToken)
	);

	/**
	 * Generates a random access token string
	 * @return {String} The generated token
	 */
	OauthAccessToken.generateToken = function() {
		let token = generateRandomString(TOKEN_LENGTH * 2);
		//HTTP Headers can only contain ASCII and 19 specific seperators
		//http://stackoverflow.com/questions/19028068/illegal-characters-in-http-headers

		return token.replace(
			/[^A-z0-9()<>@,;:\\/"\[\]\?={}]/g,
			parseInt(Math.random() * 10)
		);
	};

	/**
	 * Hashes a token (without) a salt because we couldn't determine the related user otherwise
	 * @param  {String} token The token to hash
	 * @return {String}       The generated hash
	 */
	OauthAccessToken.hashToken = function(token) {
		return generateHash(token, false, HASH_ALGORITHM, SALT_LENGTH).hash;
	};

	/**
	 * Tries to find the database model based on the passed token
	 * @param  {String} token The received access token
	 * @return {Promise}      The sequelize find response
	 */
	OauthAccessToken.findByToken = function(token) {
		return this.findOne({ where: { hash: this.hashToken(token) } });
	};

	return OauthAccessToken;
};
