const { toGlobalId, fromGlobalId } = require("graphql-relay");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");

const User = require("../../src/models/user");
const OauthAccessToken = require("../../src/models/oauth-access-token");
const Permission = require("../../src/models/permission");
const OauthProvider = require("../../src/models/oauth-provider");

const { validateAccessDenied } = require("../helpers/graphql");

let { generateRandomString } = require("../../src/utilities/crypto");
let orig = generateRandomString;
generateRandomString = length => {
	//alphanum
	return orig(length).replace(/[^A-z0-9]/g, Math.floor(Math.random() * 10));
};

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

module.exports = (test, initPromise) => {
	initPromise.then(data => {
		adminUserModel = data.adminUserModel;
		nonPrivUserModel = data.nonPrivUserModel;
		adminClient = data.adminClient;
		nonPrivClient = data.nonPrivClient;
		anonClient = data.anonClient;
	});

	test("graphql.query.authenticated.user", t => {
		const nameDisplay = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15),
			permission = generateRandomString(15),
			provider = Math.random() < 0.5 ? "facebook" : "google",
			accessToken = generateRandomString(15),
			refreshToken = generateRandomString(15);

		return User.create({ nameDisplay, nameFirst, nameLast }).then(userModel => {
			const id = userModel.get("id");

			return Permission.create({ permission })
				.then(permissionModel => {
					return userModel.addPermission(permissionModel);
				})
				.then(() => {
					return OauthProvider.create({
						provider,
						accessToken,
						refreshToken,
						userId: id
					});
				})
				.then(() => {
					return adminClient
						.query(
							`query user ($id: Int!) {
							user(id: $id) {
								id,
								nameDisplay,
								nameFirst,
								nameLast,
								permissions{
									edges{
										node{
											permission
										}
									}
								},
								oauthProviders{
									edges{
										node{
											provider,
											accessToken,
											refreshToken
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
								body.data.user,
								{
									id: toGlobalId(User.name, id),
									nameDisplay,
									nameFirst,
									nameLast,
									permissions: { edges: [{ node: { permission } }] },
									oauthProviders: {
										edges: [{ node: { provider, accessToken, refreshToken } }]
									}
								},
								"graphql response doesn't match the input"
							);
						});
				});
		});
	});

	test("graphql.query.non-priv.user", t => {
		const nameDisplay = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15);

		return User.create({ nameDisplay, nameFirst, nameLast }).then(userModel => {
			const id = userModel.get("id");

			return nonPrivClient
				.query(
					`query user ($id: Int!) {
						user(id: $id) {
							id,
							nameDisplay,
							nameFirst,
							nameLast,
							permissions{
								edges{
									node{
										permission
									}
								}
							},
							oauthProviders{
								edges{
									node{
										provider,
										accessToken,
										refreshToken
									}
								}
							}
						}
					}`,
					{ id }
				)
				.then(body => {
					return validateAccessDenied(t, body, ["id"]);
				});
		});
	});

	test("graphql.query.anonymous.user", t => {
		const nameDisplay = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15);

		return User.create({ nameDisplay, nameFirst, nameLast }).then(userModel => {
			const id = userModel.get("id");

			return anonClient
				.query(
					`query user ($id: Int!) {
						user(id: $id) {
							id,
							nameDisplay,
							nameFirst,
							nameLast,
							permissions{
								edges{
									node{
										permission
									}
								}
							},
							oauthProviders{
								edges{
									node{
										provider,
										accessToken,
										refreshToken
									}
								}
							}
						}
					}`,
					{ id }
				)
				.then(body => {
					return validateAccessDenied(t, body, ["id"]);
				});
		});
	});

	test("graphql.query.authenticated.users", t => {
		//lets create a few new users with a similar name

		let promises = [];

		const name = "authenticated-";

		for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
			promises.push(
				User.create({
					nameDisplay: name + generateRandomString(15)
				})
			);
		}

		return Promise.all(promises).then(models => {
			return adminClient
				.query(
					`query users ($query: String!) {
						users(nameDisplay: $query) {
							id,
							nameDisplay
						}
					}`,
					{ query: name }
				)
				.then(body => {
					t.falsy(body.errors, "graphql returned errors");

					t.deepEqual(
						body.data.users,
						models.map(model => {
							return {
								id: toGlobalId(User.name, model.get("id")),
								nameDisplay: model.get("nameDisplay")
							};
						}),
						"graphql response doesn't match the input"
					);
				});
		});
	});

	test("graphql.query.non-priv.users", t => {
		let promises = [];

		const name = "non-priv-";

		for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
			promises.push(
				User.create({
					nameDisplay: name + generateRandomString(15)
				})
			);
		}

		return Promise.all(promises).then(models => {
			return nonPrivClient
				.query(
					`query users ($query: String!) {
						users(nameDisplay: $query) {
							id,
							nameDisplay
						}
					}`,
					{ query: name }
				)
				.then(body => {
					return validateAccessDenied(t, body, ["id"]);
				});
		});
	});

	test("graphql.query.anonymous.users", t => {
		let promises = [];

		const name = "anonymous-";

		for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
			promises.push(
				User.create({
					nameDisplay: name + generateRandomString(15)
				})
			);
		}

		return Promise.all(promises).then(models => {
			return anonClient
				.query(
					`query users ($query: String!) {
						users(nameDisplay: $query) {
							id,
							nameDisplay
						}
					}`,
					{ query: name }
				)
				.then(body => {
					return validateAccessDenied(t, body);
				});
		});
	});

	test("graphql.mutation.authenticated.user.upsert", t => {
		//create a new one
		const nameDisplay = generateRandomString(15),
			nameDisplay2 = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15),
			permission1 = generateRandomString(15),
			permission2 = generateRandomString(15);

		return adminClient
			.query(
				`mutation upsertUser ($user: User!) {
					upsertUser(user: $user) {
						id,
						nameDisplay,
						nameFirst,
						nameLast,
						permissions{
							edges{
								node{
									permission
								}
							}
						}
					}
				}`,
				{
					user: { nameDisplay, nameFirst, nameLast, permissions: [permission1] }
				}
			)
			.then(body => {
				t.falsy(body.errors, "graphql returned errors");

				t.truthy(body.data.upsertUser, "invalid graphql response");
				if (body.data.upsertUser) {
					t.truthy(body.data.upsertUser.id, "invalid graphql response");
				}

				const globalId = body.data.upsertUser.id,
					databaseId = fromGlobalId(body.data.upsertUser.id).id;

				return User.find({
					where: { id: databaseId },
					include: [{ model: Permission, as: "Permissions" }]
				}).then(userModel => {
					t.deepEqual(
						body.data.upsertUser,
						{
							id: toGlobalId(User.name, userModel.get("id")),
							nameDisplay: nameDisplay,
							nameFirst: userModel.get("nameFirst"),
							nameLast: userModel.get("nameLast"),
							permissions: {
								edges: userModel.get("Permissions").map(permissionModel => {
									return {
										node: { permission: permissionModel.get("permission") }
									};
								})
							}
						},
						"graphql response doesn't match the database"
					);

					t.deepEqual(
						body.data.upsertUser,
						{
							id: toGlobalId(User.name, userModel.get("id")),
							nameDisplay,
							nameFirst,
							nameLast,
							permissions: {
								edges: [{ node: { permission: permission1 } }]
							}
						},
						"graphql response doesn't match the input"
					);

					//update existing

					return adminClient
						.query(
							`mutation upsertUser ($user: User!) {
								upsertUser(user: $user) {
									id,
									nameDisplay,
									nameFirst,
									nameLast,
									permissions{
										edges{
											node{
												permission
											}
										}
									}
								}
							}`,
							{
								user: {
									id: databaseId,
									nameDisplay: nameDisplay2,
									permissions: [permission2]
								}
							}
						)
						.then(body => {
							t.falsy(body.errors, "graphql returned errors");

							t.truthy(body.data.upsertUser, "invalid graphql response");
							if (body.data.upsertUser) {
								t.truthy(body.data.upsertUser.id, "invalid graphql response");
							}

							return userModel.reload().then(() => {
								t.deepEqual(
									body.data.upsertUser,
									{
										id: toGlobalId(User.name, userModel.get("id")),
										nameDisplay: userModel.get("nameDisplay"),
										nameFirst: userModel.get("nameFirst"),
										nameLast: userModel.get("nameLast"),
										permissions: {
											edges: userModel
												.get("Permissions")
												.map(permissionModel => {
													return {
														node: {
															permission: permissionModel.get("permission")
														}
													};
												})
										}
									},
									"graphql response doesn't match the database"
								);

								t.deepEqual(
									body.data.upsertUser,
									{
										id: toGlobalId(User.name, userModel.get("id")),
										nameDisplay: nameDisplay2,
										nameFirst,
										nameLast,
										permissions: {
											edges: [{ node: { permission: permission2 } }]
										}
									},
									"graphql response doesn't match input"
								);
							});
						});
				});
			});
	});

	test("graphql.mutation.non-priv.user.upsert", t => {
		//create a new one
		const nameDisplay = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15);

		return nonPrivClient
			.query(
				`mutation upsertUser ($user: User!) {
					upsertUser(user: $user) {
						id,
						nameDisplay,
						nameFirst,
						nameLast
					}
				}`,
				{ user: { nameDisplay, nameFirst, nameLast } }
			)
			.then(body => {
				return validateAccessDenied(t, body);
			});
	});

	test("graphql.mutation.anonymous.user.upsert", t => {
		//create a new one
		const nameDisplay = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15);

		return anonClient
			.query(
				`mutation upsertUser ($user: User!) {
					upsertUser(user: $user) {
						id,
						nameDisplay,
						nameFirst,
						nameLast
					}
				}`,
				{ user: { nameDisplay, nameFirst, nameLast } }
			)
			.then(body => {
				return validateAccessDenied(t, body);
			});
	});

	test("graphql.mutation.authenticated.user.delete", t => {
		//create a new one
		const nameDisplay = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15);

		return User.create({
			nameDisplay,
			nameFirst,
			nameLast
		}).then(userModel => {
			return adminClient
				.query(
					`mutation deleteUser ($id: Int!) {
							deleteUser(id: $id)
						}`,
					{ id: userModel.get("id") }
				)
				.then(body => {
					t.falsy(body.errors, "graphql returned errors");

					t.true(
						body.data.deleteUser,
						"graphql reports that the user wasn't deleted"
					);

					return User.findById(userModel.get("id")).then(newUserModel => {
						t.falsy(newUserModel, "The user was still found in the database");
					});
				});
		});
	});

	test("graphql.mutation.non-priv.user.delete", t => {
		//create a new one
		const nameDisplay = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15);

		return User.create({
			nameDisplay,
			nameFirst,
			nameLast
		}).then(userModel => {
			return nonPrivClient
				.query(
					`mutation deleteUser ($id: Int!) {
							deleteUser(id: $id)
						}`,
					{ id: userModel.get("id") }
				)
				.then(body => {
					return validateAccessDenied(t, body);
				});
		});
	});

	test("graphql.mutation.anon.user.delete", t => {
		//create a new one
		const nameDisplay = generateRandomString(15),
			nameFirst = generateRandomString(15),
			nameLast = generateRandomString(15);

		return User.create({
			nameDisplay,
			nameFirst,
			nameLast
		}).then(userModel => {
			return anonClient
				.query(
					`mutation deleteUser ($id: Int!) {
							deleteUser(id: $id)
						}`,
					{ id: userModel.get("id") }
				)
				.then(body => {
					return validateAccessDenied(t, body);
				});
		});
	});
};
