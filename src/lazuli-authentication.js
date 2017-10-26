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
 * This is the authentication class which handles the registration and, of
 * course, the authentication of users
 */
class Authentication {
	constructor() {
		valueFilter.add("sequelize.models", this.registerModels.bind(this));
		valueFilter.add(
			"graphql.schema.root.query.fields",
			this.addGraphQlQueryFields.bind(this)
		);
		valueFilter.add(
			"graphql.schema.root.mutation.fields",
			this.addGraphQlMutationFields.bind(this)
		);
	}
}

/**
 * All models registered by this module
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
 * Registeres new models
 * @param  {Object} models All previously registered models
 * @return {Object}        The new model object, including the old and new
 */
Authentication.prototype.registerModels = function(models) {
	return {
		...models,
		...this._models
	};
};

/**
 * Adds authentication related query fields
 * @param  {Object} fields    The registered fields
 * @return {Object}           The altered query fields
 */
Authentication.prototype.addGraphQlQueryFields = fields => {
	return {
		...fields,
		...require("./schemas/user").query,
		...require("./schemas/oauth-client").query
	};
};

/**
 * Adds authentication related mutation fields
 * @param  {Object} fields    The registered fields
 * @return {Object}           The altered query fields
 */
Authentication.prototype.addGraphQlMutationFields = fields => {
	return {
		...fields,
		...require("./schemas/user").mutation,
		...require("./schemas/oauth-client").mutation
	};
};

module.exports = Authentication;
