const request = require("request-promise");
const sinon = require("sinon");

const app = require("lazuli-core/express");
const logger = require("lazuli-core/logger");
const eventEmitter = require("lazuli-core/event-emitter");

const User = require("../../models/user");

const { initPasswordReset, passwordReset } = require("../../middleware");

let { generateRandomAlphanumString } = require("../../utilities/crypto");

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

module.exports = (test, initPromise) => {
	initPromise.then(data => {
		adminUserModel = data.adminUserModel;
		nonPrivUserModel = data.nonPrivUserModel;
		adminClient = data.adminClient;
		nonPrivClient = data.nonPrivClient;
		anonClient = data.anonClient;
	});

	test.before(() => {
		app.post(
			"/init-password-reset",
			initPasswordReset,
			(request, response, next) => {
				response.end("success");
			},
			(error, request, response, next) => {
				if (error.errors) {
					return response.end(JSON.stringify(error));
				} else if (error.message) {
					return response.end(JSON.stringify({ message: error.message }));
				}
			}
		);

		app.post(
			"/password-reset",
			passwordReset,
			(request, response, next) => {
				response.end("success");
			},
			(error, request, response, next) => {
				if (error.errors) {
					return response.end(JSON.stringify(error));
				} else if (error.message) {
					return response.end(JSON.stringify({ message: error.message }));
				}
			}
		);
	});

	test("authentication.init-password-reset.valid", async t => {
		const nameFirst = "isaac",
			email = "isaac@newt.on";

		return User.create({ nameFirst, emailVerified: email }).then(user => {
			const spy = sinon.spy();

			return Promise.all([
				new Promise((resolve, reject) => {
					setTimeout(() => {
						t.truthy(
							spy.called,
							"authentication.model.user.password-reset did not fire in 500ms. This could also mean your computer is just slow."
						);
						resolve();
					}, 500);

					eventEmitter.on("authentication.model.user.password-reset", spy);
				}),
				request
					.post("http://localhost:8100/init-password-reset", {
						json: { email }
					})
					.then(response => {
						t.deepEqual(
							response,
							"success",
							"The server didn't respond with 'success'"
						);

						return user.reload().then(() => {
							t.truthy(
								user.get("passwordResetCode"),
								"The reset code wasn't set"
							);
							t.truthy(
								user.get(
									"passwordResetCodeExpirationDate",
									"The expiration date wasn't set"
								)
							);
						});
					})
			]);
		});
	});

	test("authentication.init-password-reset.invalid-email", async t => {
		const nameFirst = "blaise",
			email = "blaise-pascal";

		return User.create({ nameFirst, emailVerified: email }).then(user => {
			return request
				.post("http://localhost:8100/init-password-reset", {
					json: { email }
				})
				.then(response => {
					t.deepEqual(
						response,
						{
							status: 400,
							statusText: "Bad Request",
							errors: [
								{
									field: ["email"],
									location: "body",
									messages: ['"email" must be a valid email'],
									types: ["string.email"]
								}
							]
						},
						"The server didn't reject the invalid input"
					);

					return user.reload().then(() => {
						t.falsy(
							user.get("passwordResetCode"),
							"The reset code wasn set no matter what"
						);
						t.falsy(
							user.get(
								"passwordResetCodeExpirationDate",
								"The expiration date was set no matter what"
							)
						);
					});
				});
		});
	});

	test("authentication.init-password-reset.invalid", async t => {
		const nameFirst = "alber",
			email = "alber@einst.ein";

		return request
			.post("http://localhost:8100/init-password-reset", {
				json: { email }
			})
			.then(response => {
				t.deepEqual(
					response,
					{ message: "The given email is not registered!" },
					"The server didn't reject the invalid input"
				);
			});
	});

	test("authentication.password-reset.invalid", async t => {
		const nameFirst = "michael",
			email = "michael@farad.ay",
			password = "12345678",
			passwordResetCode = "pls",
			passwordResetCodeExpirationDate = Date.now() * 2; //that'll take some time;

		return User.create({
			nameFirst,
			emailVerified: email,
			passwordResetCode,
			passwordResetCodeExpirationDate
		}).then(user => {
			return request
				.post("http://localhost:8100/password-reset", {
					json: { email, password, resetCode: "wrong code" }
				})
				.then(response => {
					t.deepEqual(
						response,
						{ message: "The password reset code is invalid!" },
						"The server didn't respond with the right error"
					);
				});
		});
	});

	test("authentication.password-reset.invalid-input", async t => {
		const nameFirst = "",
			email = "michael",
			password = "123",
			passwordResetCode = "",
			passwordResetCodeExpirationDate = Date.now() * 2;

		return User.create({
			nameFirst,
			emailVerified: email,
			passwordResetCode,
			passwordResetCodeExpirationDate
		}).then(user => {
			return request
				.post("http://localhost:8100/password-reset", {
					json: { email, password }
				})
				.then(response => {
					t.deepEqual(
						response,
						{
							status: 400,
							statusText: "Bad Request",
							errors: [
								{
									field: ["email"],
									location: "body",
									messages: ['"email" must be a valid email'],
									types: ["string.email"]
								},
								{
									field: ["resetCode"],
									location: "body",
									messages: ['"resetCode" is required'],
									types: ["any.required"]
								},
								{
									field: ["password"],
									location: "body",
									messages: [
										'"password" length must be at least 8 characters long'
									],
									types: ["string.min"]
								}
							]
						},
						"The server didn't respond with the right error"
					);
				});
		});
	});
};
