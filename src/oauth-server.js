const {
	AUTH_CODE_LIFETIME,
	ACCESS_TOKEN_LIFETIME,
	DEFAULT_SCOPE
} = require("lazuli-require")("lazuli-config");

const { Op } = require("sequelize");

const oauth2orize = require("oauth2orize");
const oauthServer = oauth2orize.createServer();

const OauthClient = require("./models/oauth-client");
const OauthRedirectUri = require("./models/oauth-redirect-uri");
const OauthCode = require("./models/oauth-code");
const OauthAccessToken = require("./models/oauth-access-token");
const OauthScope = require("./models/oauth-scope");

/**
 * The oauth server module
 * @module lazuli-authentication/oauth-server
 */

/**
 * Initializes the granting part of the oauth server
 * @param {object} oauth2Server The oauth2 server
 * @return {void}
 */
const initOauthServerGrant = oauth2Server => {
	oauth2Server.grant(
		oauth2orize.grant.code((client, redirectUri, user, ares, done) => {
			// Create a new authorization code

			if (!client.verifyRedirectUri(redirectUri)) {
				return done(
					new Error(
						"The sent redirect uri isn't registered with this oauth client!"
					)
				);
			}

			const scope = ares.scope ? ares.scope : [DEFAULT_SCOPE];

			return OauthCode.generateCode(
				user.get("id"),
				client.get("id"),
				Date.now() + AUTH_CODE_LIFETIME * 1000
			)
				.then(({ model: oauthCode, code }) => {
					return oauthCode
						.setScopeArray(
							Array.isArray(scope) ? scope : scope ? scope.split(" ") : []
						)
						.then(() => Promise.resolve(code));
				})
				.then(code => {
					return done(null, code);
				})
				.catch(done);
		})
	);
};

/**
 * Initializes the exchange part of the oauth server
 * @param {object} oauth2Server The oauth2 server
 * @return {void}
 */
const initOauthServerExchange = oauth2Server => {
	return oauth2Server.exchange(
		oauth2orize.exchange.code((client, code, redirectUri, done) => {
			OauthCode.findByCode(code)
				.then(authCode => {
					if (!authCode) {
						return Promise.reject(
							new Error("The sent auth code has already expired!")
						);
					}
					if (authCode.get("expires") < Date.now()) {
						return authCode
							.destroy()
							.then(() =>
								Promise.reject(
									new Error("The sent auth code has already expired!")
								)
							);
					}

					const clientId = authCode.get("oauthClientId"),
						userId = authCode.get("userId");

					return OauthAccessToken.generateToken(
						userId,
						clientId,
						Date.now() + ACCESS_TOKEN_LIFETIME * 1000
					).then(({ model: accessToken, token }) => {
						// Create an access token

						const tokenData = {
							token,
							oauthClientId: clientId,
							userId: userId,
							expires: accessToken.get("expires")
						};
						return authCode
							.getOauthScopes()
							.then(scopes => {
								//use scopes for access token as well
								return accessToken.setOauthScopes(scopes);
							})
							.then(() =>
								OauthCode.destroy({
									where: {
										[Op.or]: [
											{
												expires: { [Op.lt]: new Date() }
											},
											//Delete the auth code now that it has been used
											{
												id: authCode.get("id")
											}
										]
									}
								}).then(() => {
									done(null, tokenData);
								})
							);
					});
				})
				.catch(done);
		})
	);
};

/**
 * Initializes the oauth2orize powered oauth server and its endpoints
 * @return {void}
 */
const initOauthServer = oauth2Server => {
	//init the oauth 2 server
	oauth2Server.serializeClient((client, done) => {
		return done(null, client.get("id"));
	});

	oauth2Server.deserializeClient((id, done) => {
		OauthClient.findOne({
			where: { id: id },
			include: [
				{
					model: OauthRedirectUri,
					as: "OauthRedirectUris"
				}
			]
		})
			.then(client => {
				return done(null, client);
			})
			.catch(done);
	});

	initOauthServerGrant(oauth2Server);
	initOauthServerExchange(oauth2Server);
};

/**
 * Verifies the oauth client during the oauth2 authorization and checks for immediate approval
 * @param {object} oauth2Server The oauth2 server
 * @return {function} The express middleware to authenticate the oauth client
 */
const verifyOauthClient = oauth2Server => {
	return oauth2Server.authorization(
		(clientId, redirectUri, scope, type, done) => {
			const scopes = Array.isArray(scope)
				? scope
				: scope ? scope.split(" ") : [];
			for (let i = 0; i < scopes.length; i++) {
				if (
					["profile", "profile.read.email", "profile.read.name"].indexOf(
						scopes[i]
					) === -1
				) {
					return done(new Error("Invalid scope!"));
				}
			}

			OauthClient.findOne({
				where: { id: clientId },
				include: [
					{
						model: OauthRedirectUri,
						as: "OauthRedirectUris"
					}
				]
			})
				.then(client => {
					if (client && client.verifyRedirectUri(redirectUri)) {
						return done(null, client, redirectUri);
					} else {
						return done(
							new Error(
								"The sent redirect uri isn't registered with this oauth client!"
							)
						);
					}
				})
				.catch(done);
		},
		(client, user, scope, done) => {
			//If the client is trusted
			if (client.get("trusted") === true) {
				//pass it
				return done(null, true);
			}

			client
				.getOauthAccessTokens({
					where: { userId: user.get("id") },
					include: [{ model: OauthScope, as: "OauthScopes" }]
				})
				.then(tokens => {
					const tokenScope = tokens[0]
						? tokens[0].get("OauthScopes").map(scope => scope.scope)
						: [];

					const missing = (Array.isArray(scope)
						? scope
						: scope ? scope.split(" ") : [DEFAULT_SCOPE]
					).filter(scope => {
						for (let i = 0; i < tokenScope.length; i++) {
							if (scope === tokenScope[i]) {
								return false;
							}
						}

						return true;
					});

					done(null, missing.length === 0);
				})
				.catch(done);
		}
	);
};

initOauthServer(oauthServer);

module.exports.verifyOauthClient = verifyOauthClient(oauthServer);

/**
 * The actual oauth server object. Based on oauth2orize
 */
module.exports.oauthServer = oauthServer;
