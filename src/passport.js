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

/**
 * Enables the oauth client authentication in passport
 * @param  {Object} passport         The passport object which this method should be performed on
 * @param  {Object} OAuthClient      The oauth client database model
 * @param  {Object} OAuthRedirectUri The redirect uri database model
 * @return {void}
 */
module.exports.initOAuthClientAuthentication = (
	passport,
	OAuthClient,
	OAuthRedirectUri
) => {
	passport.use(
		"client-local",
		new LocalStrategy(
			{ usernameField: "clientId", passwordField: "clientSecret" },
			(clientId, clientSecret, callback) => {
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

/**
 * Enables the local user authentication in passport
 * @param  {Object} passport         The passport object which this method should be performed on
 * @param  {Object} User             The user database model
 * @param  {Object} OAuthRedirectUri The redirect uri database model
 * @return {void}
 */
module.exports.initLocalAuthentication = (passport, User) => {
	this._passport.use(
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

/**
 * Enables the oauth bearer authentication in passport
 * @param  {Object} passport            The passport object which this method should be performed on
 * @param  {Object} OAuthAccessToken    The oauth access token database model
 * @param  {Object} OAuthRedirectUri    The redirect uri database model
 * @param  {Object} User                The user database model
 * @param  {Object} Permission          The permission database model
 * @return {void}
 */
module.exports.initOAuthBearerAuthentication = (
	passport,
	OAuthAccessToken,
	User,
	Permission
) => {
	passport.use(
		new BearerStrategy(
			{
				passReqToCallback: true
			},
			(request, accessToken, callback) => {
				//keeping the database clean
				OAuthAccessToken.destroy({
					where: { expires: { $lt: new Date() } }
				})
					.then(() => {
						return OAuthAccessToken.findByToken(accessToken).then(token => {
							// No token found
							if (!token) {
								return callback(new Error("The sent token is invalid!"));
							}

							return User.findOne({
								where: { id: token.get("user_id") },
								include: [
									{
										model: Permission,
										as: "Permissions"
									}
								]
							}).then(user => {
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
										(request.requiredPermissions &&
											user.doesHavePermissions(request.requiredPermissions))
									) {
										//request.hasPermission not possible yet, as request.user
										//isn't set yet
										return callback(null, user);
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

/**
 * Enables the facebook authentication in passport
 * @param  {Object} passport            The passport object which this method should be performed on
 * @param  {Object} User                The user database model
 * @param  {Object} OAuthProvider       The oauth provider database model
 * @return {void}
 */
module.exports.initFacebookAuthentication = (passport, User, OAuthProvider) => {
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
									.getOAuthProviders({ where: { type: "facebook" } })
									.then(providers => {
										if (providers.length > 0) {
											let provider = providers[0];

											provider.set({
												accessToken,
												refreshToken
											});

											return provider.save();
										} else {
											return OAuthProvider.create({
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

/**
 * Enables the google authentication in passport
 * @param  {Object} passport            The passport object which this method should be performed on
 * @param  {Object} User                The user database model
 * @param  {Object} OAuthProvider       The oauth provider database model
 * @return {void}
 */
module.exports.initGoogleAuthentication = (passport, User, OAuthProvider) => {
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
									.getOAuthProviders({ where: { type: "google" } })
									.then(providers => {
										if (providers.length > 0) {
											let provider = providers[0];

											provider.set({
												accessToken,
												refreshToken
											});

											return provider.save();
										} else {
											return OAuthProvider.create({
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

/**
 * Initializes the user serialization in the passport object
 * @return {void}
 */
module.exports.initPassportSerialization = (passport, User, Permission) => {
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
 * @param  {Object} passport         The passport object to initialize
 * @param  {Object} User             The user database model
 * @param  {Object} Permission       The permission database model
 * @param  {Object} OAuthProvider    The oauth provider database model
 * @param  {Object} OAuthClient      The oauth client database model
 * @param  {Object} OAuthRedirectUri The oauth redirect uri database model
 * @param  {Object} OAuthAccessToken The oauth access token database model
 * @return {void}
 */
module.exports.initPassport = (
	passport,
	User,
	Permission,
	OAuthProvider,
	OAuthClient,
	OAuthRedirectUri,
	OAuthAccessToken
) => {
	initPassportSerialization(passport, User, Permission);
	initOAuthClientAuthentication(passport, OAuthClient, OAuthRedirectUri);
	initLocalAuthentication(passport, User);
	initOAuthBearerAuthentication(passport, OAuthAccessToken, User, Permission);
	initFacebookAuthentication(passport, User, OAuthProvider);
	initGoogleAuthentication(passport, User, OAuthProvider);
};
