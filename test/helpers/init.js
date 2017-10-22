const { toGlobalId, fromGlobalId } = require("graphql-relay");

const Lazuli = require("lazuli-require")("lazuli-core");
const eventEmitter = require("lazuli-require")("lazuli-core/event-emitter");

const Authentication = new (require("../../src/lazuli-authentication"))();

const User = require("../../src/models/user");
const OauthAccessToken = require("../../src/models/oauth-access-token");
const Permission = require("../../src/models/permission");

let adminToken, nonPrivToken;

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

process.on("uncaughtException", console.log);

const initPromise = Lazuli.init().then(() => {
	return User.create({
		nameDisplay: "R00t",
		nameFirst: "root",
		nameLast: "toor",
		emailVerified: "root@toor.gov"
	})
		.then(userModel => {
			return Permission.create({
				permission: "admin"
			})
				.then(permissionModel => {
					return userModel.addPermission(permissionModel);
				})
				.then(() => {
					return Promise.resolve(userModel);
				});
		})
		.then(userModel => {
			adminUserModel = userModel;
		})
		.then(() => {
			return User.create({
				nameDisplay: "nyan cat",
				nameFirst: "nyan",
				nameLast: "cat",
				emailVerified: "miouu@nyan.cat"
			});
		})
		.then(userModel => {
			nonPrivUserModel = userModel;
		})
		.then(() => {
			return OauthAccessToken.generateToken(
				adminUserModel.get("id"),
				null,
				Date.now() * 2
			);
		})
		.then(({ token }) => {
			adminToken = token;
			return OauthAccessToken.generateToken(
				nonPrivUserModel.get("id"),
				null,
				Date.now() * 2
			);
		})
		.then(({ token }) => {
			nonPrivToken = token;

			adminClient = require("./graphql-client")({
				url: "http://localhost:8100/graphql",
				headers: {
					Authorization: "Bearer " + adminToken
				}
			});
			nonPrivClient = require("./graphql-client")({
				url: "http://localhost:8100/graphql",
				headers: {
					Authorization: "Bearer " + nonPrivToken
				}
			});
			anonClient = require("./graphql-client")({
				url: "http://localhost:8100/graphql"
			});

			return Promise.resolve({
				adminUserModel,
				nonPrivUserModel,
				adminClient,
				nonPrivClient,
				anonClient
			});
		});
});

module.exports = {
	Lazuli,
	Authentication,
	initPromise
};
