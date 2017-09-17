const Sequelize = require("sequelize");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const sequelize = require("lazuli-require")("lazuli-core/globals/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

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

	this.graphQlType = require("../types/oauth-redirect-uri");
};

eventEmitter.addListener(
	"model.association",
	OauthRedirectUri.associate.bind(OauthRedirectUri)
);

module.exports = OauthRedirectUri;
