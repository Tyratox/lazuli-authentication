const request = require("request-promise");

const app = require("lazuli-core/express");

const User = require("../../models/user");
const OauthClient = require("../../models/oauth-client");
const OauthRedirectUri = require("../../models/oauth-redirect-uri");

const { registration } = require("../../middleware");

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
			"/register",
			registration,
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

	test("authentication.registration.valid.nolocale.urlencoded", async t => {
		const nameFirst = "bill",
			email = "bill@gat.es";

		return request
			.post("http://localhost:8100/register", {
				form: { nameFirst, email }
			})
			.then(response => {
				t.deepEqual(
					response,
					"success",
					"The server didn't respond with 'success'"
				);

				return User.findOne({
					where: { nameFirst, emailUnverified: email }
				}).then(user => {
					t.truthy(user, "The user wasn't created!");

					if (user) {
						t.deepEqual(user.get("locale"), "en-us");
					}
				});
			});
	});

	test("authentication.registration.valid.nolocale.json", async t => {
		const nameFirst = "stave",
			email = "stave@jo.bs";

		return request
			.post("http://localhost:8100/register", {
				json: { nameFirst, email }
			})
			.then(response => {
				t.deepEqual(
					response,
					"success",
					"The server didn't respond with 'success'"
				);

				return User.findOne({
					where: { nameFirst, emailUnverified: email }
				}).then(user => {
					t.truthy(user, "The user wasn't created!");

					if (user) {
						t.deepEqual(user.get("locale"), "en-us");
					}
				});
			});
	});

	test("authentication.registration.valid.locale.urlencoded", async t => {
		const nameFirst = "john",
			email = "john@wi.ck",
			locale = "en-us";

		return request
			.post("http://localhost:8100/register", {
				json: { nameFirst, email, locale }
			})
			.then(response => {
				t.deepEqual(
					response,
					"success",
					"The server didn't respond with 'success'"
				);

				return User.findOne({
					where: { nameFirst, emailUnverified: email, locale }
				}).then(user => {
					t.truthy(user, "The user wasn't created!");
				});
			});
	});

	test("authentication.registration.valid.locale.json", async t => {
		const nameFirst = "alan",
			email = "alan@turi.ng",
			locale = "en-us";

		return request
			.post("http://localhost:8100/register", {
				json: { nameFirst, email, locale }
			})
			.then(response => {
				t.deepEqual(
					response,
					"success",
					"The server didn't respond with 'success'"
				);

				return User.findOne({
					where: { nameFirst, emailUnverified: email, locale }
				}).then(user => {
					t.truthy(user, "The user wasn't created!");
				});
			});
	});

	test("authentication.registration.invalid.nolocale.urlencoded", async t => {
		const nameFirst = "a",
			email = "thisisntanemail",
			locale = "en";

		return request
			.post("http://localhost:8100/register", {
				form: { nameFirst, email, locale }
			})
			.then(response => {
				t.deepEqual(
					response,
					JSON.stringify({
						status: 400,
						statusText: "Bad Request",
						errors: [
							{
								field: ["nameFirst"],
								location: "body",
								messages: [
									'"nameFirst" length must be at least 2 characters long'
								],
								types: ["string.min"]
							},
							{
								field: ["email"],
								location: "body",
								messages: ['"email" must be a valid email'],
								types: ["string.email"]
							},
							{
								field: ["locale"],
								location: "body",
								messages: [
									'"locale" with value "en" fails to match the required pattern: /en-us/'
								],
								types: ["string.regex.base"]
							}
						]
					}),
					"The server didn't validate the input correctly"
				);

				return User.findOne({
					where: { nameFirst, emailUnverified: email, locale }
				}).then(user => {
					t.falsy(user, "The user was created no matter what!");
				});
			});
	});

	test("authentication.registration.invalid.nolocale.json", async t => {
		const nameFirst = generateRandomAlphanumString(500),
			email = "thisisntanemail";

		return request
			.post("http://localhost:8100/register", {
				json: { nameFirst, email }
			})
			.then(response => {
				t.deepEqual(
					response,
					{
						status: 400,
						statusText: "Bad Request",
						errors: [
							{
								field: ["nameFirst"],
								location: "body",
								messages: [
									'"nameFirst" length must be less than or equal to 256 characters long'
								],
								types: ["string.max"]
							},
							{
								field: ["email"],
								location: "body",
								messages: ['"email" must be a valid email'],
								types: ["string.email"]
							}
						]
					},
					"The server didn't validate the input correctly"
				);

				return User.findOne({
					where: { nameFirst, emailUnverified: email }
				}).then(user => {
					t.falsy(user, "The user was created no matter what!");
				});
			});
	});
};
