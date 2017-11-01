const { toGlobalId, fromGlobalId } = require("graphql-relay");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");

const OauthClient = require("../../src/models/oauth-client");
const OauthRedirectUri = require("../../src/models/oauth-redirect-uri");

const { validateAccessDenied } = require("../helpers/graphql");

const {
	generateRandomAlphanumString,
	generateHash
} = require("../../src/utilities/crypto");

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

const oauthClientAllowed = ["id"];

module.exports = (test, initPromise) => {
	initPromise.then(data => {
		adminUserModel = data.adminUserModel;
		nonPrivUserModel = data.nonPrivUserModel;
		adminClient = data.adminClient;
		nonPrivClient = data.nonPrivClient;
		anonClient = data.anonClient;
	});

	test("graphql.query.authenticated.oauth-client", t => {
		const name = "frontend",
			secret = "very-secure-secret",
			trusted = true,
			uri = "https://redirect.uri";

		return OauthClient.create({ name, trusted, uri }).then(clientModel => {
			const id = clientModel.get("id");

			return clientModel
				.setSecret(secret)
				.then(() => {
					return OauthRedirectUri.create({ uri, oauthClientId: id });
				})
				.then(uriModel => {
					return clientModel.addOauthRedirectUri(uriModel);
				})
				.then(() => {
					return adminClient
						.query(
							`query oauthClient ($id: Int!) {
                oauthClient(id: $id) {
                  id,
                  name,
                  secretHash,
                  trusted,
                  oauthRedirectUris{
                    edges{
                      node{
                        uri
                      }
                    }
                  }
                }
              }`,
							{ id }
						)
						.then(body => {
							t.falsy(body.errors, "graphql returned errors");

							t.deepEqual(
								body.data.oauthClient,
								{
									id: toGlobalId(OauthClient.name, id),
									name,
									secretHash: generateHash(
										secret,
										clientModel.get("secretSalt"),
										clientModel.get("secretAlgorithm")
									).hash,
									trusted,
									oauthRedirectUris: { edges: [{ node: { uri } }] }
								},
								"graphql response doesn't match the input"
							);
						});
				});
		});
	});

	test("graphql.query.non-priv.oauth-client", t => {
		const name = "backend",
			secret = "super secure",
			trusted = true,
			uri = "https://back.end";

		return OauthClient.create({ name, trusted, uri }).then(clientModel => {
			const id = clientModel.get("id");

			return clientModel
				.setSecret(secret)
				.then(() => {
					return OauthRedirectUri.create({ uri, oauthClientId: id });
				})
				.then(uriModel => {
					return clientModel.addOauthRedirectUri(uriModel);
				})
				.then(() => {
					return nonPrivClient
						.query(
							`query oauthClient ($id: Int!) {
                oauthClient(id: $id) {
                  id,
                  name,
                  secretHash,
                  trusted,
                  oauthRedirectUris{
                    edges{
                      node{
                        uri
                      }
                    }
                  }
                }
              }`,
							{ id }
						)
						.then(body => {
							return validateAccessDenied(t, body, oauthClientAllowed);
						});
				});
		});
	});

	test("graphql.query.anonymous.oauth-client", t => {
		const name = "ios",
			secret = "out of ideas",
			trusted = false,
			uri = "https://url.tld";

		return OauthClient.create({ name, trusted, uri }).then(clientModel => {
			const id = clientModel.get("id");

			return clientModel
				.setSecret(secret)
				.then(() => {
					return OauthRedirectUri.create({ uri, oauthClientId: id });
				})
				.then(uriModel => {
					return clientModel.addOauthRedirectUri(uriModel);
				})
				.then(() => {
					return anonClient
						.query(
							`query oauthClient ($id: Int!) {
                oauthClient(id: $id) {
                  id,
                  name,
                  secretHash,
                  trusted,
                  oauthRedirectUris{
                    edges{
                      node{
                        uri
                      }
                    }
                  }
                }
              }`,
							{ id }
						)
						.then(body => {
							return validateAccessDenied(t, body, oauthClientAllowed);
						});
				});
		});
	});

	test("graphql.query.authenticated.oauth-clients", t => {
		let promises = [];

		const name = "authenticated-";

		for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
			promises.push(
				OauthClient.create({
					name: name + generateRandomAlphanumString(15)
				})
			);
		}

		return Promise.all(promises).then(models => {
			return adminClient
				.query(
					`query oauthClients ($query: String!) {
						oauthClients(name: $query) {
							id,
							name
						}
					}`,
					{ query: name }
				)
				.then(body => {
					t.falsy(body.errors, "Graphql returned errors");

					t.deepEqual(
						body.data.oauthClients,
						models.map(model => {
							return {
								id: toGlobalId(OauthClient.name, model.get("id")),
								name: model.get("name")
							};
						}),
						"graphql response doesn't match the input"
					);
				});
		});
	});

	test("graphql.query.non-priv.oauth-clients", t => {
		let promises = [];

		const name = "non-priv-";

		for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
			promises.push(
				OauthClient.create({
					name: name + generateRandomAlphanumString(15)
				})
			);
		}

		return Promise.all(promises).then(models => {
			return nonPrivClient
				.query(
					`query oauthClients ($query: String!) {
						oauthClients(name: $query) {
							id,
							name
						}
					}`,
					{ query: name }
				)
				.then(body => {
					return validateAccessDenied(t, body, oauthClientAllowed);
				});
		});
	});

	test("graphql.query.anonymous.oauth-clients", t => {
		let promises = [];

		const name = "anonymous-";

		for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
			promises.push(
				OauthClient.create({
					name: name + generateRandomAlphanumString(15)
				})
			);
		}

		return Promise.all(promises).then(models => {
			return anonClient
				.query(
					`query oauthClients ($query: String!) {
						oauthClients(name: $query) {
							id,
							name
						}
					}`,
					{ query: name }
				)
				.then(body => {
					return validateAccessDenied(t, body, oauthClientAllowed);
				});
		});
	});

	test("graphql.mutation.authenticated.oauth-client.upsert", t => {
		//create a new one
		const name = "oauth",
			name2 = "client",
			redirectUri = "https://re.di.rect",
			redirectUri2 = "https://ur.l";

		return adminClient
			.query(
				`mutation upsertOauthClient ($client: OauthClient!) {
					upsertOauthClient(oauthClient: $client) {
						id,
						name,
						oauthRedirectUris{
							edges{
								node{
									uri
								}
							}
						}
					}
				}`,
				{
					client: { name, oauthRedirectUris: [redirectUri] }
				}
			)
			.then(body => {
				t.falsy(body.errors, "graphql returned errors");

				t.truthy(body.data.upsertOauthClient, "invalid graphql response");
				if (body.data.upsertOauthClient) {
					t.truthy(body.data.upsertOauthClient.id, "invalid graphql response");
				}

				const globalId = body.data.upsertOauthClient.id,
					databaseId = fromGlobalId(body.data.upsertOauthClient.id).id;

				return OauthClient.find({
					where: { id: databaseId },
					include: [{ model: OauthRedirectUri, as: "OauthRedirectUris" }]
				}).then(clientModel => {
					t.deepEqual(
						body.data.upsertOauthClient,
						{
							id: toGlobalId(OauthClient.name, clientModel.get("id")),
							name: name,
							oauthRedirectUris: {
								edges: clientModel.get("OauthRedirectUris").map(uriModel => {
									return {
										node: { uri: uriModel.get("uri") }
									};
								})
							}
						},
						"graphql response doesn't match the database"
					);

					t.deepEqual(
						body.data.upsertOauthClient,
						{
							id: toGlobalId(OauthClient.name, clientModel.get("id")),
							name,
							oauthRedirectUris: {
								edges: [{ node: { uri: redirectUri } }]
							}
						},
						"graphql response doesn't match the input"
					);

					//update existing

					return adminClient
						.query(
							`mutation upsertOauthClient ($client: OauthClient!) {
								upsertOauthClient(oauthClient: $client) {
									id,
									name,
									oauthRedirectUris{
										edges{
											node{
												uri
											}
										}
									}
								}
							}`,
							{
								client: {
									id: databaseId,
									name: name2,
									oauthRedirectUris: [redirectUri2]
								}
							}
						)
						.then(body => {
							t.falsy(body.errors, "graphql returned errors");

							t.truthy(body.data.upsertOauthClient, "invalid graphql response");
							if (body.data.upsertOauthClient) {
								t.truthy(
									body.data.upsertOauthClient.id,
									"invalid graphql response"
								);
							}

							return clientModel.reload().then(() => {
								t.deepEqual(
									body.data.upsertOauthClient,
									{
										id: toGlobalId(OauthClient.name, clientModel.get("id")),
										name: clientModel.get("name"),
										oauthRedirectUris: {
											edges: clientModel
												.get("OauthRedirectUris")
												.map(uriModel => {
													return {
														node: {
															uri: uriModel.get("uri")
														}
													};
												})
										}
									},
									"graphql response doesn't match the database"
								);

								t.deepEqual(
									body.data.upsertOauthClient,
									{
										id: toGlobalId(OauthClient.name, clientModel.get("id")),
										name: name2,
										oauthRedirectUris: {
											edges: [{ node: { uri: redirectUri2 } }]
										}
									},
									"graphql response doesn't match input"
								);
							});
						});
				});
			});
	});

	test("graphql.mutation.non-priv.oauth-client.upsert", t => {
		//create a new one
		const name = "android";

		return nonPrivClient
			.query(
				`mutation upsertOauthClient ($client: OauthClient!) {
					upsertOauthClient(oauthClient: $client) {
						id,
						name
					}
				}`,
				{ client: { name } }
			)
			.then(body => {
				return validateAccessDenied(t, body);
			});
	});

	test("graphql.mutation.anonymous.oauth-client.upsert", t => {
		//create a new one
		const name = "windows-phone";

		return anonClient
			.query(
				`mutation upsertOauthClient ($client: OauthClient!) {
					upsertOauthClient(oauthClient: $client) {
						id,
						name
					}
				}`,
				{ client: { name } }
			)
			.then(body => {
				return validateAccessDenied(t, body);
			});
	});

	test("graphql.mutation.authenticated.oauth-client.delete", t => {
		//create a new one
		const name = "nokia?";

		return OauthClient.create({
			name
		}).then(clientModel => {
			return adminClient
				.query(
					`mutation deleteOauthClient ($id: Int!) {
							deleteOauthClient(id: $id)
						}`,
					{ id: clientModel.get("id") }
				)
				.then(body => {
					t.falsy(body.errors, "graphql returned errors");

					t.true(
						body.data.deleteOauthClient,
						"graphql reports that the user wasn't deleted"
					);

					return OauthClient.findById(
						clientModel.get("id")
					).then(newClientModel => {
						t.falsy(
							newClientModel,
							"The oauth client was still found in the database"
						);
					});
				});
		});
	});

	test("graphql.mutation.non-priv.oauth-client.delete", t => {
		//create a new one
		const name = "blackberry?";

		return OauthClient.create({
			name
		}).then(clientModel => {
			return nonPrivClient
				.query(
					`mutation deleteOauthClient ($id: Int!) {
							deleteOauthClient(id: $id)
						}`,
					{ id: clientModel.get("id") }
				)
				.then(body => {
					return validateAccessDenied(t, body);
				});
		});
	});

	test("graphql.mutation.anon.oauth-client.delete", t => {
		//create a new one
		const name = "ipad";

		return OauthClient.create({
			name
		}).then(clientModel => {
			return anonClient
				.query(
					`mutation deleteOauthClient ($id: Int!) {
							deleteOauthClient(id: $id)
						}`,
					{ id: clientModel.get("id") }
				)
				.then(body => {
					return validateAccessDenied(t, body);
				});
		});
	});
};
