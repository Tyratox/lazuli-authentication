const { LOCALES } = require("lazuli-require")("lazuli-config");
const i18n = require("lazuli-require")("lazuli-i18n");
const piwikTracker = require("lazuli-require")("lazuli-piwik-tracker");

const ejs = require("ejs");

/**
 * Generates the login view express middleware
 * @return {Function} Express middleware/endpoint that renders the login view
 */
module.exports.loginView = () => {
	return (request, response, next) => {
		ejs.renderFile(
			__dirname + "./templates/web/Login.ejs",
			{
				__: string => {
					return i18n.__({
						phrase: string,
						locale: request.getLocale()
					});
				}
			},
			{},
			(err, str) => {
				if (err) {
					return next(err);
				}

				piwikTracker.track({
					url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/Login View",
					urlref: request.get("Referrer"),
					ua: PIWIK_TRACKING_USER_AGENT
				});

				response.setHeader("Content-Type", "text/html");
				response.end(str);
			}
		);
	};
};

/**
 * Generates the oauth dialog view express middleware
 * @return {Function} Express middleware/endpoint that renders the oauth dialog
 */
module.exports.oAuthDialogView = () => {
	return (request, response, next) => {
		ejs.renderFile(
			__dirname + "./templates/web/OAuthDialog.ejs",
			{
				__: string => {
					return i18n.__({
						phrase: string,
						locale: request.getLocale()
					});
				},

				transactionID: request.oauth2.transactionID,
				user: request.user,
				client: request.oauth2.client,
				trusted: request.trusted
			},
			{},
			(err, str) => {
				if (err) {
					return next(err);
				}

				response.setHeader("Content-Type", "text/html");
				response.end(str);
			}
		);
	};
};

/**
 * Express middleware/endpoint that renders the mail verification view
 * @return {Function} Express middleware/endpoint that renders the mail verification view
 */
module.exports.mailVerificationView = () => {
	return (request, response, next) => {
		ejs.renderFile(
			__dirname + "./templates/web/VerifyEmail.ejs",
			{
				__: string => {
					return i18n.__({
						phrase: string,
						locale: request.getLocale()
					});
				},
				register: request.query.register === "true" ? true : false,
				email: request.query.email,
				code: request.query.code
			},
			{},
			(err, str) => {
				if (err) {
					return next(err);
				}

				piwikTracker.track({
					url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/MailVerification View",
					urlref: request.get("Referrer"),
					ua: PIWIK_TRACKING_USER_AGENT
				});

				response.setHeader("Content-Type", "text/html");
				response.end(str);
			}
		);
	};
};

/**
 * Generates an express endpoint that renders the passwort reset view
 * @return {Function} The generated express endpoint
 */
module.exports.passwordResetView = () => {
	return (request, response, next) => {
		ejs.renderFile(
			__dirname + "./templates/web/ResetPassword.ejs",
			{
				__: string => {
					return i18n.__({
						phrase: string,
						locale: request.getLocale()
					});
				},
				email: request.query.email,
				code: request.query.code
			},
			{},
			(err, str) => {
				if (err) {
					return next(err);
				}

				piwikTracker.track({
					url: PIWIK_TRACKING_SITE_BASE_URL + request.path,
					action_name: "Authentication/PasswordReset View",
					urlref: request.get("Referrer"),
					ua: PIWIK_TRACKING_USER_AGENT
				});

				response.setHeader("Content-Type", "text/html");
				response.end(str);
			}
		);
	};
};
