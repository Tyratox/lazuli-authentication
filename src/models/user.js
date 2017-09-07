const pick = require("lodash/pick");
const async = require("async");
const Sequelize = require("sequelize");

const {
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLNonNull,
	GraphQLList
} = require("graphql");

const { resolver, attributeFields } = require("graphql-sequelize");

// graphql-js prototypes are automatically extended
require("graphql-schema-utils");

const {
	LOCALES,
	TOKEN_LENGTH,
	RESET_CODE_LIFETIME,
	CONFIRM_TOKEN_LENGTH
} = require("lazuli-require")("lazuli-config");

const { sendEmail } = require("lazuli-require")("lazuli-email");

/**
  * Generates the oauth access token sequelize model
  * @param {Object} eventEmitter The global event emitter
  * @param {Object} valueFilter The global value filter object
  * @param {Object} sequelize The sequelize object to define the model on
  */
module.exports = (eventEmitter, valueFilter, sequelize) => {
	const User = sequelize.define(
		"user",
		valueFilter.filterable("model.user.attributes", {
			nameDisplay: {
				type: Sequelize.STRING,
				default: ""
			},
			nameFirst: {
				type: Sequelize.STRING,
				default: ""
			},
			nameLast: {
				type: Sequelize.STRING,
				default: ""
			},
			emailVerified: {
				type: Sequelize.STRING,
				unique: true,
				validate: {
					isEmail: true
				}
			},
			emailUnverified: {
				type: Sequelize.STRING,
				unique: true,
				validate: {
					isEmail: true
				}
			},
			emailVerificationCode: {
				type: Sequelize.STRING
			},
			passwordHash: {
				type: Sequelize.STRING
			},
			passwordSalt: {
				type: Sequelize.STRING
			},
			passwordAlgorithm: {
				type: Sequelize.STRING
			},
			passwordResetCode: {
				type: Sequelize.STRING
			},
			passwordResetCodeExpirationDate: {
				type: Sequelize.DATE
			},
			locale: {
				type: Sequelize.STRING,
				default: "en-US",
				validate: {
					isIn: [LOCALES]
				}
			}
		}),
		valueFilter.filterable("model.user.options", {
			charset: "utf8",
			collate: "utf8_unicode_ci"
		})
	);

	/**
	 * The graphql object type for this model
	 * @type {GraphQLObjectType}
	 */
	User.graphQLType = new GraphQLObjectType({
		name: "user",
		description: "A user",
		fields: attributeFields(User, {
			allowNull: false
		})
	});

	/**
	 * Associates this model with others
	 * @param  {Object} models An object containing all registered database models
	 * @return {void}
	 */
	User.associate = function({
		Permission,
		OAuthProvider,
		OAuthAccessToken,
		OAuthCode,
		OAuthClient
		/*Image,
		Book,
		Offer,
		OfferRequest*/
	}) {
		eventEmitter.emit("model.user.association.before", this);

		this.belongsToMany(Permission, {
			as: "Permissions",
			foreignKey: "user_id",
			otherKey: "permission_id",
			through: "permission_relations",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OAuthProvider, {
			as: "OAuthProviders",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OAuthAccessToken, {
			as: "OAuthAccessTokens",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OAuthCode, {
			as: "OAuthCodes",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OAuthClient, {
			as: "OAuthClients",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		eventEmitter.emit("model.user.association.after", this);

		eventEmitter.emit("graphql.type.user.association.before", this);

		User.graphQLType = User.graphQLType.merge(
			new GraphQLObjectType({
				name: "user",
				fields: valueFilter.filterable("graphql.type.user.association", {
					permissions: {
						type: new GraphQLNonNull(
							new GraphQLList(new GraphQLNonNull(Permission.graphQLType))
						),
						resolve: resolver(Permission)
					},
					oauthProviders: {
						type: new GraphQLNonNull(
							new GraphQLList(new GraphQLNonNull(OAuthProvider.graphQLType))
						),
						resolve: resolver(OAuthProvider)
					},
					oauthAccessTokens: {
						type: new GraphQLNonNull(
							new GraphQLList(new GraphQLNonNull(OAuthAccessToken.graphQLType))
						),
						resolve: resolver(OAuthAccessToken)
					},
					oauthCodes: {
						type: new GraphQLNonNull(
							new GraphQLList(new GraphQLNonNull(OAuthCode.graphQLType))
						),
						resolve: resolver(OAuthCode)
					},
					oauthClients: {
						type: new GraphQLNonNull(
							new GraphQLList(new GraphQLNonNull(OAuthClient.graphQLType))
						),
						resolve: resolver(OAuthClient)
					}
				})
			})
		);

		eventEmitter.emit("graphql.type.user.association.after", this);

		/*this.hasMany(Image, {
			as: "Images",
			foreignKey: "user_id"
		});

		this.belongsTo(Image, {
			as: "ProfilePicture",
			foreignKey: "profile_picture_id",
			constraints: false //otherwise we have a circular dependency
		});

		this.hasMany(Book, {
			as: "Books",
			foreignKey: "user_id"
		});

		this.hasMany(Offer, {
			as: "Offers",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});

		this.hasMany(OfferRequest, {
			as: "OfferRequests",
			foreignKey: "user_id",
			onDelete: "cascade",
			hooks: true
		});*/
	};

	eventEmitter.addListener("model.association", User.associate.bind(User));

	/**
	 * Gets the sequelize user a passport profile
	 * @param  {Object} profile The passport profile of the user to search for
	 * @return {Promise}        A sequelize search promise
	 */
	User.getUserByPassportProfile = function(profile) {
		return this.findOne({
			where: {
				emailVerified: { $in: profile.emails.map(obj => obj.value) }
			}
		});
	};

	/**
	 * Registers a user
	 * @param  {String} firstName The user's first name
	 * @param  {String} email     The user's email address
	 * @param  {String} locale    The user's locale
	 * @return {Promise}          A promise to check whether the registration was successfull
	 */
	User.register = function(firstName, email, locale) {
		let lastName = "";
		let names = firstName.split(" ");

		if (names.length === 2) {
			firstName = names[0];
			lastName = names[1];
		}

		let userData = {
			nameDisplay: firstName,
			nameFirst: firstName,

			permission: [],

			emailUnverified: email,
			emailVerificationCode: "",

			locale: locale
		};

		return this.findAll({
			where: {
				$or: [{ emailVerified: email }, { emailUnverified: email }]
			}
		}).then(users => {
			if (users && users.length > 0) {
				return Promise.reject("This email is already registered!");
			} else {
				return this.create(userData).then(user => {
					user.initEmailVerification(true).then(() => {
						eventEmitter.emit("after-user-registration", user);
						return Promise.resolve(user);
					});
				});
			}
		});
	};

	/**
	 * Finds or creates a user based on a passport profile
	 * @param  {Object} profile The passport profile to base to user on
	 * @return {Promise}        The promise to check for the success of the action
	 */
	User.findOrCreateUserByPassportProfile = function(profile) {
		return this.getUserByPassportProfile(profile).then(user => {
			if (user) {
				//update values for the current user
				return user.updateFromPassportProfile(profile);
			} else {
				//we have to create a new user
				return this.createFromPassportProfile(profile);
			}
		});
	};

	/**
	 * Creates a user based on a passport profile
	 * @param  {Object} profile The passport profile to base the user on
	 * @return {Promise}        A promise to check for the success of the action
	 */
	User.createFromPassportProfile = function(profile) {
		let user = this.build({
			nameDisplay: profile.displayName,
			nameFirst: profile.givenName,
			nameLast: profile.familyName,

			emailVerified: profile.emails[0].value
		});

		/*let url = profile.photos[0].value;
		if (url.indexOf("?sz=50") !== -1) {
			url = url.replace("?sz=50", "?sz=500");
		}*/

		return (
			user
				.save()
				/*.then(user => {
				return request
					.get({ uri: url, encoding: null })
					.then(buffer => {
						return model.Image.store(buffer, user);
					})
					.then(image => {
						return user.setProfilePicture(image);
					});
			})*/
				.then(() => {
					return user.reload();
				})
		);
	};

	/**
	 * Updates a user based on a passport profile
	 * @param  {Object} profile The passport profile to base the user on
	 * @return {Promise}        A promise to check for the success of the action
	 */
	User.prototype.updateFromPassportProfile = function(profile) {
		this.set({
			nameDisplay: profile.displayName,
			nameFirst: profile.givenName,
			nameLast: profile.familyName
		});

		let url = profile.photos[0].value;
		if (url.indexOf("?sz=50") !== -1) {
			url = url.replace("?sz=50", "?sz=500");
		}

		return (
			this.save()
				/*.then(user => {
				return request
					.get({ uri: url, encoding: null })
					.then(buffer => {
						return model.Image.store(buffer, user);
					})
					.then(image => {
						return user.setProfilePicture(image);
					});
			})*/
				.then(() => {
					return this.reload();
				})
		);
	};

	/**
	 * Verifies if the passed password is equal to the stored one
	 * @param  {String} password The password to verify
	 * @return {Promise}         A promise to check whether the pas
	 */
	User.prototype.verifyPassword = function(password) {
		let { hash } = cryptoUtilities.generateHash(
			password,
			this.get("passwordSalt"),
			this.get("passwordAlgorithm")
		);

		let { hash: newHash, newAlgorithm } = cryptoUtilities.generateHash(
			password,
			this.get("passwordSalt")
		);

		if (hash == this.get("passwordHash")) {
			//password is correct, check if the hash algorithm changed

			if (this.get("passwordAlgorithm") !== newAlgorithm) {
				//yes it did, hash and store the password with the new algorithm one
				this.set("passwordHash", newHash);
				this.set("passwordAlgorithm", newAlgorithm);
			}

			return this.save().then(user => {
				return Promise.resolve(true);
			});
		} else {
			return Promise.resolve(false);
		}
	};

	/**
	 * Updates the user's password
	 * @param  {String} password          The new password
	 * @param  {String} passwordResetCode The received password reset code
	 * @return {Promise}                  A promise to check whether the password could be updated
	 */
	User.prototype.updatePassword = function(password, passwordResetCode) {
		if (
			this.get("passwordResetCode") &&
			this.get("passwordResetCode") === passwordResetCode
		) {
			if (this.get("passwordResetCodeExpirationDate") >= new Date()) {
				let { hash, salt, algorithm } = cryptoUtilities.generateHash(password);

				this.set({
					passwordHash: hash,
					passwordSalt: salt,
					passwordAlgorithm: algorithm,
					passwordResetCode: ""
				});

				return this.save().then(user => {
					return;
				});
			} else {
				return Promise.reject(
					new Error("The password reset code has already expired!")
				);
			}
		} else {
			return Promise.reject(new Error("The password reset code is invalid!"));
		}
	};

	/**
	 * Initiates a passowrd reset
	 * @return {Promise} A promise to check whether the email was sent
	 */
	User.prototype.initPasswordReset = function() {
		let passwordResetCode = cryptoUtilities.generateRandomString(TOKEN_LENGTH);
		let expirationDate = Date.now() + RESET_CODE_LIFETIME * 1000;

		this.set("passwordResetCode", passwordResetCode);
		this.set("passwordResetCodeExpirationDate", expirationDate);

		return sendEmail(
			this.get("emailVerified"),
			__dirname + "/../templates/emails/password-reset",
			this.get("locale"),
			{ user: this.get() }
		).then(() => {
			return this.save().then(() => {
				return true;
			});
		});
	};

	/**
	 * Initiates the email verification
	 * @return {Promise} A promise to check whether the email was sent
	 */
	User.prototype.initEmailVerification = function(registration = false) {
		let emailVerificationCode = cryptoUtilities.generateRandomString(
			CONFIRM_TOKEN_LENGTH
		);

		return sendEmail(
			this.get("emailUnverified"),
			__dirname + "/../templates/emails/email-confirmation",
			this.get("locale"),
			{
				user: this.get()
			}
		).then(() => {
			this.set("emailVerificationCode", emailVerificationCode);

			if (registration) {
				this.set("passwordResetCode", emailVerificationCode);
				this.set(
					"passwordResetCodeExpirationDate",
					Date.now() + RESET_CODE_LIFETIME * 1000
				);
			}

			return this.save().then(() => {
				return true;
			});
		});
	};

	/**
	 * Verifies an email
	 * @param  {String} [email=""]                   The email to verify
	 * @param  {String} [emailVerificationCode=null] The received email verification code
	 * @return {Promise}                             A promise to check whether the email could be verified
	 */
	User.prototype.verifyEmail = function(
		email = "",
		emailVerificationCode = null
	) {
		if (
			email &&
			emailVerificationCode &&
			this.get("emailVerificationCode") === emailVerificationCode &&
			this.get("emailUnverified") === email
		) {
			this.set({
				emailVerified: email,
				emailVerificationCode: "",
				emailUnverified: null
			});

			return this.save().then(() => {
				return true;
			});
		} else {
			return Promise.reject(
				new Error("The email verification code is invalid!")
			);
		}
	};

	/**
	 * Gets the permission array
	 * @return {Array} An array of the permissions the user has
	 */
	User.prototype.getPermissionArray = function() {
		if (!this.get("Permissions")) {
			console.log(
				new Error("Permissions weren't included in this instance of User!")
			);
			return [];
		}
		return this.get("Permissions").map(permission => {
			return permission.get("permission");
		});
	};

	/**
	 * Checks whether the user has all of the passed permissions
	 * @param  {Array}  [permissionsNeeded=[]] The permissions to check for
	 * @return {Boolean}                       Whether the user has all the passed permissions
	 */
	User.prototype.doesHavePermissions = function(permissionsNeeded = []) {
		let permissions = this.getPermissionArray();

		let missing = permissionsNeeded.filter(permission => {
			for (let i = 0; i < permissions.length; i++) {
				// has exactly this permission or has a higher level permission

				if (
					permission === permissions[i] ||
					permission.startsWith(permissions[i] + ".")
				) {
					return false; //not missing, remove from array
				}
			}

			return true; //missing, leave in array
		});

		return missing.length === 0;
	};

	/**
	 * Checks whether the user has the passed permission
	 * @param  {Array}  [permissionsNeeded=[]] The permission to check for
	 * @return {Boolean}                       Whether the user has the passed permission
	 */
	User.prototype.doesHavePermission = function(permission) {
		return this.doesHavePermissions([permission]);
	};

	/**
	 * Sets the permissions of the user
	 * @param  {Array} permissions   An array of permissions to set to the user
	 * @return {Promise}             A promise whether the update was successfull
	 */
	User.prototype.setPermissionsStrings = function(permissions) {
		return new Promise((resolve, reject) => {
			let permissionInstances = [];

			async.each(
				permissions,
				(permission, callback) => {
					model.Permission
						.findOrCreate({
							where: { permission: permission },
							defaults: { permission: permission }
						})
						.then(result => {
							let promises = [];
							let permissionInstance = result[0],
								created = result[1];

							permissionInstances.push(permissionInstance);
							callback();
						})
						.catch(err => {
							return callback(err);
						});
				},
				err => {
					if (err) {
						throw err;
					}

					this.setPermissions(permissionInstances)
						.then(() => {
							resolve(true);
						})
						.catch(err => {
							reject(err);
						});
				}
			);
		});
	};

	return User;
};
