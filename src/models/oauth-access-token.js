const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

const { TOKEN_LENGTH, HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-require")(
	"lazuli-config"
);

const {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const Sequelize = require("sequelize");

const { resolver, attributeFields } = require("graphql-sequelize");

// graphql-js prototypes are automatically extended
require("graphql-schema-utils");

/**
 * Generates the oauth access token sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	let OAuthAccessToken = sequelize.define(
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
	 * The graphql object type for this model
	 * @type {GraphQLObjectType}
	 */
	OAuthAccessToken.graphQLType = new GraphQLObjectType({
		name: "oauth_access_token",
		description: "An oauth access token",
		fields: attributeFields(OAuthAccessToken, {
			allowNull: false
		})
	});

	OAuthAccessToken.graphQLType.getFields();

	/**
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	OAuthAccessToken.associate = function({ User, OAuthClient }) {
		eventEmitter.emit("model.oauth-access-token.association.before", this);

		this.belongsTo(User, {
			as: "User",
			foreignKey: "user_id"
		});
		this.belongsTo(OAuthClient, {
			as: "OAuthClient",
			foreignKey: "oauth_client_id"
		});

		eventEmitter.emit("model.oauth-access-token.association.after", this);

		eventEmitter.emit(
			"graphql.type.oauth-access-token.association.before",
			this
		);

		OAuthAccessToken.graphQLType = OAuthAccessToken.graphQLType.merge(
			new GraphQLObjectType({
				name: "oauth_access_token",
				fields: valueFilter.filterable(
					"graphql.type.oauth-access-token.association",
					{
						user: {
							type: new GraphQLNonNull(User.graphQLType),
							resolve: resolver(User)
						},
						oauthClient: {
							type: new GraphQLNonNull(OAuthClient.graphQLType),
							resolve: resolver(OAuthClient)
						}
					}
				)
			})
		);
		eventEmitter.emit(
			"graphql.type.oauth-access-token.association.after",
			this
		);
	};

	eventEmitter.addListener(
		"model.association",
		OAuthAccessToken.associate.bind(OAuthAccessToken)
	);

	/**
	 * Generates a random access token string
	 * @return {String} The generated token
	 */
	OAuthAccessToken.generateToken = function() {
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
	OAuthAccessToken.hashToken = function(token) {
		return generateHash(token, false, HASH_ALGORITHM, SALT_LENGTH).hash;
	};

	/**
	 * Tries to find the database model based on the passed token
	 * @param  {String} token The received access token
	 * @return {Promise}      The sequelize find response
	 */
	OAuthAccessToken.findByToken = function(token) {
		return this.findOne({ where: { hash: this.hashToken(token) } });
	};

	return OAuthAccessToken;
};
