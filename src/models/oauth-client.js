const Sequelize = require("sequelize");

const { CLIENT_SECRET_LENGTH } = require("lazuli-require")("lazuli-config");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

const OauthRedirectUri = require("./oauth-redirect-uri");

const OauthClient = sequelize.define(
	"oauth_client",
	{
		name: {
			type: Sequelize.STRING
		},

		secretHash: {
			type: Sequelize.STRING
		},

		secretSalt: {
			type: Sequelize.STRING
		},

		secretAlgorithm: {
			type: Sequelize.STRING
		},

		trusted: {
			type: Sequelize.BOOLEAN,
			default: false
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
OauthClient.associate = function(models) {
	eventEmitter.emit("model.oauth-client.association.before", this);

	this.User = this.belongsTo(models.User, {
		as: "User",
		foreignKey: "userId"
	});

	this.OauthCodes = this.hasMany(models.OauthCode, {
		as: "OauthCodes",
		foreignKey: "oauthClientId",
		onDelete: "cascade",
		hooks: true
	});

	this.OauthAccessTokens = this.hasMany(models.OauthAccessToken, {
		as: "OauthAccessTokens",
		foreignKey: "oauthClientId",
		onDelete: "cascade",
		hooks: true
	});

	this.OauthRedirectUris = this.hasMany(models.OauthRedirectUri, {
		as: "OauthRedirectUris",
		foreignKey: "oauthClientId",
		onDelete: "cascade",
		hooks: true
	});

	eventEmitter.emit("model.oauth-client.association.after", this);

	this.graphQlType = require("../types/oauth-client");
};

eventEmitter.addListener(
	"model.association",
	OauthClient.associate.bind(OauthClient)
);

/**
 * Generates a random secret
 * @return {String} The random secret
 */
OauthClient.generateSecret = function() {
	return generateRandomString(CLIENT_SECRET_LENGTH);
};

/**
 * Sets the secret after hashing it
 * @param  {String} secret The secret to hash and store
 * @return {Promise}
 */
OauthClient.prototype.setSecret = function(secret) {
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
 * @param  {String} secret Checks whether this secret matches the stored one by hashing it with the stored salt
 * @return {Promise}       Whether the secrets match
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
 * Checks whether the passed uri is stored in the model as redirectUri
 * @param  {String} redirectUri The redirect uri to verify
 * @return {Promise}
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
