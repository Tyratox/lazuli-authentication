const { AUTH_CODE_LIFETIME, ACCESS_TOKEN_LIFETIME } = require("lazuli-require")(
	"lazuli-config"
);

const oauth2orize = require("oauth2orize");

const OauthClient = require("./models/oauth-client");
const OauthRedirectUri = require("./models/oauth-redirect-uri");
const OauthCode = require("./models/oauth-code");
const OauthAccessToken = require("./models/oauth-access-token");

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
module.exports.initOauthServer = initOauthServer;

/**
 * Initializes the granting part of the oauth server
 * @param {Object} oauth2Server The oauth2 server
 * @return {void}
 */
const initOauthServerGrant = oauth2Server => {
	oauth2Server.grant(
		oauth2orize.grant.code((client, redirectUri, user, ares, callback) => {
			// Create a new authorization code

			if (!client.verifyRedirectUri(redirectUri)) {
				return callback(
					new Error(
						"The sent redirect uri isn't registered with this oauth client!"
					)
				);
			}

			const codeValue = OauthCode.generateCode();

			// Save the auth code and check for errors
			OauthCode.create({
				hash: OauthCode.hashCode(codeValue),
				expires: Date.now() + AUTH_CODE_LIFETIME * 1000,
				userId: user.get("id"),
				oauthClientId: client.get("id")
			})
				.then(() => {
					return callback(null, codeValue);
				})
				.catch(callback);
		})
	);
};
module.exports.initOauthServerGrant = initOauthServerGrant;

/**
 * Initializes the exchange part of the oauth server
 * @param {Object} oauth2Server The oauth2 server
 * @return {void}
 */
const initOauthServerExchange = oauth2Server => {
	return oauth2Server.exchange(
		oauth2orize.exchange.code((client, code, redirectUri, callback) => {
			OauthCode.findByCode(code)
				.then(authCode => {
					if (authCode.get("expires") < Date.now()) {
						return Promise.reject(
							new Error("The sent auth code has already expired!")
						);
					}

					//Delete the auth code now that it has been used
					const clientId = authCode.get("oauthClientId"),
						userId = authCode.get("userId");

					return OauthAccessToken.generateToken(
						userId,
						clientId,
						Date.now() + ACCESS_TOKEN_LIFETIME * 1000
					).then(({ model, token }) => {
						// Create an access token

						const tokenData = {
							token,
							clientId: clientId,
							userId: userId,
							expires: expirationDate
						};

						return OauthCode.destroy({
							where: {
								$or: [
									{
										expires: { $lt: new Date() }
									},
									{
										id: authCode.get("id")
									}
								]
							}
						}).then(() => {
							callback(null, tokenData);
						});
					});
				})
				.catch(callback);
		})
	);
};
module.exports.initOauthServerExchange = initOauthServerExchange;

/**
 * Authenticates the oauth client during the oauth2 authorization
 * @param {Object} oauth2Server The oauth2 server
 * @return {Function} The express middleware to authenticate the oauth client
 */
const authenticateOauthClient = oauth2Server => {
	return oauth2Server.authorization((clientId, redirectUri, callback) => {
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
	});
};
module.exports.authenticateOauthClient = authenticateOauthClient;

/**
 * Checks whether a oauth request can immediately be approved
 * @return {Function} The express middleware to either prompt the user or directly approve the oauth2 request
 */
const checkForImmediateApproval = () => {
	return (request, response, next) => {
		let { client } = request.oauth2;

		//Or the user already approved to this client
		client
			.getOauthAccessTokens()
			.then(tokens => {
				//If the client is trusted or there's already a token issued
				if (client.get("trusted") === true || tokens.length > 0) {
					//pass it
					request.trusted = true;
				} else {
					request.trusted = false;
				}
				return next(null);
			})
			.catch(next);
	};
};

module.exports.checkForImmediateApproval = checkForImmediateApproval;
