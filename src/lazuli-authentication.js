const {
	FACEBOOK_CALLBACK_PATH,
	LOGIN_PATH,
	GOOGLE_CALLBACK_PATH
} = require("lazuli-require")("lazuli-config");

const graphqlHTTP = require("express-graphql");

const {
	loginView,
	oAuthDialogView,
	mailVerificationView,
	passwordResetView
} = require("./views.js");

const {
	initOauthServer,
	authenticateOauthClient,
	checkForImmediateApproval
} = require("./oauth-server.js");

const { initPassport } = require("./passport.js");

const { isBearerAuthenticated } = require("./middleware.js");
const {
	passwordReset,
	initPasswordReset,
	authFacebookCallback,
	authGoogleCallback,
	verifyEmail,
	registration,
	isAuthenticated,
	authLocal
} = require("./endpoint.js");

const {
	localLoginValidation,
	initPasswordResetValidation,
	passwordResetValidation,
	localRegistrationValidation,
	verifyMailValidation
} = require("./validation.js");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const sequelize = require("lazuli-require")("lazuli-core/globals/sequelize");
const { expressServer, httpServer } = require("lazuli-require")(
	"lazuli-core/globals/http-server"
);

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

		eventEmitter.on(
			"express.init.after",
			this.addPassportMiddleware.bind(this)
		);

		eventEmitter.on("model.init.after", this.modelsAfter.bind(this));
		eventEmitter.on("express.routing.rest", this.restRouting.bind(this));
	}
}

/**
 * The oauth 2 authentication server
 * @private
 * @type {Object}
 */
Authentication.prototype._oauth2Server = require("oauth2orize").createServer();
/**
 * The internal passport object
 * @private
 * @type {Object}
 */
Authentication.prototype._passport = require("passport");

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
 * Adds all required passport middleware to the passed express server
 * @return {void}
 */
Authentication.prototype.addPassportMiddleware = () => {
	expressServer.use(this._passport.initialize());
	expressServer.use(this._passport.session());
};

/**
 * Initiates the oauth server and the passport object
 * @param  {Array} models  All registered models
 * @return {void}
 */
Authentication.prototype.modelsAfter = function(models) {
	initOauthServer(this._oauth2Server);
	initPassport(this._passport);

	this.isBearerAuthenticated = isBearerAuthenticated(this._passport);
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
 * Adds a schema path in order to register the authentication related schemas
 * @param {Array} paths The schema paths to register
 * @return {Array} The modified paths value
 */
Authentication.prototype.addSchemaPath = paths => {
	return [...paths, path.join(__dirname, "schemas")];
};

/**
 * Sets up all the routing for this module
 * @return {void}
 */
Authentication.prototype.restRouting = function() {
	this._setupGetRouting();
	this._setupPostRouting();
};

/**
 * Sets up all the REST 'GET' calls
 * @private
 * @return {void}
 */
Authentication.prototype._setupGetRouting = function() {
	expressServer.get(
		"/v1/auth/logged-in",
		this.isBearerAuthenticated(),
		(request, response, next) => {
			return response.end('{"loggedIn": true}');
		},
		(error, request, response, next) => {
			response.end('{"loggedIn": false}');
		}
	);

	expressServer.get("/views/login", loginView());

	expressServer.get("/views/verify-email", mailVerificationView());

	expressServer.get("/views/password-reset", passwordResetView());

	expressServer.get(
		"/v1/auth/facebook/login/",
		this._passport.authenticate("facebook", { scope: ["email"] })
	);

	expressServer.get(
		FACEBOOK_CALLBACK_PATH,
		authFacebookCallback(this._passport)
	);

	expressServer.get(
		"/v1/auth/google/login/",
		this._passport.authenticate("google", {
			scope: ["openid profile email"]
		})
	);
	expressServer.get(GOOGLE_CALLBACK_PATH, authGoogleCallback(this._passport));

	expressServer.get(
		"/oauth2/authorize",
		isAuthenticated,
		authenticateOauthClient(this._oauth2Server),
		checkForImmediateApproval(),
		oAuthDialogView()
	);
};

/**
 * Sets up all the REST 'POST' calls
 * @private
 * @return {void}
 */
Authentication.prototype._setupPostRouting = function() {
	expressServer.post(
		"/v1/auth/local/login",
		expressServer.validate(localLoginValidation), //Tracked in analytics
		authLocal(this._passport)
	);

	expressServer.post(
		"/v1/auth/init-password-reset",
		expressServer.validate(initPasswordResetValidation),
		initPasswordReset()
	);

	expressServer.post(
		"/v1/auth/password-reset",
		expressServer.validate(passwordResetValidation),
		passwordReset()
	);

	expressServer.post(
		"/v1/auth/local/register",
		expressServer.validate(localRegistrationValidation),
		registration()
	);

	expressServer.post(
		"/v1/auth/local/verify-email",
		expressServer.validate(verifyMailValidation),
		verifyEmail()
	);

	expressServer.post(
		"/oauth2/authorize",
		isAuthenticated,
		this._oauth2Server.decision()
	);

	expressServer.post(
		"/oauth2/token",
		this._passport.authenticate("client-local", {
			session: false
		}),
		this._oauth2Server.token()
	);
};

/**
 * Adds authentication related query fields
 * @param  {Object} fields    The registered fields
 * @return {Object}           The altered query fields
 */
Authentication.prototype.addGraphQlQueryFields = fields => {
	return {
		...fields,
		...require("./schemas/user").query
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
		...require("./schemas/user").mutation
	};
};

module.exports = Authentication;
