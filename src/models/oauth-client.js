const Promise = require("bluebird");
const { STRING, BOOLEAN } = require("sequelize");

const { CLIENT_SECRET_LENGTH } = require("lazuli-require")("lazuli-config");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

const OauthRedirectUri = require("./oauth-redirect-uri");

/**
 * The access token module
 * @module lazuli-authentication/models/oauth-client
 */

/**
 * The oauth client sequelize model
 * @class
 * @memberof module:lazuli-authentication/models/oauth-client
 * 
 * @type {OauthClient}
 * @version 1.0
 * @since 1.0
 * 
 * @see module:lazuli-authentication/models/user
 * @see module:lazuli-authentication/models/oauth-code
 * @see module:lazuli-authentication/models/oauth-access-token
 * @see module:lazuli-authentication/models/oauth-redirect-uri
 */
const OauthClient = sequelize.define("oauth_client", {
	name: {
		type: STRING
	},

	secretHash: {
		type: STRING
	},

	secretSalt: {
		type: STRING
	},

	secretAlgorithm: {
		type: STRING
	},

	trusted: {
		type: BOOLEAN,
		default: false
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
 * @fires "authentication.model.oauth-client.association"
 * 
 * @param {object} models The models to associate with
 * @param {module:lazuli-authentication/models/user.User} models.User The user model
 * @param {module:lazuli-authentication/models/oauth-code.OauthCode} models.OauthCode The oauth code model
 * @param {module:lazuli-authentication/models/oauth-access-token.OauthAccessToken} models.OauthAccessToken The oauth access token model
 * @param {module:lazuli-authentication/models/oauth-redirect-uri.OauthRedirectUri} models.OauthRedirectUri The oauth redirect uri model
 * @return {promise<void>}
 */
OauthClient.associate = function({
	User,
	OauthCode,
	OauthAccessToken,
	OauthRedirectUri
}) {
	/**
	 * The OauthClient - User relation
	 * @since 1.0
	 * @type {BelongsTo}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-client.OauthClient
	 */
	this.User = this.belongsTo(User, {
		as: "User",
		foreignKey: "userId",
		hooks: true
	});

	/**
	 * The OauthClient - OauthCode relation
	 * @since 1.0
	 * @type {HasMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-client.OauthClient
	 */
	this.OauthCodes = this.hasMany(OauthCode, {
		as: "OauthCodes",
		foreignKey: "oauthClientId",
		onDelete: "cascade",
		hooks: true
	});

	/**
	 * The OauthClient - OauthAccessToken relation
	 * @since 1.0
	 * @type {HasMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-client.OauthClient
	 */
	this.OauthAccessTokens = this.hasMany(OauthAccessToken, {
		as: "OauthAccessTokens",
		foreignKey: "oauthClientId",
		onDelete: "cascade",
		hooks: true
	});

	/**
	 * The OauthClient - OauthRedirectUri relation
	 * @since 1.0
	 * @type {HasMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-client.OauthClient
	 */
	this.OauthRedirectUris = this.hasMany(OauthRedirectUri, {
		as: "OauthRedirectUris",
		foreignKey: "oauthClientId",
		onDelete: "cascade",
		hooks: true
	});

	/**
	 * The related graphql type
	 * @since 1.0
	 * @type {module:lazuli-authentication/types/oauth-client.OauthClientType}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-client.OauthClient
	 * 
	 * @see module:lazuli-authentication/types/oauth-client
	 */
	this.graphQlType = require("../types/oauth-client");

	/**
     * Event that is fired after all internal associations have been created
	 * and additional ones can be added.
     *
     * @event "authentication.model.oauth-client.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/oauth-client.OauthClient} OauthClient The oauth client model
     */
	return eventEmitter.emit("authentication.model.oauth-client.association", {
		OauthClient: this
	});
};

/**
 * Generates a random secret
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @static
 * 
 * @return {string} The random secret
 */
OauthClient.generateSecret = function() {
	return generateRandomString(CLIENT_SECRET_LENGTH);
};

/**
 * Sets the secret for this oauth client (after hashing it)
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @instance
 * @method updateSecret
 * @memberof module:lazuli-authentication/models/oauth-client.OauthClient
 * 
 * @param  {string} secret The secret to hash and store
 * @return {promise<module:lazuli-authentication/models/oauth-client.OauthClient>} The random secret
 */
OauthClient.prototype.updateSecret = function(secret) {
	let { hash, salt, algorithm } = generateHash(secret);

	this.set({
		secretHash: hash,
		secretSalt: salt,
		secretAlgorithm: algorithm
	});

	return this.save();
};

/**
 * Verifies a secret
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @instance
 * @method verifySecret
 * @memberof module:lazuli-authentication/models/oauth-client.OauthClient
 * 
 * @param {string} secret Checks whether this secret matches the stored one by hashing it with the stored salt
 * @return {promise<boolean>} The random secret
 */
OauthClient.prototype.verifySecret = function(secret) {
	let { hash } = generateHash(
		secret,
		this.get("secretSalt"),
		this.get("secretAlgorithm")
	);

	let { hash: newHash, algorithm: newAlgorithm } = generateHash(
		secret,
		this.get("secretSalt")
	);

	if (this.get("secretHash") && hash === this.get("secretHash")) {
		if (this.get("secretAlgorithm") !== newAlgorithm) {
			//if the algorithm changed, update the hash
			this.set({
				secretHash: newHash,
				secretSalt: salt,
				secretAlgorithm: newAlgorithm
			});

			return this.save().then(() => {
				return Promise.resolve(true);
			});
		}
		return Promise.resolve(true);
	}
	return Promise.resolve(false);
};

/**
 * Verifies a redirect uri
 * @version 1.0
 * @since 1.0
 * 
 * @public
 * @instance
 * @method verifyRedirectUri
 * @memberof module:lazuli-authentication/models/oauth-client.OauthClient
 * 
 * @param  {string} redirectUri The redirect uri to verify
 * @return {promise<boolean>} The random secret
 */
OauthClient.prototype.verifyRedirectUri = function(redirectUri) {
	let promise;
	if (!this.get("OauthRedirectUris")) {
		promise = this.reload({
			include: [
				{
					model: OauthRedirectUri,
					as: "OauthRedirectUris"
				}
			]
		});
	} else {
		promise = Promise.resolve(this);
	}

	return promise.then(() => {
		let uris = this.get("OauthRedirectUris").map(uri => {
			return uri.get("uri");
		});

		for (let i = 0; i < uris.length; i++) {
			if (uris[i] === redirectUri) {
				return Promise.resolve(true);
			}
		}

		return Promise.resolve(false);
	});
};

module.exports = OauthClient;
