const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

const Sequelize = require("sequelize");

const path = require("path");
const graphQlType = require(path.join(
	__dirname,
	"..",
	"types",
	"oauth-redirect-uri"
));

/**
  * Generates the oauth redirect uri sequelize model
  * @param {Object} eventEmitter The global event emitter
  * @param {Object} valueFilter The global value filter object
  * @param {Object} sequelize The sequelize object to define the model on
  */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	const { nodeInterface, attributeFieldsCache } = sequelize;

	const OauthRedirectUri = sequelize.define(
		"oauth_redirect_uri",
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
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	OauthRedirectUri.associate = function(models) {
		eventEmitter.emit("model.oauth-redirect-uri.association.before", this);

		this.OauthClient = this.belongsTo(models.OauthClient, {
			as: "OauthClient",
			foreignKey: "oauth_client_id"
		});

		eventEmitter.emit("model.oauth-redirect-uri.association.after", this);

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
		OauthRedirectUri.associate.bind(OauthRedirectUri)
	);

	return OauthRedirectUri;
};
