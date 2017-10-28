const {
	FACEBOOK_CALLBACK_PATH,
	LOGIN_PATH,
	GOOGLE_CALLBACK_PATH
} = require("lazuli-require")("lazuli-config");

const graphqlHTTP = require("express-graphql");

const passport = require("./passport.js");
const oauthServer = require("./oauth-server");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");
const expressServer = require("lazuli-require")("lazuli-core/express");

/**
 * An authentication module
 * @module lazuli-authentication
 */

/**
 * This is the authentication class which handles the registration and, of
 * course, the authentication of users
 * @class
 * @memberof module:lazuli-authentication
 * 
 * @type {Authentication}
 * @version 1.0
 * @since 1.0
 */
class Authentication {
	constructor() {
		valueFilter.add("sequelize.models", this.registerModels.bind(this));
	}
}

/**
 * All models registered by this module
 * @since 1.0
 * @static
 * @memberof module:lazuli-authentication.Authentication
 * @type {Object}
 */
Authentication.prototype._models = {
	OauthAccessToken: require("./models/oauth-access-token"),
	OauthClient: require("./models/oauth-client"),
	OauthCode: require("./models/oauth-code"),
	OauthProvider: require("./models/oauth-provider"),
	OauthRedirectUri: require("./models/oauth-redirect-uri"),
	Permission: require("./models/permission"),
	User: require("./models/user")
};

/**
 * Callback function for registering models. Will be hooked to 'sequelize.models'.
 * @version 1.0
 * @since 1.0
 * @instance
 * @method registerModels
 * @memberof module:lazuli-authentication.Authentication
 * 
 * @param  {Object} models All previously registered models
 * @return {Object}        The new model object, including the old and new
 */
Authentication.prototype.registerModels = function(models) {
	return {
		...models,
		...this._models
	};
};

module.exports = Authentication;
