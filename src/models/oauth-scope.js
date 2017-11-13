const Promise = require("bluebird");
const { STRING } = require("sequelize");

const eventEmitter = require("lazuli-core/event-emitter");
const valueFilter = require("lazuli-core/value-filter");
const sequelize = require("lazuli-core/sequelize");

/**
 * The oauth scope sequelize module
 * @module lazuli-authentication/models/oauth-scope
 */

/**
 * The oauth-scope sequelize model
 * @class
 * @memberof module:lazuli-authentication/models/oauth-scope
 * 
 * @type {OauthScope}
 * @version 1.0
 * @since 1.0
 */
const OauthScope = sequelize.define("oauth_scope", {
	scope: {
		type: STRING,
		unique: true
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
 * @fires "authentication.model.oauth-scope.association"
 * 
 * @param {object} models The models to associate with
 * @param {module:lazuli-authentication/models/oauth-access-token.OauthAccessToken} models.OauthAccessToken The access token model
 * @param {module:lazuli-authentication/models/oauth-code.OauthCode} models.OauthCode The auth code model
 * @return {promise<void>}
 */
OauthScope.associate = function({ OauthAccessToken, OauthCode }) {
	/**
	 * The OauthScope - OauthAccessToken relation
	 * @since 1.0
	 * @type {BelongsToMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-scope.OauthScope
	 */
	this.OauthAccessTokens = this.belongsToMany(OauthAccessToken, {
		as: "OauthAccessTokens",
		foreignKey: "oauthScopeId",
		otherKey: "oauthAccessTokenId",
		through: "access_token_scope_relations",
		hooks: true
	});

	/**
	 * The OauthScope - OauthCode relation
	 * @since 1.0
	 * @type {BelongsToMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-scope.OauthScope
	 */
	this.OauthCodes = this.belongsToMany(OauthCode, {
		as: "OauthCodes",
		foreignKey: "oauthScopeId",
		otherKey: "oauthCodeId",
		through: "oauth_code_scope_relations",
		hooks: true
	});

	/**
	 * The related graphql type
	 * @since 1.0
	 * @type {module:lazuli-authentication/types/oauth-scope.OauthScopeType}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/oauth-scope.OauthScope
	 * 
	 * @see module:lazuli-authentication/types/oauth-scope
	 */
	this.graphQlType = require("../types/oauth-scope");

	/**
     * Event that is fired after all internal associations have been created
	 * and additional ones can be added.
     *
     * @event "authentication.model.oauth-scope.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/oauth-scope.OauthScope} OauthScope The scope model
     */
	return eventEmitter.emit("authentication.model.oauth-scope.association", {
		OauthScope: this
	});
};

module.exports = OauthScope;
