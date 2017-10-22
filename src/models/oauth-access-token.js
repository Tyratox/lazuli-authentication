const Sequelize = require("sequelize");

const { TOKEN_LENGTH, HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-require")(
	"lazuli-config"
);

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

const OauthAccessToken = sequelize.define(
	"oauth_access_token",
	{
		hash: {
			type: Sequelize.STRING,
			unique: true
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
		foreignKey: "userId"
	});

	this.OauthClient = this.belongsTo(models.OauthClient, {
		as: "OauthClient",
		foreignKey: "oauthClientId"
	});

	eventEmitter.emit("model.oauth-access-token.association.after", this);

	this.graphQlType = require("../types/oauth-access-token");
};

eventEmitter.addListener(
	"model.association",
	OauthAccessToken.associate.bind(OauthAccessToken)
);

/**
 * Generates a random access token string
 * @param userId
 * @param oauthClientId
 * @param expires
 * @return {Promise} A promise that will return the generated token and the model
 */
OauthAccessToken.generateToken = function(userId, oauthClientId, expires) {
	let token = generateRandomString(TOKEN_LENGTH * 2);
	//HTTP Headers can only contain ASCII and 19 specific seperators
	//http://stackoverflow.com/questions/19028068/illegal-characters-in-http-headers

	token = token.replace(
		/[^A-z0-9()<>@,;:\\/"\[\]\?={}]/g,
		parseInt(Math.random() * 10)
	);

	return this.findByToken(token).then(accessTokenModel => {
		if (accessTokenModel) {
			return this.generateToken(userId, oauthClientId, expires);
		} else {
			return this.create({
				hash: this.hashToken(token),
				expires,
				userId,
				oauthClientId
			}).then(model => {
				return { token, model };
			});
		}
	});
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

module.exports = OauthAccessToken;
