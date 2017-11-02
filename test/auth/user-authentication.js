const request = require("request-promise-native");
const sinon = require("sinon");

const app = require("lazuli-core/express");
const logger = require("lazuli-core/logger");
const eventEmitter = require("lazuli-core/event-emitter");

const User = require("../../src/models/user");

const { authenticateUser } = require("../../src/middleware");

let { generateRandomAlphanumString } = require("../../src/utilities/crypto");

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
			"/login",
			authenticateUser,
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

	test("authentication.local-authentication.valid", async t => {
		const nameFirst = "georg",
			email = "georg@o.hm",
			password = "password123",
			passwordResetCode = "resistance";

		return User.create({
			nameFirst,
			emailVerified: email,
			passwordResetCode,
			passwordResetCodeExpirationDate: Date.now() * 2
		}).then(user => {
			return user.updatePassword(password, passwordResetCode).then(() => {
				return request
					.post("http://localhost:8100/login", {
						json: { email, password }
					})
					.then(response => {
						t.deepEqual(
							response,
							"success",
							"The server didn't respond with 'success'"
						);
					});
			});
		});
	});

	test("authentication.local-authentication.invalid", async t => {
		const nameFirst = "heinrich",
			email = "heinrich@her.tz",
			password = "password123",
			passwordResetCode = "resistance";

		return User.create({
			nameFirst,
			emailVerified: email,
			passwordResetCode,
			passwordResetCodeExpirationDate: Date.now() * 2
		}).then(user => {
			return user.updatePassword(password, passwordResetCode).then(() => {
				return request
					.post("http://localhost:8100/login", {
						json: { email, password: "wrong password" }
					})
					.then(response => {
						t.deepEqual(
							response,
							{ message: "Authentication failed!" },
							"The server didn't respond with the appropriate error"
						);
					});
			});
		});
	});

	test("authentication.local-authentication.inexistent", async t => {
		return request
			.post("http://localhost:8100/login", {
				json: {
					email: "this.email@is.not.register.ed",
					password: "wrong password"
				}
			})
			.then(response => {
				t.deepEqual(
					response,
					{ message: "Authentication failed!" },
					"The server didn't respond with the appropriate error"
				);
			});
	});

	test("authentication.local-authentication.invalid-input", async t => {
		return request
			.post("http://localhost:8100/login", {
				json: { email: "not even an email", password: "wrong password" }
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
					"The server didn't respond with the appropriate error"
				);
			});
	});
};