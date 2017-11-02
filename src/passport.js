const {
	ACCESS_TOKEN_LIFETIME,
	FACEBOOK_APP_ID,
	FACEBOOK_APP_SECRET,
	HOST,
	FACEBOOK_CALLBACK_PATH,
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	GOOGLE_CALLBACK_PATH
} = require("lazuli-require")("lazuli-config");

const LocalStrategy = require("passport-local").Strategy;
const BearerStrategy = require("passport-http-bearer").Strategy;

const User = require("./models/user");
const Permission = require("./models/permission");
const OauthProvider = require("./models/oauth-provider");
const OauthClient = require("./models/oauth-client");
const OauthRedirectUri = require("./models/oauth-redirect-uri");
const OauthAccessToken = require("./models/oauth-access-token");

const passport = require("passport");

/**
 * The passport module
 * @module lazuli-authentication/passport
 */

/**
 * Enables the oauth client authentication in passport
 * @param  {object} passport The passport object which this method should be performed on
 * @return {void}
 */
const initOauthClientAuthentication = passport => {
	passport.use(
		"local-client",
		new LocalStrategy(
			{ usernameField: "clientId", passwordField: "clientSecret" },
			(clientId, clientSecret, done) => {
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
						if (!client) {
							return Promise.reject(new Error("Authentication failed!"));
						}

						return client
							.verifySecret(clientSecret)
							.then(
								verified =>
									verified
										? done(null, client)
										: Promise.reject(new Error("Authentication failed!"))
							);
					})
					.catch(done);
			}
		)
	);
};

/**
 * Enables the local user authentication in passport
 * @param  {object} passport The passport object which this method should be performed on
 * @return {void}
 */
const initLocalAuthentication = passport => {
	passport.use(
		"local-user",
		new LocalStrategy(
			{ usernameField: "email", passwordField: "password" },
			(email, password, done) => {
				User.findOne({
					where: { emailVerified: email }
				})
					.then(user => {
						if (!user || user.get("passwordHash").length === 0) {
							return Promise.reject(new Error("Authentication failed!"));
						}

						return user
							.verifyPassword(password)
							.then(
								success =>
									success
										? done(null, user)
										: Promise.reject(new Error("Authentication failed!"))
							);
					})
					.catch(done);
			}
		)
	);
};

/**
 * Enables the oauth bearer authentication in passport
 * @param  {object} passport The passport object which this method should be performed on
 * @return {void}
 */
const initOauthBearerAuthentication = passport => {
	passport.use(
		new BearerStrategy(
			{
				passReqToCallback: true
			},
			(request, accessToken, done) => {
				//keeping the database clean
				OauthAccessToken.destroy({
					where: { expires: { $lt: new Date() } }
				})
					.then(() => {
						return OauthAccessToken.findByToken(accessToken).then(token => {
							// No token found
							if (!token) {
								return Promise.reject(new Error("Authentication failed!"));
							}

							return User.findById(token.get("userId")).then(user => {
								if (!user) {
									// No user was found, so the token is invalid
									return token.destroy().then(() => {
										return Promise.reject(
											new Error("Authentication failed!"),
											false
										);
									});
								}

								//extend token lifetime
								token.set("expires", Date.now() + ACCESS_TOKEN_LIFETIME * 1000);

								return token.save().then(() => {
									//check whether the user has the required permissions
									if (
										!request.requiredPermissions ||
										request.requiredPermissions.length === 0 ||
										request.requiredPermissions
									) {
										return user
											.doesHavePermissions(request.requiredPermissions)
											.then(hasPermission => {
												delete request.requiredPermissions;

												return hasPermission
													? done(null, user)
													: Promise.reject(new Error("Authentication failed!"));
											});
									}

									return Promise.reject(new Error("Authentication failed!"));
								});
							});
						});
					})
					.catch(done);
			}
		)
	);
};

/**
 * Initializes a generic passport oauth authentication strategy
 * @param {object} passport The passport object to add this strategy to
 * @param {string} providerUid A unique id for this specific oauth provider, e.g. `auth0`
 * @param {StrategyClass} Strategy The strategy class for this specific provider, e.g. `Auth0Strategy`
 * @param {object} strategyProps The props that should be passed to the strategy class
 * @param {function} mapCallbackSignature A function that should map the callback signature to (request, accessToken, refreshToken, profile, done)
 * @return {void}
 */
module.exports.initGenericOauthPassportStrategy = (
	passport,
	providerUid,
	Strategy,
	strategyProps,
	mapCallbackSignature
) => {
	passport.use(
		new Strategy({ ...strategyProps, passReqToCallback: true }),
		mapCallbackSignature(
			(request, accessToken, refreshToken, profile, done) => {
				User.findOrCreateUserByPassportProfile(profile)
					.then(user => {
						return user
							.update({
								locale: request.getLocale()
							})
							.then(user => {
								return user
									.getOauthProviders({ where: { provider: providerUid } })
									.then(providers => {
										if (providers.length === 0) {
											return OauthProvider.create({
												type: providerUid,
												accessToken,
												refreshToken,
												userId: user.get("id")
											});
										} else if (providers.length > 1) {
											return Promise.reject(
												"Unexpected Error! There is more than one provider of the same type registered for the same user Please report this!"
											);
										} else {
											return providers[0].update({
												accessToken,
												refreshToken
											});
										}
									});
							})
							.then(() => done(null, user));
					})
					.catch(done);
			}
		)
	);
};
/**
 * Initializes the user serialization in the passport object
 * @return {void}
 */
const initPassportSerialization = passport => {
	passport.serializeUser((user, done) => {
		done(null, user.get("id"));
	});

	passport.deserializeUser((userId, done) => {
		User.findOne({
			where: { id: userId },
			include: [
				{
					model: Permission,
					as: "Permissions"
				}
			]
		})
			.then(user => {
				done(null, user);
			})
			.catch(done);
	});
};

/**
 * Initializes the passport object
 * @param  {object} passport The passport object to initialize
 * @return {void}
 */
const initPassport = passport => {
	initPassportSerialization(passport, User, Permission);
	initOauthClientAuthentication(passport, OauthClient, OauthRedirectUri);
	initLocalAuthentication(passport, User);
	initOauthBearerAuthentication(passport, OauthAccessToken, User, Permission);
};

initPassport(passport);

/**
 * The shared passport module
 * @type {Object}
 */
module.exports.passport = passport;
