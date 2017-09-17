const Sequelize = require("sequelize");

const { TOKEN_LENGTH, HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-require")(
	"lazuli-config"
);

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

const OauthProvider = sequelize.define(
	"oauth_provider",
	valueFilter.filterable("authentication-models-oauth-provider-attributes", {
		type: {
			type: Sequelize.ENUM,
			values: ["google", "facebook"]
		},
		accessToken: {
			type: Sequelize.STRING
		},
		refreshToken: {
			type: Sequelize.STRING
		}
	}),
	valueFilter.filterable("authentication-models-oauth-provider-options", {
		charset: "utf8",
		collate: "utf8_unicode_ci"
	})
);

/**
 * Associates this model with others
 * @param  {Object} models An object containing all registered database models
 * @return {void}
 */
OauthProvider.associate = function(models) {
	eventEmitter.emit("model.oauth-provider.association.before", this);

	this.User = this.belongsTo(models.User, {
		as: "User",
		foreignKey: "user_id"
	});

	eventEmitter.emit("model.oauth-provider.association.before", this);

	this.graphQlType = require("../types/oauth-provider");
};

eventEmitter.addListener(
	"model.association",
	OauthProvider.associate.bind(OauthProvider)
);

module.exports = OauthProvider;
