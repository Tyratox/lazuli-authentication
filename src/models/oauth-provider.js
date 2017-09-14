const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto-utilities.js");

const { TOKEN_LENGTH, HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-require")(
	"lazuli-config"
);

const Sequelize = require("sequelize");

const path = require("path");
const graphQlType = require(path.join(
	__dirname,
	"..",
	"types",
	"oauth-provider"
));

/**
 * Generates the oauth provider sequelize model
 * @param {Object} eventEmitter The global event emitter
 * @param {Object} valueFilter The global value filter object
 * @param {Object} sequelize The sequelize object to define the model on
 */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	const { nodeInterface, attributeFieldsCache } = sequelize;

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
		OauthProvider.associate.bind(OauthProvider)
	);

	return OauthProvider;
};
