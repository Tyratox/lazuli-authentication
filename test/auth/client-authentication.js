const request = require("request-promise");
const sinon = require("sinon");

const app = require("lazuli-core/express");
const logger = require("lazuli-core/logger");
const eventEmitter = require("lazuli-core/event-emitter");

const OauthClient = require("../../src/models/oauth-client");

const { authenticateOauthClient } = require("../../src/middleware");

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
			"/oauth-client-login",
			authenticateOauthClient,
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

	test("authentication.client-authentication.valid", async t => {
		const name = "frontend",
			secret = "very secure";

		return OauthClient.create({
			name
		}).then(client => {
			const id = client.get("id");
			return client.updateSecret(secret).then(() => {
				return request
					.post("http://localhost:8100/oauth-client-login", {
						json: { clientId: id, clientSecret: secret }
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

	test("authentication.client-authentication.invalid", async t => {
		const name = "backend",
			secret = "very secure";

		return OauthClient.create({
			name
		}).then(client => {
			const id = client.get("id");
			return client.updateSecret(secret).then(() => {
				return request
					.post("http://localhost:8100/oauth-client-login", {
						json: { clientId: id, clientSecret: "wrong secret" }
					})
					.then(response => {
						t.deepEqual(
							response,
							{ message: "Unauthorized" },
							"The server didn't respond with 'success'"
						);
					});
			});
		});
	});

	test("authentication.client-authentication.invalid-input", async t => {
		return request
			.post("http://localhost:8100/oauth-client-login", {
				json: { clientId: "invalid id", clientSecret: "wrong secret" }
			})
			.then(response => {
				t.deepEqual(
					response,
					{
						status: 400,
						statusText: "Bad Request",
						errors: [
							{
								field: ["clientId"],
								location: "body",
								messages: ['"clientId" must be a number'],
								types: ["number.base"]
							}
						]
					},
					"The server didn't respond with 'success'"
				);
			});
	});
};
