const Promise = require("bluebird");
const { STRING, DATE } = require("sequelize");

const { TOKEN_LENGTH, HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-config");

const eventEmitter = require("lazuli-core/event-emitter");
const valueFilter = require("lazuli-core/value-filter");
const sequelize = require("lazuli-core/sequelize");
const {
	generateRandomString,
	generateHash
} = require("lazuli-core/utilities/crypto.js");

const OauthScope = require("./oauth-scope");

/**
 * The access token model
 * @module lazuli-authentication/models/oauth-access-token
 */

/**
 * The access token sequelize model
 * @class
 * @memberof module:lazuli-authentication/models/oauth-access-token
 * 
 * @type {OauthAccessToken}
 * @version 1.0
 * @since 1.0
 * 
 * @see module:lazuli-authentication/models/user
 * @see module:lazuli-authentication/models/oauth-client
 */
const OauthAccessToken = sequelize.define("oauth_access_token", {
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
 * @fires "authentication.model.oauth-access-token.association"
 * 
 * @param {object} models The models to associate with
 * @param {module:lazuli-authentication/models/user.User} models.User The user model
 * @param {module:lazuli-authentication/models/oauth-client.OauthClient} models.OauthClient The oauth client model
 * @return {promise<void>}
 */
OauthAccessToken.associate = function({ User, OauthClient }) {
	/**
	 * The OauthAccessToken - User relation
	 * @since 1.0
	 * @type {BelongsTo}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-access-token.OauthAccessToken
	 */
	this.User = this.belongsTo(User, {
		as: "User",
		foreignKey: "userId",
		hooks: true
	});

	/**
	 * The OauthAccessToken - OauthClient relation
	 * @since 1.0
	 * @type {BelongsTo}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-access-token.OauthAccessToken
	 */
	this.OauthClient = this.belongsTo(OauthClient, {
		as: "OauthClient",
		foreignKey: "oauthClientId",
		hooks: true
	});

	/**
	 * The OauthAccessToken - OauthScope relation
	 * @since 1.0
	 * @type {BelongsToMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-access-token.OauthAccessToken
	 */
	this.OauthScopes = this.belongsToMany(OauthScope, {
		as: "OauthScopes",
		foreignKey: "oauthAccessTokenId",
		otherKey: "oauthScopeId",
		through: "access_token_scope_relations",
		hooks: true
	});

	/**
	 * The related graphql type
	 * @since 1.0
	 * @type {module:lazuli-authentication/types/oauth-access-token.OauthAccessTokenType}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-access-token.OauthAccessToken
	 * 
	 * @see module:lazuli-authentication/types/oauth-access-token
	 */
	this.graphQlType = require("../types/oauth-access-token");

	/**
     * Event that is fired after all internal associations have been created
	 * and additional ones can be added.
     *
     * @event "authentication.model.oauth-access-token.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/oauth-access-token} OauthAccessToken The access token model
     */
	return eventEmitter.emit(
		"authentication.model.oauth-access-token.association",
		{
			OauthAccessToken: this
		}
	);
};
/**
 * Generates a random access token string
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @static
 * 
 * @param {number} userId The user id to associate the new token with
 * @param {number} oauthClientId The oauth client id to associate the new token with
 * @param {number} expires The expiration date of the new token
 * @return {promise<module:lazuli-authentication/models/oauth-access-token>} A promise that will return the generated token and the model
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
				return Promise.resolve({ model, token });
			});
		}
	});
};

/**
 * Hashes a token (without) a salt because we couldn't determine the related user otherwise
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @static
 * 
 * @param  {string} token The token to hash
 * @return {string} The generated hash
 */
OauthAccessToken.hashToken = function(token) {
	return generateHash(token, false, HASH_ALGORITHM, SALT_LENGTH).hash;
};

/**
 * Tries to find the database model based on the passed token
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @static
 * 
 * @param  {string} token The received access token
 * @return {promise<module:lazuli-authentication/models/oauth-access-token>} The sequelize find response
 */
OauthAccessToken.findByToken = function(token) {
	return this.findOne({ where: { hash: this.hashToken(token) } });
};

/**
 * Sets the scopes of the access token
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method setScopeArray
 * @memberof module:lazuli-authentication/models/oauth-access-token.OauthAccessToken
 *
 * @param  {array} [scopes=[]] An array of scopes to set to for this access token
 * @return {promise<void>}
 */
OauthAccessToken.prototype.setScopeArray = function(scopes = []) {
	return Promise.all(
		(promises = scopes.map(scope => {
			return OauthScope.findOrCreate({
				where: { scope },
				defaults: { scope }
			}).then(result => Promise.resolve(result[0]));
		}))
	).then(scopeInstances => this.setOauthScopes(scopeInstances));
};

module.exports = OauthAccessToken;
