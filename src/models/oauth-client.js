const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

const { CLIENT_SECRET_LENGTH } = require("lazuli-require")("lazuli-config");

const {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLBoolean,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const Sequelize = require("sequelize");

const { resolver, attributeFields } = require("graphql-sequelize");

// graphql-js prototypes are automatically extended
require("graphql-schema-utils");

const pick = require("lodash/pick");

/**
 * Generates the oauth client sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	let OAuthClient = sequelize.define(
		"oauth-client",
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
	 * The graphql object type for this model
	 * @type {GraphQLObjectType}
	 */
	OAuthClient.graphQLType = attributeFields(OAuthClient, {
		allowNull: false
	});

	/**
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	OAuthClient.associate = function({
		User,
		OAuthCode,
		OAuthAccessToken,
		OAuthRedirectUri
	}) {
		eventEmitter.emit("model.oauth-client.association.before", this);

		this.belongsTo(User, {
			as: "User",
			foreignKey: "user_id"
		});
		this.hasMany(OAuthCode, {
			as: "OAuthCodes",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});
		this.hasMany(OAuthAccessToken, {
			as: "OAuthAccessTokens",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});
		this.hasMany(OAuthRedirectUri, {
			as: "OAuthRedirectUris",
			foreignKey: "oauth_client_id",
			onDelete: "cascade",
			hooks: true
		});

		eventEmitter.emit("model.oauth-client.association.after", this);

		eventEmitter.emit("graphql.type.oauth-client.association.before", this);

		OAuthClient.graphQLType = OAuthClient.graphQLType.merge(
			new GraphQLObjectType({
				fields: valueFilter.filterable(
					"graphql.type.oauth-client.association",
					{
						user: {
							type: GraphQLNonNull(User.graphQLType),
							resolve: resolver(User)
						},
						oauthCodes: {
							type: GraphQLNonNull(
								GraphQLList(GraphQLNonNull(OAuthCode.graphQLType))
							),
							resolve: resolver(OAuthCode)
						},
						oauthAccessTokens: {
							type: GraphQLNonNull(
								GraphQLList(GraphQLNonNull(OAuthAccessToken.graphQLType))
							),
							resolve: resolver(OAuthAccessToken)
						},
						oauthRedirectUris: {
							type: GraphQLNonNull(
								GraphQLList(GraphQLNonNull(OAuthRedirectUri.graphQLType))
							),
							resolve: resolver(OAuthRedirectUri)
						}
					}
				)
			})
		);

		eventEmitter.emit("graphql.type.oauth-client.association.after", this);
	};

	eventEmitter.addListener("model.association", OAuthClient.associate);

	/**
	 * Generates a random secret
	 * @return {String} The random secret
	 */
	OAuthClient.generateSecret = function() {
		return cryptoUtilities.generateRandomString(CLIENT_SECRET_LENGTH);
	};

	/**
	 * Sets the secret after hashing it
	 * @param  {String} secret The secret to hash and store
	 * @return {void}
	 */
	OAuthClient.prototype.setSecret = function(secret) {
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
	OAuthClient.prototype.verifySecret = function(secret) {
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
	OAuthClient.prototype.verifyRedirectUri = function(redirectUri) {
		if (!this.get("OAuthRedirectUris")) {
			console.log(
				"OAuthRedirectUris wasn't included in this instance of OAuthClient!"
			);

			return false;
		}

		let uris = this.get("OAuthRedirectUris").map(uri => {
			return uri.get("uri");
		});

		for (var i = 0; i < uris.length; i++) {
			if (uris[i] === redirectUri) {
				return true;
			}
		}

		return false;
	};

	return OAuthClient;
};
