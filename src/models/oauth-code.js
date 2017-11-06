const { STRING, DATE } = require("sequelize");

const { TOKEN_LENGTH } = require("lazuli-require")("lazuli-config");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

const OauthScope = require("./oauth-scope");

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
		type: STRING,
		unique: true
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
 * @param {module:lazuli-authentication/models/oauth-scope.OauthScope} models.OauthScope The oauth scope model
 * @return {promise<void>}
 */
OauthCode.associate = function({ User, OauthClient, OauthScope }) {
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
		foreignKey: "userId",
		hooks: true
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
		foreignKey: "oauthClientId",
		hooks: true
	});

	/**
	 * The OauthCode - OauthScope relation
	 * @since 1.0
	 * @type {BelongsToMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-code.OauthCode
	 */
	this.OauthScopes = this.belongsToMany(OauthScope, {
		as: "OauthScopes",
		foreignKey: "oauthCodeId",
		otherKey: "oauthScopeId",
		through: "oauth_code_scope_relations",
		hooks: true
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
     * Event that is fired after all internal associations have been created
	 * and additional ones can be added.
     *
     * @event "authentication.model.oauth-code.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/oauth-code.OauthCode} OauthCode The oauth code model
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
 * @param {number} userId The user id this auth code should be linked to
 * @param {number} clientId The client id this auth code should be linked to
 * @param {number} expires The timestamp of the time this code should expire
 * @return {promise<object>} The generated oauth code
 */
OauthCode.generateCode = function(userId, clientId, expires) {
	const code = generateRandomString(TOKEN_LENGTH);

	return this.create({
		hash: this.hashCode(code),
		userId,
		oauthClientId: clientId,
		expires
	}).then(oauthCode => {
		return Promise.resolve({ model: oauthCode, code });
	});
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

/**
 * Sets the scopes of the auth code
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method setScopeArray
 * @memberof module:lazuli-authentication/models/oauth-code.OauthCode
 *
 * @param  {array} [scopes=[]] An array of scopes to set to for this auth cpde
 * @return {promise<void>}
 */
OauthCode.prototype.setScopeArray = function(scopes = []) {
	return Promise.all(
		scopes.map(scope => {
			return OauthScope.findOrCreate({
				where: { scope },
				defaults: { scope }
			}).then(result => Promise.resolve(result[0]));
		})
	).then(scopeInstances => this.setOauthScopes(scopeInstances));
};

module.exports = OauthCode;
