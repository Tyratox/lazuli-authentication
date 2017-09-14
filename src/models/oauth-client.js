const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

const { CLIENT_SECRET_LENGTH } = require("lazuli-require")("lazuli-config");

const Sequelize = require("sequelize");

const path = require("path");
const graphQlType = require(path.join(
	__dirname,
	"..",
	"types",
	"oauth-client"
));

/**
 * Generates the oauth client sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	const { nodeInterface, attributeFieldsCache } = sequelize;

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
			foreignKey: "user_id"
		});

		this.OauthCodes = this.hasMany(models.OauthCode, {
			as: "OauthCodes",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});

		this.OauthAccessTokens = this.hasMany(models.OauthAccessToken, {
			as: "OauthAccessTokens",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});

		this.OauthRedirectUris = this.hasMany(models.OauthRedirectUri, {
			as: "OauthRedirectUris",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});

		eventEmitter.emit("model.oauth-client.association.after", this);

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
		OauthClient.associate.bind(OauthClient)
	);

	/**
	 * Generates a random secret
	 * @return {String} The random secret
	 */
	OauthClient.generateSecret = function() {
		return cryptoUtilities.generateRandomString(CLIENT_SECRET_LENGTH);
	};

	/**
	 * Sets the secret after hashing it
	 * @param  {String} secret The secret to hash and store
	 * @return {void}
	 */
	OauthClient.prototype.setSecret = function(secret) {
		let { hash, salt, algorithm } = cryptoUtilities.generateHash(secret);

		this.set({
			secretHash: hash,
			secretSalt: salt,
			secretAlgorithm: algorithm
		});
	};

	/**
	 * Verifies a secret
	 * @param  {String} secret Checks whether this secret matches the stored one by hashing it with the stored salt
	 * @return {Boolean}        Whether the secrets match
	 */
	OauthClient.prototype.verifySecret = function(secret) {
		let { hash } = cryptoUtilities.generateHash(
			secret,
			this.get("secretSalt"),
			this.get("secretAlgorithm")
		);

		let {
			hash: newHash,
			algorithm: newAlgorithm
		} = cryptoUtilities.generateHash(secret, this.get("secretSalt"));

		if (this.get("secretHash") && hash === this.get("secretHash")) {
			if (this.get("secretAlgorithm") !== newAlgorithm) {
				//if the algorithm changed, update the hash
				this.set({
					secretHash: newHash,
					secretSalt: salt,
					secretAlgorithm: newAlgorithm
				});

				return this.save().then(() => {
					return true;
				});
			}
			return Promise.resolve();
		}
		return Promise.reject();
	};

	/**
	 * Checks whether the passed uri is stored in the model as redirectUri
	 * @param  {String} redirectUri The redirect uri to verify
	 * @return {Boolean}            Whether the redirect uri is registered with this object
	 */
	OauthClient.prototype.verifyRedirectUri = function(redirectUri) {
		if (!this.get("OauthRedirectUris")) {
			console.log(
				"OauthRedirectUris wasn't included in this instance of OauthClient!"
			);

			return false;
		}

		let uris = this.get("OauthRedirectUris").map(uri => {
			return uri.get("uri");
		});

		for (var i = 0; i < uris.length; i++) {
			if (uris[i] === redirectUri) {
				return true;
			}
		}

		return false;
	};

	return OauthClient;
};
