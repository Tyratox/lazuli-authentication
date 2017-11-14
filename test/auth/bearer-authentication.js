const request = require("request-promise");
const sinon = require("sinon");

const app = require("lazuli-core/express");
const logger = require("lazuli-core/logger");
const eventEmitter = require("lazuli-core/event-emitter");

const User = require("../../models/user");
const OauthClient = require("../../models/oauth-client");
const OauthAccessToken = require("../../models/oauth-access-token");

const {
	authenticateBearer,
	authenticateBearerSoft
} = require("../../middleware");

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
		app.get(
			"/bearer-authentication",
			authenticateBearer,
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
		app.get(
			"/bearer-authentication-soft",
			authenticateBearerSoft,
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

	test("authentication.bearer-authentication.valid", async t => {
		let user, client, accessToken;

		return User.create({})
			.then(u => {
				user = u;
				return OauthClient.create({});
			})
			.then(c => {
				client = c;
				return OauthAccessToken.generateToken(
					user.get("id"),
					client.get("id"),
					Date.now() * 2
				);
			})
			.then(({ model, token }) => {
				accessToken = model;

				return request
					.get("http://localhost:8100/bearer-authentication", {
						headers: { Authorization: "Bearer " + token }
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

	test("authentication.bearer-authentication.invalid", async t => {
		return request
			.get("http://localhost:8100/bearer-authentication", {
				headers: { Authorization: "Bearer novalidToken" }
			})
			.then(response => {
				t.deepEqual(
					JSON.parse(response),
					{ message: "Unauthorized" },
					"The server didn't respond with 'success'"
				);
			});
	});

	test("authentication.bearer-authentication.no-header", async t => {
		return request
			.get("http://localhost:8100/bearer-authentication", {})
			.catch(err => {
				t.deepEqual(
					err.error,
					"Unauthorized",
					"The server didn't respond with 'Unauthorized'"
				);
				t.deepEqual(
					err.message,
					'401 - "Unauthorized"',
					"The server didn't respond with 'Unauthorized'"
				);
			});
	});

	test("authentication.bearer-authentication-soft.valid", async t => {
		let user, client, accessToken;

		return User.create({})
			.then(u => {
				user = u;
				return OauthClient.create({});
			})
			.then(c => {
				client = c;
				return OauthAccessToken.generateToken(
					user.get("id"),
					client.get("id"),
					Date.now() * 2
				);
			})
			.then(({ model, token }) => {
				accessToken = model;

				return request
					.get("http://localhost:8100/bearer-authentication-soft", {
						headers: { Authorization: "Bearer " + token }
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

	test("authentication.bearer-authentication-soft.invalid", async t => {
		return request
			.get("http://localhost:8100/bearer-authentication-soft", {
				headers: { Authorization: "Bearer novalidToken" }
			})
			.then(response => {
				t.deepEqual(
					JSON.parse(response),
					{ message: "Unauthorized" },
					"The server didn't respond with 'success'"
				);
			});
	});

	test("authentication.bearer-authentication-soft.no-header", async t => {
		return request
			.get("http://localhost:8100/bearer-authentication-soft", {})
			.then(response => {
				t.deepEqual(
					response,
					"success",
					"The server didn't respond with 'success'"
				);
			});
	});
};
