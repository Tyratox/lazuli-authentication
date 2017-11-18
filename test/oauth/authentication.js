const _request = require("request");
const request = require("request-promise");
const sinon = require("sinon");

const app = require("lazuli-core/express");
const logger = require("lazuli-core/logger");
const eventEmitter = require("lazuli-core/event-emitter");
const {
	generateRandomAlphanumString
} = require("lazuli-core/utilities/crypto");

const User = require("../../models/user");
const OauthClient = require("../../models/oauth-client");
const OauthRedirectUri = require("../../models/oauth-redirect-uri");
const OauthAccessToken = require("../../models/oauth-access-token");
const OauthScope = require("../../models/oauth-scope");
const OauthCode = require("../../models/oauth-code");

const { verifyOauthClient, oauthServer } = require("../../oauth-server");

const {
	authenticateUser,
	authenticateOauthClient,
	isUserLoggedIn
} = require("../../middleware");

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
			"/oauth-login",
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
		app.get(
			"/oauth-callback",
			(request, response, next) => {
				response.end(
					"callback:" +
						(request.query.code ? request.query.code : request.query.error)
				);
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
			"/authorize",
			isUserLoggedIn,
			verifyOauthClient,
			(request, response, next) => {
				//request.oauth2.req.scope
				response.end("ask user:" + request.oauth2.transactionID);
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
			"/decision",
			isUserLoggedIn,
			oauthServer.decision((req, done) =>
				done(null, { scope: req.body.scope })
			),
			(error, request, response, next) => {
				if (error.errors) {
					return response.end(JSON.stringify(error));
				} else if (error.message) {
					return response.end(JSON.stringify({ message: error.message }));
				}
			}
		);

		app.post(
			"/token",
			authenticateOauthClient,
			oauthServer.token(),
			(error, request, response, next) => {
				if (error.errors) {
					return response.end(JSON.stringify(error));
				} else if (error.message) {
					return response.end(JSON.stringify({ message: error.message }));
				}
			}
		);
	});

	test("authentication.oauth-authorize.valid", async t => {
		let user, client;

		const email = "james@jou.le",
			password = "haha123",
			passwordResetCode = "123",
			redirectUri = "http://localhost:8100/oauth-callback",
			secret = "hidden in a chest";

		const jar = request.jar();

		return User.create({
			emailVerified: email,
			passwordResetCode,
			passwordResetCodeExpirationDate: Date.now() * 2
		})
			.then(u => {
				user = u;
				return user.updatePassword(password, passwordResetCode);
			})
			.then(() => {
				return OauthClient.create({ userId: user.get("id") }).then(c => {
					client = c;

					return client.updateSecret(secret).then(() =>
						OauthRedirectUri.create({ uri: redirectUri }).then(uri => {
							return client.addOauthRedirectUri(uri);
						})
					);
				});
			})
			.then(() => {
				return request
					.post("http://localhost:8100/oauth-login", {
						json: { email, password },
						jar,
						followAllRedirects: true
					})
					.then(response => {
						t.deepEqual(
							response,
							"success",
							"The server didn't respond with 'success'"
						);
					});
			})
			.then(() => {
				return request
					.get(
						"http://localhost:8100/authorize?response_type=code&client_id=" +
							client.get("id") +
							"&redirect_uri=" +
							redirectUri,
						{ jar }
					)
					.then(response => {
						t.deepEqual(
							response.substring(0, 8),
							"ask user",
							"The server didn't initialize the transaction successfully"
						);

						const transactionId = response.substring(9);

						//somehow request-promise-native isn't able to handle this request

						return new Promise((resolve, reject) => {
							_request(
								{
									url: "http://localhost:8100/decision",
									method: "POST",
									followAllRedirects: true,
									jar,
									form: { transaction_id: transactionId, allow: true }
								},
								(error, response, body) => {
									if (error) {
										reject(error);
									} else {
										resolve({ response, body });
									}
								}
							);
						}).then(({ response, body }) => {
							t.deepEqual(
								body.substring(0, 8),
								"callback",
								"The server didn't redirect to the callback"
							);

							const code = body.substring(9);

							return request
								.post("http://localhost:8100/token", {
									json: {
										clientId: client.get("id"),
										clientSecret: secret,
										code,
										grant_type: "authorization_code"
									}
								})
								.then(({ access_token, token_type }) => {
									t.truthy(access_token, "The access token is invalid");
									t.deepEqual(token_type, "Bearer");

									t.deepEqual(
										access_token.oauthClientId,
										client.get("id"),
										"The client id wasn't set correctly"
									);
									t.deepEqual(
										access_token.userId,
										user.get("id"),
										"The user id wasn't set correctly"
									);
									t.truthy(
										access_token.expires,
										"The expiration date wasn't set"
									);
									t.truthy(
										access_token.token,
										"The actual token wasn't set or sent"
									);

									return OauthAccessToken.findByToken(
										access_token.token
									).then(token => {
										t.truthy(token, "The received token is invalid!");
										t.deepEqual(
											{
												oauthClientId: access_token.oauthClientId,
												userId: access_token.userId,
												expires: new Date(access_token.expires)
											},
											{
												oauthClientId: token.oauthClientId,
												userId: token.userId,
												expires: token.expires
											},
											"The received data doesn't match the database"
										);
									});
								});
						});
					});
			});
	});

	test("authentication.oauth-authorize.scopes", async t => {
		let user, client;

		const email = "mairie@cur.ie",
			password = "haha123",
			passwordResetCode = "123",
			redirectUri = "http://localhost:8100/oauth-callback",
			secret = "dKGZ2EUZTZ2EU",
			scopes = ["profile.read.email", "profile.read.name"];

		const jar = request.jar();

		return User.create({
			emailVerified: email,
			passwordResetCode,
			passwordResetCodeExpirationDate: Date.now() * 2
		})
			.then(u => {
				user = u;
				return user.updatePassword(password, passwordResetCode);
			})
			.then(() => {
				return OauthClient.create({ userId: user.get("id") }).then(c => {
					client = c;

					return client.updateSecret(secret).then(() =>
						OauthRedirectUri.create({ uri: redirectUri }).then(uri => {
							return client.addOauthRedirectUri(uri);
						})
					);
				});
			})
			.then(() => {
				return request
					.post("http://localhost:8100/oauth-login", {
						json: { email, password },
						jar,
						followAllRedirects: true
					})
					.then(response => {
						t.deepEqual(
							response,
							"success",
							"The server didn't respond with 'success'"
						);
					});
			})
			.then(() => {
				return request
					.get(
						"http://localhost:8100/authorize?response_type=code&client_id=" +
							client.get("id") +
							"&redirect_uri=" +
							redirectUri +
							"&scope=" +
							scopes.join(" "),
						{ jar }
					)
					.then(response => {
						t.deepEqual(
							response.substring(0, 8),
							"ask user",
							"The server didn't initialize the transaction successfully"
						);

						const transactionId = response.substring(9);

						//somehow request-promise-native isn't able to handle this request

						return new Promise((resolve, reject) => {
							_request(
								{
									url: "http://localhost:8100/decision",
									method: "POST",
									followAllRedirects: true,
									jar,
									form: {
										transaction_id: transactionId,
										allow: true,
										scope: scopes
									}
								},
								(error, response, body) => {
									if (error) {
										reject(error);
									} else {
										resolve({ response, body });
									}
								}
							);
						}).then(({ response, body }) => {
							t.deepEqual(
								body.substring(0, 8),
								"callback",
								"The server didn't redirect to the callback"
							);

							const code = body.substring(9);

							return request
								.post("http://localhost:8100/token", {
									json: {
										clientId: client.get("id"),
										clientSecret: secret,
										code,
										grant_type: "authorization_code"
									}
								})
								.then(({ access_token, token_type }) => {
									t.truthy(access_token, "The access token is invalid");
									t.deepEqual(token_type, "Bearer");

									t.deepEqual(
										access_token.oauthClientId,
										client.get("id"),
										"The client id wasn't set correctly"
									);
									t.deepEqual(
										access_token.userId,
										user.get("id"),
										"The user id wasn't set correctly"
									);
									t.truthy(
										access_token.expires,
										"The expiration date wasn't set"
									);
									t.truthy(
										access_token.token,
										"The actual token wasn't set or sent"
									);

									return OauthAccessToken.findByToken(
										access_token.token
									).then(token => {
										t.truthy(token, "The received token is invalid!");
										t.deepEqual(
											{
												oauthClientId: access_token.oauthClientId,
												userId: access_token.userId,
												expires: new Date(access_token.expires)
											},
											{
												oauthClientId: token.oauthClientId,
												userId: token.userId,
												expires: token.expires
											},
											"The received data doesn't match the database"
										);

										return token.getOauthScopes().then(scopeInstances => {
											t.deepEqual(
												scopeInstances.map(s => s.get("scope")).sort(),
												scopes.sort()
											);
										});
									});
								});
						});
					});
			});
	});

	test("authentication.oauth-authorize.trusted", async t => {
		let user, client;

		const email = "stephen@hawki.ng",
			password = "haha123",
			passwordResetCode = "123",
			redirectUri = "http://localhost:8100/oauth-callback",
			secret = "ldfajljaw";

		const jar = request.jar();

		return User.create({
			emailVerified: email,
			passwordResetCode,
			passwordResetCodeExpirationDate: Date.now() * 2
		})
			.then(u => {
				user = u;
				return user.updatePassword(password, passwordResetCode);
			})
			.then(() => {
				return OauthClient.create({
					userId: user.get("id"),
					trusted: true
				}).then(c => {
					client = c;

					return client.updateSecret(secret).then(() =>
						OauthRedirectUri.create({ uri: redirectUri }).then(uri => {
							return client.addOauthRedirectUri(uri);
						})
					);
				});
			})
			.then(() => {
				return request
					.post("http://localhost:8100/oauth-login", {
						json: { email, password },
						jar,
						followAllRedirects: true
					})
					.then(response => {
						t.deepEqual(
							response,
							"success",
							"The server didn't respond with 'success'"
						);
					});
			})
			.then(() => {
				return request
					.get(
						"http://localhost:8100/authorize?response_type=code&client_id=" +
							client.get("id") +
							"&redirect_uri=" +
							redirectUri,
						{ jar }
					)
					.then(response => {
						t.deepEqual(
							response.substring(0, 8),
							"callback",
							"The server didn't redirect to the callback"
						);

						const code = response.substring(9);

						return request
							.post("http://localhost:8100/token", {
								json: {
									clientId: client.get("id"),
									clientSecret: secret,
									code,
									grant_type: "authorization_code"
								}
							})
							.then(({ access_token, token_type }) => {
								t.truthy(access_token, "The access token is invalid");
								t.deepEqual(token_type, "Bearer");

								t.deepEqual(
									access_token.oauthClientId,
									client.get("id"),
									"The client id wasn't set correctly"
								);
								t.deepEqual(
									access_token.userId,
									user.get("id"),
									"The user id wasn't set correctly"
								);
								t.truthy(
									access_token.expires,
									"The expiration date wasn't set"
								);
								t.truthy(
									access_token.token,
									"The actual token wasn't set or sent"
								);

								return OauthAccessToken.findByToken(
									access_token.token
								).then(token => {
									t.truthy(token, "The received token is invalid!");
									t.deepEqual(
										{
											oauthClientId: access_token.oauthClientId,
											userId: access_token.userId,
											expires: new Date(access_token.expires)
										},
										{
											oauthClientId: token.oauthClientId,
											userId: token.userId,
											expires: token.expires
										},
										"The received data doesn't match the database"
									);
								});
							});
					});
			});
	});

	test("authentication.oauth-authorize.deny", async t => {
		let user, client;

		const email = "charles@dar.win",
			password = "(r)evolution",
			passwordResetCode = "123",
			redirectUri = "http://localhost:8100/oauth-callback",
			secret = "cookie jar..?";

		const jar = request.jar();

		return User.create({
			emailVerified: email,
			passwordResetCode,
			passwordResetCodeExpirationDate: Date.now() * 2
		})
			.then(u => {
				user = u;
				return user.updatePassword(password, passwordResetCode);
			})
			.then(() => {
				return OauthClient.create({ userId: user.get("id") }).then(c => {
					client = c;

					return client.updateSecret(secret).then(() =>
						OauthRedirectUri.create({ uri: redirectUri }).then(uri => {
							return client.addOauthRedirectUri(uri);
						})
					);
				});
			})
			.then(() => {
				return request
					.post("http://localhost:8100/oauth-login", {
						json: { email, password },
						jar,
						followAllRedirects: true
					})
					.then(response => {
						t.deepEqual(
							response,
							"success",
							"The server didn't respond with 'success'"
						);
					});
			})
			.then(() => {
				return request
					.get(
						"http://localhost:8100/authorize?response_type=code&client_id=" +
							client.get("id") +
							"&redirect_uri=" +
							redirectUri,
						{ jar }
					)
					.then(response => {
						t.deepEqual(
							response.substring(0, 8),
							"ask user",
							"The server didn't initialize the transaction successfully"
						);

						//somehow request-promise-native isn't able to handle this request

						return new Promise((resolve, reject) => {
							_request(
								{
									url: "http://localhost:8100/decision",
									method: "POST",
									followAllRedirects: true,
									jar,
									form: { transaction_id: response.substring(9), cancel: true }
								},
								(error, response, body) => {
									if (error) {
										reject(error);
									} else {
										resolve({ response, body });
									}
								}
							);
						}).then(({ response, body }) => {
							t.deepEqual(
								body,
								"callback:access_denied",
								"The server didn't redirect to the callback with the right query"
							);
						});
					});
			});
	});
};
