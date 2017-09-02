const { AUTH_CODE_LIFETIME, ACCESS_TOKEN_LIFETIME } = require("lazuli-require")(
	"lazuli-config"
);

const oauth2orize = require("oauth2orize");

/**
 * Initializes the oauth2orize powered oauth server and its endpoints
 * @return {void}
 */
module.exports.initOAuthServer = (
	oauth2Server,
	OAuthClient,
	OAuthRedirectUri,
	OAuthCode,
	OAuthAccessToken
) => {
	//init the oauth 2 server
	oauth2Server.serializeClient((client, callback) => {
		return callback(null, client.get("id"));
	});

	oauth2Server.deserializeClient((id, callback) => {
		OAuthClient.findOne({
			where: { id: id },
			include: [
				{
					model: OAuthRedirectUri,
					as: "OAuthRedirectUris"
				}
			]
		})
			.then(client => {
				return callback(null, client);
			})
			.catch(callback);
	});

	initOAuthServerGrant(oauth2Server, OAuthCode);
	initOAuthServerExchange(oauth2Server, OAuthCode, OAuthAccessToken);
};

/**
 * Initializes the granting part of the oauth server
 * @return {void}
 */
const initOAuthServerGrant = (oauth2Server, OAuthCode) => {
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

			let codeValue = OAuthCode.generateCode();

			let expirationDate = Date.now() + AUTH_CODE_LIFETIME * 1000;

			let code = OAuthCode.build({
				hash: OAuthCode.hashCode(codeValue),
				expires: expirationDate,
				user_id: user.get("id"),
				oauth_client_id: client.get("id")
			});

			let promises = [code.save()];

			// Save the auth code and check for errors
			Promise.all(promises)
				.then(() => {
					return callback(null, codeValue);
				})
				.catch(callback);
		})
	);
};

/**
 * Initializes the exchange part of the oauth server
 * @return {void}
 */
module.exports.initOAuthServerExchange = (
	oauth2Server,
	OAuthCode,
	OAuthAccessToken
) => {
	return oauth2Server.exchange(
		oauth2orize.exchange.code((client, code, redirectUri, callback) => {
			OAuthCode.findByCode(code)
				.then(authCode => {
					if (authCode.get("expires") < Date.now()) {
						return callback(
							new Error("The sent auth code has already expired!")
						);
					}
					//Delete the auth code now that it has been used
					let clientId = authCode.get("oauth_client_id"),
						userId = authCode.get("user_id");

					let promises = [
						OAuthCode.destroy({
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
						})
					];

					let expirationDate = Date.now() + ACCESS_TOKEN_LIFETIME * 1000;

					// Create an access token
					let tokenData = {
						token: OAuthAccessToken.generateToken(),
						clientId: clientId,
						userId: userId,
						expires: expirationDate
					};

					//the 'key' here is 'hash' and not 'token' as in 'tokenData'!
					promises.push(
						OAuthAccessToken.create({
							hash: OAuthAccessToken.hashToken(tokenData.token),
							expires: expirationDate,
							user_id: userId,
							oauth_client_id: clientId
						})
					);

					Promise.all(promises)
						.then(() => {
							callback(null, tokenData);
						})
						.catch(callback);
				})
				.catch(callback);
		})
	);
};

/**
 * Authenticates the oauth client during the oauth2 authorization
 * @return {Function} The express middleware to authenticate the oauth client
 */
module.exports.authenticateOAuthClient = (
	oauth2Server,
	OAuthClient,
	OAuthRedirectUri
) => {
	return oauth2Server.authorization((clientId, redirectUri, callback) => {
		OAuthClient.findOne({
			where: { id: clientId },
			include: [
				{
					model: OAuthRedirectUri,
					as: "OAuthRedirectUris"
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

/**
 * Checks whether a oauth request can immediately be approved
 * @return {Function} The express middleware to either prompt the user or directly approve the oauth2 request
 */
module.exports.checkForImmediateApproval = () => {
	return (request, response, next) => {
		let { client } = request.oauth2;

		//Or the user already approved to this client
		client
			.getOAuthAccessTokens()
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
