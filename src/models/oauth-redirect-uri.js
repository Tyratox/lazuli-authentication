const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

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
  * Generates the oauth redirect uri sequelize model
  * @param {Object} eventEmitter The global event emitter
  * @param {Object} valueFilter The global value filter object
  * @param {Object} sequelize The sequelize object to define the model on
  */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	let OAuthRedirectUri = sequelize.define(
		"oauth-redirect-uri",
		valueFilter.filterable("model.oauth-redirect-uri.attributes", {
			uri: {
				type: Sequelize.STRING
			}
		}),
		valueFilter.filterable("model.oauth-redirect-uri.options", {
			charset: "utf8",
			collate: "utf8_unicode_ci"
		})
	);

	/**
	 * The graphql object type for this model
	 * @type {GraphQLObjectType}
	 */
	OAuthRedirectUri.graphQLType = attributeFields(OAuthRedirectUri, {
		allowNull: false
	});

	/**
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	OAuthRedirectUri.associate = function({ OAuthClient }) {
		eventEmitter.emit("model.oauth-redirect-uri.association.before", this);
		this.belongsTo(OAuthClient, {
			as: "OAuthClient",
			foreignKey: "oauth_client_id"
		});
		eventEmitter.emit("model.oauth-redirect-uri.association.after", this);

		eventEmitter.emit(
			"graphql.type.oauth-redirect-uri.association.before",
			this
		);

		OAuthRedirectUri.graphQLType = OAuthRedirectUri.graphQLType.merge(
			new GraphQLObjectType({
				fields: valueFilter.filterable(
					"graphql.type.oauth-redirect-uri.association",
					{
						oauthClients: {
							type: GraphQLNonNull(
								GraphQLList(GraphQLNonNull(OAuthClient.graphQLType))
							),
							resolve: resolver(OAuthClient)
						}
					}
				)
			})
		);

		eventEmitter.emit(
			"graphql.type.oauth-redirect-uri.association.after",
			this
		);
	};

	eventEmitter.addListener("model.association", OAuthRedirectUri.associate);

	return OAuthRedirectUri;
};
