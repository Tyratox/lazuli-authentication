const { STRING, DATE } = require("sequelize");

const { TOKEN_LENGTH } = require("lazuli-require")("lazuli-config");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

/**
 * The oauth code sequelize module
 * @module lazuli-authentication/models/oauth-code
 */

/**
 * The oauth code sequelize model
 * @class
 * @memberof module:lazuli-authentication/models/oauth-code
 * 
 * @type {OauthCode}
 * @version 1.0
 * @since 1.0
 * 
 * @see module:lazuli-authentication/models/user
 * @see module:lazuli-authentication/models/oauth-client
 */
const OauthCode = sequelize.define("oauth_code", {
	hash: {
		type: STRING
	},
	expires: {
		type: DATE
	}
});

/**
 * Associates this model with others
 * @version 1.0
 * @since 1.0
 * 
 * @static
 * @public
 * 
 * @fires "authentication.model.oauth-code.association"
 * 
 * @param {object} models The models to associate with
 * @param {module:lazuli-authentication/models/user.User} models.User The user model
 * @param {module:lazuli-authentication/models/oauth-client.OauthClient} models.OauthClient The oauth client model
 * @return {promise<void>}
 */
OauthCode.associate = function({ User, OauthClient }) {
	/**
	 * The OauthCode - User relation
	 * @since 1.0
	 * @type {BelongsTo}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-code.OauthCode
	 */
	this.User = this.belongsTo(User, {
		as: "User",
		foreignKey: "userId"
	});

	/**
	 * The OauthCode - OauthClient relation
	 * @since 1.0
	 * @type {BelongsTo}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-code.OauthCode
	 */
	this.OauthClient = this.belongsTo(OauthClient, {
		as: "OauthClient",
		foreignKey: "oauthClientId"
	});

	/**
	 * The related graphql type
	 * @since 1.0
	 * @type {module:lazuli-authentication/types/oauth-code.OauthCodeType}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-code.OauthCode
	 * 
	 * @see module:lazuli-authentication/types/oauth-code
	 */
	this.graphQlType = require("../types/oauth-code");

	/**
     * Event that is fired before the password reset code and
	 * its expiration date are set during a password reset.
	 * This event can (and should) be used to hand the reset code
	 * the the user via e.g. email.
     *
     * @event "authentication.model.oauth-code.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/oauth-code.OauthCode} OauthCode The oauth client model
     */
	return eventEmitter.emit("authentication.model.oauth-code.association", {
		OauthCode: this
	});
};

/**
 * Generates a oauth code
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @static
 * 
 * @return {string} The generated oauth code
 */
OauthCode.generateCode = function() {
	return generateRandomString(TOKEN_LENGTH);
};

/**
 * Hashes an oauth code without salt
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @static
 * 
 * @param  {string} code The code to hash
 * @return {string} The unsalted hash
 */
OauthCode.hashCode = function(code) {
	return generateHash(code, false).hash;
};

/**
 * Searches for an oauth code entry
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @static
 * 
 * @param  {string} code  The unhashed oauth code
 * @return {promise<module:lazuli-authentication/models/oauth-code.OauthCode>} A sequelize find promise
 */
OauthCode.findByCode = function(code) {
	return this.findOne({
		where: { hash: this.hashCode(code) }
	});
};

module.exports = OauthCode;
