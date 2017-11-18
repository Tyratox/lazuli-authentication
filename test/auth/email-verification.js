const request = require("request-promise");
const sinon = require("sinon");

const app = require("lazuli-core/express");
const logger = require("lazuli-core/logger");
const eventEmitter = require("lazuli-core/event-emitter");
const {
	generateRandomAlphanumString
} = require("lazuli-core/utilities/crypto");

const User = require("../../models/user");

const { verifyEmail } = require("../../middleware");

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
			"/email-verification",
			verifyEmail,
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

	test("authentication.email-verification.valid", async t => {
		const nameFirst = "nikola",
			email = "nikola@tes.la",
			password = "password123";

		return User.create({ nameFirst, emailUnverified: email }).then(user => {
			const spy = sinon.spy();

			return Promise.all([
				new Promise((resolve, reject) => {
					setTimeout(() => {
						t.truthy(
							spy.called,
							"authentication.model.user.email-verification did not fire in 500ms. This could also mean your computer is just slow."
						);
						resolve();
					}, 500);

					eventEmitter.on("authentication.model.user.email-verification", spy);
				}),
				user.initEmailVerification(true)
			])
				.then(() => {
					return user.reload();
				})
				.then(() => {
					let emailVerificationCode = user.get("emailVerificationCode");

					t.truthy(
						user.get("emailVerificationCode"),
						"The email verification code wasn't set!"
					);

					return request
						.post("http://localhost:8100/email-verification", {
							json: { email, emailVerificationCode, password }
						})
						.then(response => {
							t.deepEqual(
								response,
								"success",
								"The server didn't respond with 'success'"
							);

							return user.reload().then(async () => {
								t.truthy(
									user.get("emailVerified"),
									"The emailVerified field wasn't set"
								);
								t.falsy(
									user.get("emailUnverified"),
									"The emailUnverified field wasn't reset"
								);
								t.falsy(
									user.get(
										"emailVerificationCode",
										"The email verification code wasn't reset"
									)
								);

								return user.verifyPassword(password).catch(() => {
									t.fail("The password wasn't set");
								});
							});
						});
				});
		});
	});

	test("authentication.email-verification.valid", async t => {
		const nameFirst = "james",
			email = "james@wa.tt";

		return User.create({ nameFirst, emailUnverified: email }).then(user => {
			const spy = sinon.spy();

			return user
				.initEmailVerification()
				.then(() => {
					return user.reload();
				})
				.then(() => {
					t.truthy(
						user.get("emailVerificationCode"),
						"The email verification code wasn't set!"
					);

					return request
						.post("http://localhost:8100/email-verification", {
							json: { email, emailVerificationCode: "wrong code!" }
						})
						.then(response => {
							t.deepEqual(
								response,
								{ message: "The email verification code is invalid!" },
								"The server didn't respond with 'success'"
							);
						});
				});
		});
	});

	test("authentication.email-verification.invalid-input", async t => {
		const nameFirst = "joseph",
			email = "joseph.henry";

		return User.create({ nameFirst, emailUnverified: email }).then(user => {
			const spy = sinon.spy();

			return user
				.initEmailVerification()
				.then(() => {
					return user.reload();
				})
				.then(() => {
					return request
						.post("http://localhost:8100/email-verification", {
							json: { email, emailVerificationCode: ":=!" }
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
								"The server didn't respond with 'success'"
							);
						});
				});
		});
	});
};
