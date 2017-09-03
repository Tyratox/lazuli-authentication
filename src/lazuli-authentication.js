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
	initOAuthServer,
	authenticateOAuthClient,
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

const path = require("path");

/**
 * This is the authentication class which handles the registration and, of
 * course, the authentication of users
 */
class Authentication {
	/**
	 * Creates an instance of the 'Authentication' class
	 * @param  {Object}   eventEmitter The lazuli event emitter
	 * @param  {Object}   valueFilter The lazuli value filter
	 */
	constructor(eventEmitter, valueFilter) {
		this.eventEmitter = eventEmitter;
		this.valueFilter = valueFilter;

		valueFilter.add("sequelize.models", this.registerModels.bind(this));

		eventEmitter.on("express.init.after", this.addPassportMiddleware);

		eventEmitter.on("model.init.after", this.modelsAfter);

		eventEmitter.on("express.routing.graphql", this.graphQlRouting);
		eventEmitter.on("express.routing.rest", this.restRouting);
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
 * Adds all required passport middleware to the passed express server
 * @param {Object} expressServer The express server to add the middlewares to
 */
Authentication.prototype.addPassportMiddleware = expressServer => {
	expressServer.use(this._passport.initialize());
	expressServer.use(this._passport.session());
};

/**
 * Initiates the oauth server and the passport object
 * @param  {Array} models  All registered models
 * @return {void}
 */
Authentication.prototype.modelsAfter = function(models) {
	initOAuthServer(
		this._oauth2Server,
		this._models.OAuthClient,
		this._models.OAuthRedirectUri,
		this._models.OAuthCode,
		this._models.OAuthAccessToken
	);
	initPassport(
		this._passport,
		this._models.User,
		this._models.Permission,
		this._models.OAuthProvider,
		this._models.OAuthClient,
		this._models.OAuthRedirectUri,
		this._models.OAuthAccessToken
	);

	this.isBearerAuthenticated = isBearerAuthenticated(this._passport);
};

Authentication.prototype.registerModels = function(models, sequelize) {
	return models.concat(
		[
			"oauth-access-token",
			"oauth-client",
			"oauth-code",
			"oauth-provider",
			"oauth-redirect-uri",
			"permission",
			"user"
		].map(fileName => {
			return require(path.resolve(__dirname, "models", fileName))(
				this.eventEmitter,
				this.valueFilter,
				sequelize
			);
		})
	);
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
 * @param  {Object} expressServer The express server object
 * @return {void}
 */
Authentication.prototype.restRouting = function(expressServer) {
	this._setupGetRouting(expressServer);
	this._setupPostRouting(expressServer);
};

/**
 * Sets up all the REST 'GET' calls
 * @private
 * @param  {Object} expressServer The express server object
 * @return {void}
 */
Authentication.prototype._setupGetRouting = expressServer => {
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

	expressServer.get(
		"/views/login",
		loginView(),
		expressServer.catchInternalErrorView
	);

	expressServer.get(
		"/views/verify-email",
		mailVerificationView(),
		expressServer.catchInternalErrorView
	);

	expressServer.get(
		"/views/password-reset",
		passwordResetView(),
		expressServer.catchInternalErrorView
	);

	expressServer.get(
		"/v1/auth/facebook/login/",
		this._passport.authenticate("facebook", { scope: ["email"] }),
		expressServer.serializeValidationErrors()
	);

	expressServer.get(
		FACEBOOK_CALLBACK_PATH,
		authFacebookCallback(this._passport),
		expressServer.serializeValidationErrors(LOGIN_PATH)
	);

	expressServer.get(
		"/v1/auth/google/login/",
		this._passport.authenticate("google", {
			scope: ["openid profile email"]
		}),
		expressServer.serializeValidationErrors(LOGIN_PATH)
	);
	expressServer.get(
		GOOGLE_CALLBACK_PATH,
		authGoogleCallback(this._passport),
		serializeValidationErrors(LOGIN_PATH)
	);

	expressServer.get(
		"/oauth2/authorize",
		isAuthenticated,
		authenticateOAuthClient(),
		checkForImmediateApproval(),
		oAuthDialogView(),
		expressServer.catchInternalErrorView
	);
};

/**
 * Sets up all the REST 'POST' calls
 * @private
 * @param  {Object} expressServer The express server object
 * @return {void}
 */
Authentication.prototype.setupPostRouting = expressServer => {
	expressServer.post(
		"/v1/auth/local/login",
		expressServer.validate(localLoginValidation), //Tracked in analytics
		authLocal(this._passport),
		expressServer.catchInternalErrorView
	);

	expressServer.post(
		"/v1/auth/init-password-reset",
		expressServer.validate(initPasswordResetValidation),
		initPasswordReset(this._models.User),
		expressServer.catchInternalErrorView
	);

	expressServer.post(
		"/v1/auth/password-reset",
		validate(passwordResetValidation),
		passwordReset(this._models.User),
		serializeValidationErrors("/views/password-reset"),
		expressServer.catchInternalErrorView
	);

	expressServer.post(
		"/v1/auth/local/register",
		expressServer.validate(localRegistrationValidation),
		registration(this._models.User),
		expressServer.catchInternalErrorView
	);

	expressServer.post(
		"/v1/auth/local/verify-email",
		expressServer.validate(verifyMailValidation),
		verifyEmail(this._models.User),
		(error, request, response, next) => {
			if (request.body.register) {
				serializeValidationErrors("/views/verify-email?register=true")(
					error,
					request,
					response,
					next
				);
			} else {
				serializeValidationErrors("/views/verify-email")(
					error,
					request,
					response,
					next
				);
			}
		},
		expressServer.catchInternalErrorView
	);

	expressServer.post(
		"/oauth2/authorize",
		isAuthenticated,
		this._oauth2Server.decision(),
		expressServer.catchInternalErrorView
	);

	expressServer.post(
		"/oauth2/token",
		this._passport.authenticate("client-local", {
			session: false
		}),
		this._oauth2Server.token(),
		expressServer.serializeValidationErrors(LOGIN_PATH)
	);
};

/**
 * Sets up all the graphql routing
 * @param  {Object} expressServer The express server on which the routes should be added
 * @return {void}
 */
Authentication.prototype.graphQlRouting = expressServer => {
	app.use(
		"/graphql/user",
		graphqlHTTP({
			schema: require(path.resolve(__dirname, "schemas", "user")),
			graphiql: true
		})
	);
};

module.exports = Authentication;
