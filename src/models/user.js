const path = require("path");
const { STRING, DATE } = require("sequelize");

const {
	LOCALES,
	TOKEN_LENGTH,
	RESET_CODE_LIFETIME,
	CONFIRM_TOKEN_LENGTH
} = require("lazuli-require")("lazuli-config");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");
const valueFilter = require("lazuli-require")("lazuli-core/value-filter");
const sequelize = require("lazuli-require")("lazuli-core/sequelize");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

const Permission = require("./permission");

/**
 * The user sequelize module
 * @module lazuli-authentication/models/user
 */

/**
 * The user sequelize model
 * @class
 * @memberof module:lazuli-authentication/models/user
 *
 * @type {User}
 * @version 1.0
 * @since 1.0
 *
 * @see module:lazuli-authentication/models/permission
 * @see module:lazuli-authentication/models/oauth-provider
 * @see module:lazuli-authentication/models/oauth-access-token
 * @see module:lazuli-authentication/models/oauth-code
 * @see module:lazuli-authentication/models/oauth-client
 */
const User = sequelize.define("user", {
	nameDisplay: {
		type: STRING,
		default: ""
	},
	nameFirst: {
		type: STRING,
		default: ""
	},
	nameLast: {
		type: STRING,
		default: ""
	},
	emailVerified: {
		type: STRING,
		unique: true
	},
	emailUnverified: {
		type: STRING,
		unique: true
	},
	emailVerificationCode: {
		type: STRING
	},
	passwordHash: {
		type: STRING
	},
	passwordSalt: {
		type: STRING
	},
	passwordAlgorithm: {
		type: STRING
	},
	passwordResetCode: {
		type: STRING
	},
	passwordResetCodeExpirationDate: {
		type: DATE
	},
	locale: {
		type: STRING,
		default: "en-us",
		validate: {
			isIn: [LOCALES]
		}
	}
});

/**
 * Associates this model with others
 * @version 1.0
 * @since 1.0
 *
 * @static
 * @public
 *
 * @fires "authentication.model.user.association"
 *
 * @param {object} models The models to associate with
 * @param {module:lazuli-authentication/models/permission.Permission} models.Permission The permission model
 * @param {module:lazuli-authentication/models/oauth-provider.OauthProvider} models.OauthProvider The oauth provider model
 * @param {module:lazuli-authentication/models/oauth-access-token.OauthAccessToken} models.OauthAccessToken The oauth access token model
 * @param {module:lazuli-authentication/models/oauth-code.OauthCode} models.OauthCode The oauth code model
 * @param {module:lazuli-authentication/models/oauth-client.OauthClient} models.OauthClient The oauth client model
 * @return {promise<void>}
 */
User.associate = function({
	Permission,
	OauthProvider,
	OauthAccessToken,
	OauthCode,
	OauthClient
}) {
	/**
	 * The User - Permission relation.
	 * Will be set after associate is called
	 * @name Permissions
	 * @since 1.0
	 * @type {BelongsToMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/user.User
	 */
	this.Permissions = this.belongsToMany(Permission, {
		as: "Permissions",
		foreignKey: "userId",
		otherKey: "permissionId",
		through: "permission_relations",
		hooks: true
	});

	/**
	 * The User - OauthProvider relation
	 * @name OauthProviders
	 * @since 1.0
	 * @name OauthProviders
	 * @type {HasMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/user.User
	 */
	this.OauthProviders = this.hasMany(OauthProvider, {
		as: "OauthProviders",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	/**
	 * The User - OauthAccessToken relation
	 * @name OauthAccessTokens
	 * @since 1.0
	 * @type {HasMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/user.User
	 */
	this.OauthAccessTokens = this.hasMany(OauthAccessToken, {
		as: "OauthAccessTokens",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	/**
	 * The User - OauthCode relation
	 * @name OauthCodes
	 * @since 1.0
	 * @type {HasMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/user.User
	 */
	this.OauthCodes = this.hasMany(OauthCode, {
		as: "OauthCodes",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	/**
	 * The User - OauthClient relation
	 * @name OauthClients
	 * @since 1.0
	 * @type {HasMany}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/user.User
	 */
	this.OauthClients = this.hasMany(OauthClient, {
		as: "OauthClients",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	/**
	 * The related graphql type
	 * @name graphQlType
	 * @since 1.0
	 * @type {module:lazuli-authentication/types/user.UserType}
	 * @public
	 * @static
	 * @memberof module:lazuli-authentication/models/user.User
	 *
	 * @see module:lazuli-authentication/types/user
	 */
	this.graphQlType = require("../types/user");

	/**
     * Event that is fired before the password reset code and
	 * its expiration date are set during a password reset.
	 * This event can (and should) be used to hand the reset code
	 * the the user via e.g. email.
     *
     * @event "authentication.model.user.association"
	 * @version 1.0
	 * @since 1.0
     * @type {object}
     * @property {module:lazuli-authentication/models/user.User} User The user model
     */
	return eventEmitter.emit("authentication.model.user.association", {
		User: this
	});
};

/**
 * Gets the sequelize user a passport profile
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @static
 *
 * @param  {Profile} profile The passport profile of the user to search for
 * @return {promise<module:lazuli-authentication/models/user.User>} A sequelize search promise
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
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @static
 *
 * @param  {string} firstName The user's first name
 * @param  {string} email The user's email address
 * @param  {string} locale The user's locale
 * @return {promise<module:lazuli-authentication/models/user.User>} A promise to check whether the registration was successfull
 */
User.register = function(firstName, email, locale) {
	let lastName = "";
	const names = firstName.split(" ");

	if (names.length === 2) {
		firstName = names[0];
		lastName = names[1];
	}

	const userData = {
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
				return user.initEmailVerification(true).then(() => {
					return Promise.resolve(user);
				});
			});
		}
	});
};

/**
 * Finds or creates a user based on a passport profile
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @static
 *
 * @fires "authentication.model.user.from-passport-profile.before"
 * @fires "authentication.model.user.from-passport-profile.after"
 *
 * @param  {Profile} profile The passport profile to base to user on
 * @return {promise<module:lazuli-authentication/models/user.User>} The promise to check for the success of the action
 */
User.findOrCreateUserByPassportProfile = function(profile) {
	return this.getUserByPassportProfile(profile).then(user => {
		if (user) {
			//update values for the current user
			return user._updateFromPassportProfile(profile);
		} else {
			//we have to create a new user
			return this._createFromPassportProfile(profile);
		}
	});
};

/**
 * Creates a user based on a passport profile
 * @version 1.0
 * @since 1.0
 *
 * @private
 * @static
 *
 * @fires "authentication.model.user.from-passport-profile.before"
 * @fires "authentication.model.user.from-passport-profile.after"
 *
 * @param  {PassportProfile} profile The passport profile to base the user on
 * @return {promise<module:lazuli-authentication/models/user.User>} A promise to check for the success of the action
 */
User._createFromPassportProfile = function(profile) {
	const user = this.build({
		nameDisplay: profile.displayName,
		nameFirst: profile.givenName,
		nameLast: profile.familyName,

		emailVerified: profile.emails[0].value
	});

	/**
     * Event that is fired before the user is created
	 * based on a passport profile.
	 * This event can be used to add e.g. a profile picutre
     *
     * @event "authentication.model.user.from-passport-profile.before"
     * @type {object}
     * @property {object} user The user model
	 * @property {object} profile The passport profile
     */
	eventEmitter
		.emit("authentication.model.user.from-passport-profile.before", {
			user,
			profile
		})
		.then(user.save)
		.then(user.reload)
		.then(() =>
			/**
			 * Event that is fired after the user is created
			 * based on a passport profile.
			 *
			 * @event "authentication.model.user.from-passport-profile.after"
			 * @type {object}
			 * @property {object} user The user model
			 * @property {object} profile The passport profile
			 */
			eventEmitter.emit("model.user.from-passport-profile.after", {
				user,
				profile
			})
		)
		.then(() => Promise.resolve(user));
};

/**
 * Updates a user based on a passport profile
 * @version 1.0
 * @since 1.0
 *
 * @private
 * @instance
 * @method _updateFromPassportProfile
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @fires "authentication.model.user.from-passport-profile.before"
 * @fires "authentication.model.user.from-passport-profile.after"
 *
 * @param  {PassportProfile} profile The passport profile to base the user on
 * @return {promise<module:lazuli-authentication/models/user.User>} A promise to check for the success of the action
 */
User.prototype._updateFromPassportProfile = function(profile) {
	this.set({
		nameDisplay: profile.displayName,
		nameFirst: profile.givenName,
		nameLast: profile.familyName
	});

	//event was already defined on in '_createFromPassportProfile'
	eventEmitter
		.emit("authentication.model.user.from-passport-profile.before", {
			user: this,
			profile
		})
		.then(this.save)
		.then(this.reload)
		.then(() =>
			/**
			 * Event that is fired after the user is updated
			 * based on a passport profile.
			 *
			 * @event "authentication.model.user.from-passport-profile.after"
			 * @type {object}
			 * @property {object} user The user model
			 * @property {object} profile The passport profile
			 */
			eventEmitter.emit("model.user.from-passport-profile.after", {
				user,
				profile
			})
		)
		.then(() => Promise.resolve(this));
};

/**
 * Verifies if the passed password is equal to the stored one
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method verifyPassword
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @param  {string} password The password to verify
 * @return {promise<boolean>} A promise to check whether the password could be verified
 */
User.prototype.verifyPassword = function(password) {
	const { hash } = generateHash(
		password,
		this.get("passwordSalt"),
		this.get("passwordAlgorithm")
	);

	const { hash: newHash, newAlgorithm } = generateHash(
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

		return this.save().then(() => {
			return Promise.resolve(true);
		});
	} else {
		return Promise.resolve(false);
	}
};

/**
 * Updates the user's password
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method updatePassword
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @param  {string} password The new password
 * @param  {string} passwordResetCode The received password reset code
 * @return {promise<void>} A promise to check whether the password could be updated
 */
User.prototype.updatePassword = function(password, passwordResetCode) {
	if (
		this.get("passwordResetCode") &&
		this.get("passwordResetCode") === passwordResetCode
	) {
		if (this.get("passwordResetCodeExpirationDate") >= new Date()) {
			const { hash, salt, algorithm } = generateHash(password);

			this.set({
				passwordHash: hash,
				passwordSalt: salt,
				passwordAlgorithm: algorithm,
				passwordResetCode: "",
				passwordResetCodeExpirationDate: 0
			});

			return this.save();
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
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method initPasswordReset
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @fires "authentication.model.user.password-reset.init"
 *
 * @return {promise<void>} A promise to check whether the email was sent
 */
User.prototype.initPasswordReset = function() {
	const passwordResetCode = generateRandomString(TOKEN_LENGTH);
	const expirationDate = Date.now() + RESET_CODE_LIFETIME * 1000;

	/**
     * Event that is fired before the password reset code is
	 * set during the password reset initialization.
	 * This event can (and should) be used to hand the reset code
	 * the the user.
     *
     * @event "authentication.model.user.password-reset"
     * @type {object}
     * @property {string} passwordResetCode The password reset code
	 * @property {number} expirationDate The passwort reset code expiration date
     */
	return eventEmitter
		.emit("authentication.model.user.password-reset", {
			passwordResetCode,
			expirationDate
		})
		.then(() => {
			this.set("passwordResetCode", passwordResetCode);
			this.set("passwordResetCodeExpirationDate", expirationDate);

			return this.save();
		});
};

/**
 * Initiates the email verification
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method initEmailVerification
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @fires "authentication.model.user.email-verification"
 *
 * @param {boolean} [registration=false] Whether this is the initial email verification (registration)
 * @return {promise<void>} A promise to check whether the email was sent
 */
User.prototype.initEmailVerification = function(registration = false) {
	const emailVerificationCode = generateRandomString(CONFIRM_TOKEN_LENGTH);

	/**
     * Event that is fired before the email verification code is
	 * set during the email verification.
	 * This event can (and should) be used to hand the verification code
	 * the the user via email.
     *
     * @event "authentication.model.user.email-verification"
     * @type {object}
     * @property {string} emailVerificationCode The email verification code
	 * @property {boolean} registration Whether this is the initial email verification (registration)
     */
	return eventEmitter
		.emit("authentication.model.user.email-verification", {
			emailVerificationCode,
			registration
		})
		.then(() => {
			this.set("emailVerificationCode", emailVerificationCode);

			if (registration) {
				this.set("passwordResetCode", emailVerificationCode);
				this.set(
					"passwordResetCodeExpirationDate",
					Date.now() + RESET_CODE_LIFETIME * 1000
				);
			}

			return this.save();
		});
};

/**
 * Verifies an email
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method verifyEmail
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @param  {string} [email=""] The email to verify
 * @param  {string} [emailVerificationCode=null] The received email verification code
 * @return {promise<void>} A promise to check whether the email could be verified
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

		return this.save();
	} else {
		return Promise.reject(new Error("The email verification code is invalid!"));
	}
};

/**
 * Checks whether the user has all of the passed permissions
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method doesHavePermissions
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @param  {array} [permissionsNeeded=[]] The permissions to check for
 * @return {promise<boolean>} Whether the user has the given permissions
 */
User.prototype.doesHavePermissions = function(permissionsNeeded = []) {
	return this.getPermissions().then(permissionModels => {
		const permissions = permissionModels.map(permission =>
			permission.get("permission")
		);

		const missing = permissionsNeeded.filter(permission => {
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

		return Promise.resolve(missing.length === 0);
	});
};

/**
 * Checks whether the user has the passed permission
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method doesHavePermission
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @param  {array}  [permissionsNeeded=[]] The permission to check for
 * @return {promise<boolean>} Whether the user has the given permissions
 */
User.prototype.doesHavePermission = function(permission) {
	return this.doesHavePermissions([permission]);
};

/**
 * Sets the permissions of the user
 * @version 1.0
 * @since 1.0
 *
 * @public
 * @instance
 * @method setPermissionArray
 * @memberof module:lazuli-authentication/models/user.User
 *
 * @param  {array} [permissions=[]] An array of permissions to set to the user
 * @return {promise<void>}
 */
User.prototype.setPermissionArray = function(permissions = []) {
	const promises = permissions.map(permission => {
		return Permission.findOrCreate({
			where: { permission },
			defaults: { permission }
		}).then(result => Promise.resolve(result[0]));
	});

	return Promise.all(promises).then(permissionInstances => {
		return this.setPermissions(permissionInstances);
	});
};

module.exports = User;
