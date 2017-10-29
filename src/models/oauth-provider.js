const { ENUM, STRING } = require("sequelize");

const { TOKEN_LENGTH, HASH_ALGORITHM, SALT_LENGTH } = require("lazuli-require")(
	"lazuli-config"
);

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

/**
 * The oauth provider sequelize module
 * @module lazuli-authentication/models/oauth-provider
 */

/**
 * The oauth provider sequelize model
 * @class
 * @memberof module:lazuli-authentication/models/oauth-provider
 * 
 * @type {OauthProvider}
 * @version 1.0
 * @since 1.0
 * 
 * @see module:lazuli-authentication/models/user
 */
const OauthProvider = sequelize.define("oauth_provider", {
	provider: {
		type: STRING
	},
	accessToken: {
		type: STRING
	},
	refreshToken: {
		type: STRING
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
 * @fires "authentication.model.oauth-provider.association"
 * 
 * @param {object} models The models to associate with
 * @param {module:lazuli-authentication/models/user.User} models.User The user model
 * @return {promise<void>}
 */
OauthProvider.associate = function({ User }) {
	/**
	 * The OauthProivder - User relation
	 * @since 1.0
	 * @type {BelongsTo}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-provider.OauthProvider
	 */
	this.User = this.belongsTo(User, {
		as: "User",
		foreignKey: "userId"
	});

	/**
	 * The related graphql type
	 * @since 1.0
	 * @type {module:lazuli-authentication/types/oauth-provider.OauthProviderType}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-provider.OauthProvider
	 * 
	 * @see module:lazuli-authentication/types/oauth-provider
	 */
	this.graphQlType = require("../types/oauth-provider");

	/**
     * Event that is fired before the password reset code and
	 * its expiration date are set during a password reset.
	 * This event can (and should) be used to hand the reset code
	 * the the user via e.g. email.
     *
     * @event "authentication.model.oauth-provider.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/oauth-provider.OauthProvider} OauthProvider The user model
     */
	return eventEmitter.emit("authentication.model.oauth-provider.association", {
		OauthProvider: this
	});
};

module.exports = OauthProvider;
