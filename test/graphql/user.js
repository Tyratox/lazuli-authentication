const { toGlobalId, fromGlobalId } = require("graphql-relay");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);

const logger = require("lazuli-require")("lazuli-core/globals/logger");

const User = require("../../src/models/user");
const OauthAccessToken = require("../../src/models/oauth-access-token");
const Permission = require("../../src/models/permission");

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

const validateAccessDenied = (t, body) => {
	if (body.errors) {
		if (body.errors.length !== 1) {
			return Promise.reject("More than one error was thrown!");
		}
		if (!body.errors[0].message) {
			return Promise.reject("The error doesn't contain a message!");
		}
		const string = "Access Denied!";
		t.deepEqual(body.errors[0].message.substring(0, string.length), string);
	} else {
		logger.critical("Security Breach", body);
		return Promise.reject("No error thrown");
	}
};

module.exports = (test, initPromise) => {
	initPromise.then(data => {
		adminUserModel = data.adminUserModel;
		nonPrivUserModel = data.nonPrivUserModel;
		adminClient = data.adminClient;
		nonPrivClient = data.nonPrivClient;
		anonClient = data.anonClient;
	});

	test("graphql.query.authenticated.user", t => {
		const nameDisplay = Math.random()
				.toString()
				.substring(2),
			nameFirst = Math.random()
				.toString()
				.substring(2),
			nameLast = Math.random()
				.toString()
				.substring(2);

		return User.create({ nameDisplay, nameFirst, nameLast }).then(userModel => {
			const id = userModel.get("id");

			return adminClient
				.query(
					`query user ($id: Int!) {
						user(id: $id) {
							id,
							nameDisplay,
							nameFirst,
							nameLast
						}
					}`,
					{ id }
				)
				.then(body => {
					if (body.errors) {
						return Promise.reject(body.errors);
					}
					t.deepEqual(body.data.user, {
						id: toGlobalId(User.name, id),
						nameDisplay,
						nameFirst,
						nameLast
					});
				});
		});
	});

	test("graphql.query.anonymous.user", t => {
		const nameDisplay = Math.random()
				.toString()
				.substring(2),
			nameFirst = Math.random()
				.toString()
				.substring(2),
			nameLast = Math.random()
				.toString()
				.substring(2);

		return User.create({ nameDisplay, nameFirst, nameLast }).then(userModel => {
			const id = userModel.get("id");

			return anonClient
				.query(
					`query user ($id: Int!) {
						user(id: $id) {
							id,
							nameDisplay,
							nameFirst,
							nameLast
						}
					}`,
					{ id }
				)
				.then(body => {
					return validateAccessDenied(t, body);
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
					nameDisplay:
						name +
						Math.random()
							.toString()
							.substring(2)
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
					if (body.errors) {
						return Promise.reject(body.errors);
					}

					t.deepEqual(
						body.data.users,
						models.map(model => {
							return {
								id: toGlobalId(User.name, model.get("id")),
								nameDisplay: model.get("nameDisplay")
							};
						})
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
					nameDisplay:
						name +
						Math.random()
							.toString()
							.substring(2)
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
					return validateAccessDenied(t, body);
				});
		});
	});

	test("graphql.query.anonymous.users", t => {
		let promises = [];

		const name = "anonymous-";

		for (let i = 0; i < Math.floor(Math.random() * 10); i++) {
			promises.push(
				User.create({
					nameDisplay:
						name +
						Math.random()
							.toString()
							.substring(2)
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
		const nameDisplay = Math.random()
				.toString()
				.substring(2),
			nameFirst = Math.random()
				.toString()
				.substring(2),
			nameLast = Math.random()
				.toString()
				.substring(2);

		return adminClient
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
				if (body.errors) {
					return Promise.reject(body.errors);
				}

				if (!body.data.upsertUser || !body.data.upsertUser.id) {
					return Promise.reject(new Error("Invalid response"));
				}

				const globalId = body.data.upsertUser.id,
					databaseId = fromGlobalId(body.data.upsertUser.id).id;

				return User.findById(databaseId).then(userModel => {
					t.deepEqual(body.data.upsertUser, {
						id: toGlobalId(User.name, userModel.get("id")),
						nameDisplay: userModel.get("nameDisplay"),
						nameFirst: userModel.get("nameFirst"),
						nameLast: userModel.get("nameLast")
					});

					//update existing

					return adminClient
						.query(
							`mutation upsertUser ($user: User!) {
								upsertUser(user: $user) {
									id,
									nameDisplay,
									nameFirst,
									nameLast
								}
							}`,
							{ user: { id: databaseId, nameDisplay: "displayName" } }
						)
						.then(body => {
							if (body.errors) {
								return Promise.reject(body.errors);
							}

							if (!body.data.upsertUser || !body.data.upsertUser.id) {
								return Promise.reject(new Error("Invalid response"));
							}

							t.deepEqual(body.data.upsertUser, {
								id: toGlobalId(User.name, userModel.get("id")),
								nameDisplay: "displayName",
								nameFirst: userModel.get("nameFirst"),
								nameLast: userModel.get("nameLast")
							});
						});
				});
			});
	});

	test("graphql.mutation.non-priv.user.upsert", t => {
		//create a new one
		const nameDisplay = Math.random()
				.toString()
				.substring(2),
			nameFirst = Math.random()
				.toString()
				.substring(2),
			nameLast = Math.random()
				.toString()
				.substring(2);

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
		const nameDisplay = Math.random()
				.toString()
				.substring(2),
			nameFirst = Math.random()
				.toString()
				.substring(2),
			nameLast = Math.random()
				.toString()
				.substring(2);

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
		const nameDisplay = Math.random()
				.toString()
				.substring(2),
			nameFirst = Math.random()
				.toString()
				.substring(2),
			nameLast = Math.random()
				.toString()
				.substring(2);

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
					if (body.errors) {
						return Promise.reject(body.errors);
					}

					if (typeof body.data.deleteUser === undefined) {
						return Promise.reject(new Error("Invalid response"));
					}

					t.true(body.data.deleteUser);

					return User.findById(userModel.get("id")).then(newUserModel => {
						t.falsy(newUserModel);
					});
				});
		});
	});

	test("graphql.mutation.non-priv.user.delete", t => {
		//create a new one
		const nameDisplay = Math.random()
				.toString()
				.substring(2),
			nameFirst = Math.random()
				.toString()
				.substring(2),
			nameLast = Math.random()
				.toString()
				.substring(2);

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
		const nameDisplay = Math.random()
				.toString()
				.substring(2),
			nameFirst = Math.random()
				.toString()
				.substring(2),
			nameLast = Math.random()
				.toString()
				.substring(2);

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
