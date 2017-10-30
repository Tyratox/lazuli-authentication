const { AUTH_CODE_LIFETIME, ACCESS_TOKEN_LIFETIME } = require("lazuli-require")(
	"lazuli-config"
);

const oauth2orize = require("oauth2orize");
const oauthServer = oauth2orize.createServer();

const OauthClient = require("./models/oauth-client");
const OauthRedirectUri = require("./models/oauth-redirect-uri");
const OauthCode = require("./models/oauth-code");
const OauthAccessToken = require("./models/oauth-access-token");

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

			const { scope } = ares;

			return OauthCode.generateCode(
				user.get("id"),
				client.get("id"),
				Date.now() + AUTH_CODE_LIFETIME * 1000
			)
				.then(({ oauthCode, code }) => {
					return oauthCode
						.setScopes(scope.split(" "))
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
		oauth2orize.exchange.code((client, code, redirectUri, callback) => {
			OauthCode.findByCode(code)
				.then(authCode => {
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
					).then(({ accessToken, token }) => {
						// Create an access token

						const tokenData = {
							token,
							clientId: clientId,
							userId: userId,
							expires: expirationDate
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
										$or: [
											{
												expires: { $lt: new Date() }
											},
											//Delete the auth code now that it has been used
											{
												id: authCode.get("id")
											}
										]
									}
								}).then(() => {
									callback(null, tokenData);
								})
							);
					});
				})
				.catch(callback);
		})
	);
};

/**
 * Initializes the oauth2orize powered oauth server and its endpoints
 * @return {void}
 */
const initOauthServer = oauth2Server => {
	//init the oauth 2 server
	oauth2Server.serializeClient((client, callback) => {
		return callback(null, client.get("id"));
	});

	oauth2Server.deserializeClient((id, callback) => {
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
				return callback(null, client);
			})
			.catch(callback);
	});

	initOauthServerGrant(oauth2Server);
	initOauthServerExchange(oauth2Server);
};

/**
 * Authenticates the oauth client during the oauth2 authorization and checks for immediate approval
 * @param {object} oauth2Server The oauth2 server
 * @return {function} The express middleware to authenticate the oauth client
 */
const authenticateOauthClient = oauth2Server => {
	return oauth2Server.authorization(
		(clientId, redirectUri, scope, type) => {
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
						return callback(null, client, redirectUri);
					} else {
						return callback(
							new Error(
								"The sent redirect uri isn't registered with this oauth client!"
							)
						);
					}
				})
				.catch(callback);
		},
		(client, user, scope, done) => {
			client
				.getOauthAccessTokens({
					where: { userId: user.id },
					include: [{ model: OauthScope, as: "OauthScopes" }]
				})
				.then(tokens => {
					//If the client is trusted or there's already a token issued
					if (client.get("trusted") === true) {
						//pass it
						done(null, true, ares);
					}

					const tokenScope = tokens[0]
						.get("OauthScopes")
						.map(scope => scope.scope);

					const missing = scope.split(" ").filter(scope => {
						for (let i = 0; i < tokenScope.length; i++) {
							if (scope === tokenScope[i]) {
								return false;
							}
						}

						return true;
					});

					done(null, missing.length === 0, ares);
				})
				.catch(done);
		}
	);
};

initOauthServer(oauthServer);

module.exports.authenticateOauthClient = authenticateOauthClient(oauthServer);
module.exports.checkForImmediateApproval = checkForImmediateApproval;

/**
 * The actual oauth server object. Based on oauth2orize
 */
module.exports.oauthServer = oauthServer;
