const { toGlobalId, fromGlobalId } = require("graphql-relay");

const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");

const User = require("../../src/models/user");
const OauthAccessToken = require("../../src/models/oauth-access-token");
const Permission = require("../../src/models/permission");

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

module.exports = (test, initPromise) => {
	initPromise.then(data => {
		adminUserModel = data.adminUserModel;
		nonPrivUserModel = data.nonPrivUserModel;
		adminClient = data.adminClient;
		nonPrivClient = data.nonPrivClient;
		anonClient = data.anonClient;
	});

	test("models.user.setPermissionArray", async t => {
		return User.create({}).then(userModel => {
			return userModel
				.setPermissionArray(["admin"])
				.then(() => {
					return userModel.reload({
						include: [{ model: Permission, as: "Permissions" }]
					});
				})
				.then(() => {
					t.deepEqual(
						userModel.get("Permissions").map(model => model.permission),
						["admin"]
					);
				})
				.then(() => {
					return userModel.setPermissionArray(["override"]);
				})
				.then(() => {
					return userModel.reload();
				})
				.then(() => {
					t.deepEqual(
						userModel.get("Permissions").map(model => model.permission),
						["override"]
					);
				});
		});
	});

	test("models.user.can", async t => {
		return User.create({}).then(userModel => {
			return userModel
				.setPermissionArray(["admin"])
				.then(() => {
					return userModel.can(["admin", "admin.blablabla"]);
				})
				.then(() => {
					t.pass();
				})
				.catch(() => {
					t.fail();
				});
		});
	});

	test("models.user.findUserByPassportProfile", async t => {
		return User.create({ emailVerified: "root@world.gov" }).then(userModel => {
			return userModel.reload().then(() => {
				return User.getUserByPassportProfile({
					emails: [
						{ value: "test@e.mail" },
						{ value: "root@world.gov" },
						{ value: "lorem@ipsum.dolor" }
					]
				}).then(foundModel => {
					t.deepEqual(foundModel.get(), userModel.get());
				});
			});
		});
	});
};
