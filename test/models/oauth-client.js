const { toGlobalId, fromGlobalId } = require("graphql-relay");

const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);

const OauthClient = require("../../src/models/oauth-client");
const OauthRedirectUri = require("../../src/models/oauth-redirect-uri");

let { generateRandomString } = require("../../src/utilities/crypto");

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

module.exports = (test, initPromise) => {
	initPromise.then(data => {
		adminUserModel = data.adminUserModel;
		nonPrivUserModel = data.nonPrivUserModel;
		adminClient = data.adminClient;
		nonPrivClient = data.nonPrivClient;
		anonClient = data.anonClient;
	});

	test("models.oauth-client.setSecret and verifySecret", async t => {
		const secret = generateRandomString(15);

		return OauthClient.create({}).then(clientModel => {
			return clientModel.setSecret(secret).then(() => {
				return clientModel
					.verifySecret(secret)
					.then(verified => {
						t.true(verified, "The secret couldn't be verified");
						return clientModel.verifySecret(secret + "$");
					})
					.then(verified => {
						t.false(verified, "A wrong secret was verified");
					});
			});
		});
	});

	test("models.oauth-client.verifyRedirectUri", async t => {
		const uri = generateRandomString(15);

		return OauthRedirectUri.create({ uri }).then(uriModel => {
			return OauthClient.create().then(clientModel => {
				return clientModel
					.addOauthRedirectUri(uriModel)
					.then(() => {
						return clientModel.verifyRedirectUri(uri);
					})
					.then(verified => {
						t.true(verified, "The redirect uri wasn't verified");
						return clientModel.verifyRedirectUri(uri + "$");
					})
					.then(verified => {
						t.false(verified, "A wrong redirect uri was verified");
					});
			});
		});
	});
};
