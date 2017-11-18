const Promise = require("bluebird");
const { STRING } = require("sequelize");

const eventEmitter = require("lazuli-core/event-emitter");
const valueFilter = require("lazuli-core/value-filter");
const sequelize = require("lazuli-core/sequelize");
const {
	generateRandomString,
	generateHash
} = require("lazuli-core/utilities/crypto.js");

/**
 * The oauth redirect uri sequelize module
 * @module lazuli-authentication/models/oauth-redirect-uri
 */

/**
 * The oauth redirect uri sequelize model
 * @class
 * @memberof module:lazuli-authentication/models/oauth-redirect-uri
 * 
 * @type {OauthRedirectUri}
 * @version 1.0
 * @since 1.0
 * 
 * @see module:lazuli-authentication/models/oauth-client
 */
const OauthRedirectUri = sequelize.define("oauth_redirect_uri", {
	uri: {
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
 * @fires "authentication.model.oauth-redirect-uri.association"
 * 
 * @param {object} models The models to associate with
 * @param {module:lazuli-authentication/models/oauth-client.OauthClient} models.OauthClient The oauth client model
 * @return {promise<void>}
 */
OauthRedirectUri.associate = function({ OauthClient }) {
	/**
	 * The OauthRedirectUri - OauthClient relation
	 * @since 1.0
	 * @type {BelongsTo}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-redirect-uri.OauthRedirectUri
	 */
	this.OauthClient = this.belongsTo(OauthClient, {
		as: "OauthClient",
		foreignKey: "oauthClientId",
		hooks: true
	});

	/**
	 * The related graphql type
	 * @since 1.0
	 * @type {module:lazuli-authentication/types/oauth-redirect-uri.OauthRedirectUriType}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-redirect-uri.OauthRedirectUri
	 * 
	 * @see module:lazuli-authentication/types/oauth-redirect-uri
	 */
	this.graphQlType = require("../types/oauth-redirect-uri");

	/**
     * Event that is fired after all internal associations have been created
	 * and additional ones can be added.
     *
     * @event "authentication.model.oauth-redirect-uri.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/oauth-redirect-uri.OauthRedirectUri} OauthRedirectUri The redirect uri model
     */
	return eventEmitter.emit(
		"authentication.model.oauth-redirect-uri.association",
		{
			OauthRedirectUri: this
		}
	);
};

module.exports = OauthRedirectUri;
