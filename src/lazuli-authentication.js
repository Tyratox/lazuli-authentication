const {
	FACEBOOK_CALLBACK_PATH,
	LOGIN_PATH,
	GOOGLE_CALLBACK_PATH
} = require("lazuli-config");

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

import path from "path";

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
		valueFilter.add("model.directories", this.addModelPath);

		eventEmitter.on("model.init.after", this.modelsAfter);
		eventEmitter.on("rest.routing", this.routing);
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
 * Initiates the oauth server and the passport object
 * @param  {Array} models  All registered models
 * @return {void}
 */
Authentication.prototype.modelsAfter = models => {
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

/**
 * Adds a model path in order to register the authentication related modules
 * @param {Array} paths The model paths to register
 * @return {Array} The modified paths value
 */
Authentication.prototype.addModelPath = paths => {
	return [...paths, path.join(__dirname, "models")];
};

/**
 * Sets up all the routing for this module
 * @param  {Object} httpServer The express server object
 * @return {void}
 */
Authentication.prototype.routing = httpServer => {
	this._setupGetRouting(httpServer);
	this._setupPostRouting(httpServer);
};

/**
 * Sets up all the REST 'GET' calls
 * @private
 * @param  {Object} httpServer The express server object
 * @return {void}
 */
Authentication.prototype._setupGetRouting = httpServer => {
	httpServer.get(
		"/v1/auth/logged-in",
		this.isBearerAuthenticated(),
		(request, response, next) => {
			return response.end('{"loggedIn": true}');
		},
		(error, request, response, next) => {
			response.end('{"loggedIn": false}');
		}
	);

	httpServer.get(
		"/views/login",
		loginView(),
		httpServer.catchInternalErrorView
	);

	httpServer.get(
		"/views/verify-email",
		mailVerificationView(),
		httpServer.catchInternalErrorView
	);

	httpServer.get(
		"/views/password-reset",
		passwordResetView(),
		httpServer.catchInternalErrorView
	);

	httpServer.get(
		"/v1/auth/facebook/login/",
		this._passport.authenticate("facebook", { scope: ["email"] }),
		httpServer.serializeValidationErrors()
	);

	httpServer.get(
		FACEBOOK_CALLBACK_PATH,
		authFacebookCallback(this._passport),
		httpServer.serializeValidationErrors(LOGIN_PATH)
	);

	httpServer.get(
		"/v1/auth/google/login/",
		this._passport.authenticate("google", {
			scope: ["openid profile email"]
		}),
		httpServer.serializeValidationErrors(LOGIN_PATH)
	);
	httpServer.get(
		GOOGLE_CALLBACK_PATH,
		authGoogleCallback(this._passport),
		serializeValidationErrors(LOGIN_PATH)
	);

	httpServer.get(
		"/oauth2/authorize",
		isAuthenticated,
		authenticateOAuthClient(),
		checkForImmediateApproval(),
		oAuthDialogView(),
		httpServer.catchInternalErrorView
	);
};

/**
 * Sets up all the REST 'POST' calls
 * @private
 * @param  {Object} httpServer The express server object
 * @return {void}
 */
Authentication.prototype.setupPostRouting = httpServer => {
	httpServer.post(
		"/v1/auth/local/login",
		httpServer.validate(localLoginValidation), //Tracked in analytics
		authLocal(this._passport),
		httpServer.catchInternalErrorView
	);

	httpServer.post(
		"/v1/auth/init-password-reset",
		httpServer.validate(initPasswordResetValidation),
		initPasswordReset(this._models.User),
		httpServer.catchInternalErrorView
	);

	httpServer.post(
		"/v1/auth/password-reset",
		validate(passwordResetValidation),
		passwordReset(this._models.User),
		serializeValidationErrors("/views/password-reset"),
		httpServer.catchInternalErrorView
	);

	httpServer.post(
		"/v1/auth/local/register",
		httpServer.validate(localRegistrationValidation),
		registration(this._models.User),
		httpServer.catchInternalErrorView
	);

	httpServer.post(
		"/v1/auth/local/verify-email",
		httpServer.validate(verifyMailValidation),
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
		httpServer.catchInternalErrorView
	);

	httpServer.post(
		"/oauth2/authorize",
		isAuthenticated,
		this._oauth2Server.decision(),
		httpServer.catchInternalErrorView
	);

	httpServer.post(
		"/oauth2/token",
		this._passport.authenticate("client-local", {
			session: false
		}),
		this._oauth2Server.token(),
		httpServer.serializeValidationErrors(LOGIN_PATH)
	);
};

module.exports = Authentication;
