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
	constructor() {}
}

/**
 * All models registered by this module
 * @since 1.0
 * @public
 * @static
 * 
 * @type {object}
 */
Authentication.models = {
	OauthAccessToken: require("./models/oauth-access-token"),
	OauthClient: require("./models/oauth-client"),
	OauthCode: require("./models/oauth-code"),
	OauthProvider: require("./models/oauth-provider"),
	OauthRedirectUri: require("./models/oauth-redirect-uri"),
	OauthScope: require("./models/oauth-scope"),
	Permission: require("./models/permission"),
	User: require("./models/user")
};

/**
 * Associates all models
 * @since 1.0
 * @public
 * @static
 * 
 * @return {promise<void>}
 */
Authentication.associateModels = function() {
	return Promise.all(
		Object.keys(this.models).map(key => {
			if (this.models[key].associate) {
				return this.models[key].associate(this.models);
			}
		})
	);
};

module.exports = Authentication;
