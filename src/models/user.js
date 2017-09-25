const async = require("async");
const Sequelize = require("sequelize");

const {
	LOCALES,
	TOKEN_LENGTH,
	RESET_CODE_LIFETIME,
	CONFIRM_TOKEN_LENGTH
} = require("lazuli-require")("lazuli-config");

const { sendEmail } = require("lazuli-require")("lazuli-email");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);
const valueFilter = require("lazuli-require")(
	"lazuli-core/globals/value-filter"
);
const sequelize = require("lazuli-require")("lazuli-core/globals/sequelize");

const Permission = require("./Permission");

const {
	generateRandomString,
	generateHash
} = require("../utilities/crypto.js");

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
			unique: true
		},
		emailUnverified: {
			type: Sequelize.STRING,
			unique: true
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
 * Associates this model with others
 * @param  {Object} models An object containing all registered database models
 * @return {void}
 */
User.associate = function(models) {
	eventEmitter.emit("model.user.association.before", this);

	this.Permissions = this.belongsToMany(models.Permission, {
		as: "Permissions",
		foreignKey: "userId",
		otherKey: "permissionId",
		through: "permission_relations",
		onDelete: "cascade",
		hooks: true
	});

	this.OauthProviders = this.hasMany(models.OauthProvider, {
		as: "OauthProviders",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	this.OauthAccessTokens = this.hasMany(models.OauthAccessToken, {
		as: "OauthAccessTokens",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	this.OauthCodes = this.hasMany(models.OauthCode, {
		as: "OauthCodes",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	this.OauthClients = this.hasMany(models.OauthClient, {
		as: "OauthClients",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	eventEmitter.emit("model.user.association.after", this);

	this.graphQlType = require("../types/user");

	/*this.hasMany(Image, {
		as: "Images",
		foreignKey: "userId"
	});

	this.belongsTo(Image, {
		as: "ProfilePicture",
		foreignKey: "profilePictureId",
		constraints: false //otherwise we have a circular dependency
	});

	this.hasMany(Book, {
		as: "Books",
		foreignKey: "userId"
	});

	this.hasMany(Offer, {
		as: "Offers",
		foreignKey: "userId",
		onDelete: "cascade",
		hooks: true
	});

	this.hasMany(OfferRequest, {
		as: "OfferRequests",
		foreignKey: "userId",
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
					eventEmitter.emit("model.user.register.after", user);
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
	const user = this.build({
		nameDisplay: profile.displayName,
		nameFirst: profile.givenName,
		nameLast: profile.familyName,

		emailVerified: profile.emails[0].value
	});

	eventEmitter.emit("model.user.from-passport-profile.before", user, profile);

	/*let url = profile.photos[0].value;
	if (url.indexOf("?sz=50") !== -1) {
		url = url.replace("?sz=50", "?sz=500");
	}*/

	return this.save()
		.then(user => {
			return Promise.all(
				valueFilter.filter(
					"model.user.from-passport-profile.save",
					[],
					user,
					profile
				)
			);
		})
		.then(user.reload)
		.then(() => {
			return eventEmitter.emit("model.user.from-passport-profile.after", user);
		})
		.then(() => {
			return Promise.resolve(user);
		});
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

	eventEmitter.emit("model.user.from-passport-profile.before", this);

	return this.save()
		.then(user => {
			return Promise.all(
				valueFilter.filter(
					"model.user.from-passport-profile.save",
					[],
					this,
					profile
				)
			);
		})
		.then(this.reload)
		.then(() => {
			eventEmitter.emit("model.user.from-passport-profile.after", this);
		})
		.then(() => {
			return Promise.resolve(this);
		});
};

/**
 * Verifies if the passed password is equal to the stored one
 * @param  {String} password The password to verify
 * @return {Promise}         A promise to check whether the pas
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
			const { hash, salt, algorithm } = generateHash(password);

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
	const passwordResetCode = generateRandomString(TOKEN_LENGTH);
	const expirationDate = Date.now() + RESET_CODE_LIFETIME * 1000;

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
	const emailVerificationCode = generateRandomString(CONFIRM_TOKEN_LENGTH);

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
		return Promise.reject(new Error("The email verification code is invalid!"));
	}
};

/**
 * Checks whether the user has all of the passed permissions
 * @param  {Array}  [permissionsNeeded=[]] The permissions to check for
 * @return {Promise}
 */
User.prototype.doesHavePermissions = function(permissionsNeeded = []) {
	let promise;
	if (!this.get("Permissions")) {
		promise = this.reload({
			include: [
				{
					model: Permission,
					as: "Permissions"
				}
			]
		});
	} else {
		promise = Promise.resolve(this);
	}

	return promise.then(() => {
		const permissions = this.get("Permissions").map(permission => {
			return permission.get("permission");
		});

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
 * @param  {Array}  [permissionsNeeded=[]] The permission to check for
 * @return {Promise}
 */
User.prototype.doesHavePermission = function(permission) {
	return this.doesHavePermissions([permission]);
};

/**
 * Sets the permissions of the user
 * @param  {Array} permissions   An array of permissions to set to the user
 * @return {Promise}             A promise whether the update was successfull
 */
User.prototype.setPermissionArray = function(permissions) {
	const Permission = require("./permission");

	return new Promise((resolve, reject) => {
		let permissionInstances = [];

		async.each(
			permissions,
			(permission, callback) => {
				Permission.findOrCreate({
					where: { permission },
					defaults: { permission }
				})
					.then(result => {
						let promises = [];
						const permissionInstance = result[0],
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

module.exports = User;
