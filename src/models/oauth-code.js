const Sequelize = require("sequelize");

const { TOKEN_LENGTH } = require("lazuli-require")("lazuli-config");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

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
		foreignKey: "userId"
	});

	this.OauthClient = this.belongsTo(models.OauthClient, {
		as: "OauthClient",
		foreignKey: "oauthClientId"
	});

	eventEmitter.emit("model.oauth-code.association.after", this);

	this.graphQlType = require("../types/oauth-client");
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
	return generateRandomString(TOKEN_LENGTH);
};

/**
 * Hashes an oauth code without salt
 * @param  {String} code      The code to hash
 * @return {String}           The unsalted hash
 */
OauthCode.hashCode = function(code) {
	return generateHash(code, false).hash;
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

module.exports = OauthCode;
