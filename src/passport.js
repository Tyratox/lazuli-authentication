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
const FacebookStrategy = require("passport-facebook").Strategy;
const GoogleStrategy = require("passport-google-oauth").OAuth2Strategy;

const User = require("./models/user");
const Permission = require("./models/permission");
const OauthProvider = require("./models/oauth-provider");
const OauthClient = require("./models/oauth-client");
const OauthRedirectUri = require("./models/oauth-redirect-uri");
const OauthAccessToken = require("./models/oauth-access-token");

/**
 * Enables the oauth client authentication in passport
 * @param  {Object} passport The passport object which this method should be performed on
 * @return {void}
 */
const initOauthClientAuthentication = passport => {
	passport.use(
		"client-local",
		new LocalStrategy(
			{ usernameField: "clientId", passwordField: "clientSecret" },
			(clientId, clientSecret, callback) => {
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
							return callback(null, false);
						}

						client
							.verifySecret(clientSecret)
							.then(() => {
								return callback(null, client);
							})
							.catch(err => {
								return callback(new Error("The secret is invalid!"));
							});
					})
					.catch(callback);
			}
		)
	);
};
module.exports.initOauthClientAuthentication = initOauthClientAuthentication;

/**
 * Enables the local user authentication in passport
 * @param  {Object} passport The passport object which this method should be performed on
 * @return {void}
 */
const initLocalAuthentication = passport => {
	passport.use(
		"local",
		new LocalStrategy((email, password, done) => {
			User.findOne({
				where: { emailVerified: email }
			})
				.then(user => {
					if (!user || user.get("passwordHash").length === 0) {
						return done(new Error("The user couldn't be found!"));
					}

					user
						.verifyPassword(password)
						.then(success => {
							return done(null, success ? user : null);
						})
						.catch(done);
				})
				.catch(done);
		})
	);
};
module.exports.initLocalAuthentication = initLocalAuthentication;

/**
 * Enables the oauth bearer authentication in passport
 * @param  {Object} passport The passport object which this method should be performed on
 * @return {void}
 */
const initOauthBearerAuthentication = passport => {
	passport.use(
		new BearerStrategy(
			{
				passReqToCallback: true
			},
			(request, accessToken, callback) => {
				//keeping the database clean
				OauthAccessToken.destroy({
					where: { expires: { $lt: new Date() } }
				})
					.then(() => {
						return OauthAccessToken.findByToken(accessToken).then(token => {
							// No token found
							if (!token) {
								return callback(new Error("The sent token is invalid!"));
							}

							return User.findById(token.get("userId")).then(user => {
								if (!user) {
									// No user was found, so the token is invalid
									return token.destroy().then(() => {
										return callback(
											new Error("The sent token isn't associated with a user!"),
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
												if (hasPermission) {
													return callback(null, user);
												} else {
													return callback(
														new Error(
															"You don't have the permission to do this!"
														),
														false
													);
												}
											});
									}

									return callback(
										new Error("You don't have the permission to do this!"),
										false
									);
								});
							});
						});
					})
					.catch(callback);
			}
		)
	);
};
module.exports.initOauthBearerAuthentication = initOauthBearerAuthentication;

/**
 * Enables the facebook authentication in passport
 * @param  {Object} passport       The passport object which this method should be performed on
 * @return {void}
 */
const initFacebookAuthentication = passport => {
	passport.use(
		new FacebookStrategy(
			{
				clientID: FACEBOOK_APP_ID,
				clientSecret: FACEBOOK_APP_SECRET,
				callbackURL: HOST + FACEBOOK_CALLBACK_PATH,

				passReqToCallback: true,
				profileFields: ["id", "emails", "name", "displayName", "photos"]
			},
			(request, accessToken, refreshToken, profile, done) => {
				User.findOrCreateUserByPassportProfile(profile)
					.then(user => {
						user.set("locale", request.getLocale());
						return user
							.save()
							.then(user => {
								return user
									.getOauthProviders({ where: { type: "facebook" } })
									.then(providers => {
										if (providers.length > 0) {
											let provider = providers[0];

											provider.set({
												accessToken,
												refreshToken
											});

											return provider.save();
										} else {
											return OauthProvider.create({
												type: "facebook",
												accessToken,
												refreshToken
											}).then(provider => {
												return provider.setUser(user);
											});
										}
									});
							})
							.then(() => {
								return done(null, user);
							});
					})
					.catch(done);
			}
		)
	);
};
module.exports.initFacebookAuthentication = initFacebookAuthentication;

/**
 * Enables the google authentication in passport
 * @param  {Object} passport            The passport object which this method should be performed on
 * @return {void}
 */
const initGoogleAuthentication = passport => {
	passport.use(
		new GoogleStrategy(
			{
				clientID: GOOGLE_CLIENT_ID,
				clientSecret: GOOGLE_CLIENT_SECRET,
				callbackURL: HOST + GOOGLE_CALLBACK_PATH,

				passReqToCallback: true
			},
			(request, accessToken, refreshToken, profile, done) => {
				User.findOrCreateUserByPassportProfile(profile)
					.then(user => {
						user.set("locale", request.getLocale());
						return user
							.save()
							.then(user => {
								return user
									.getOauthProviders({ where: { type: "google" } })
									.then(providers => {
										if (providers.length > 0) {
											let provider = providers[0];

											provider.set({
												accessToken,
												refreshToken
											});

											return provider.save();
										} else {
											return OauthProvider.create({
												type: "google",
												accessToken,
												refreshToken
											}).then(provider => {
												return provider.setUser(user);
											});
										}
									});
							})
							.then(() => {
								return done(null, user);
							});
					})
					.catch(done);
			}
		)
	);
};
module.exports.initGoogleAuthentication = initGoogleAuthentication;

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
module.exports.initPassportSerialization = initPassportSerialization;

/**
 * Initializes the passport object
 * @param  {Object} passport The passport object to initialize
 * @return {void}
 */
const initPassport = passport => {
	initPassportSerialization(passport, User, Permission);
	initOauthClientAuthentication(passport, OauthClient, OauthRedirectUri);
	initLocalAuthentication(passport, User);
	initOauthBearerAuthentication(passport, OauthAccessToken, User, Permission);
	initFacebookAuthentication(passport, User, OauthProvider);
	initGoogleAuthentication(passport, User, OauthProvider);
};
module.exports.initPassport = initPassport;
