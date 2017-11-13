const { toGlobalId, fromGlobalId } = require("graphql-relay");

const eventEmitter = require("lazuli-core/event-emitter");

const OauthClient = require("../../src/models/oauth-client");
const OauthRedirectUri = require("../../src/models/oauth-redirect-uri");

let adminUserModel, nonPrivUserModel, adminClient, nonPrivClient, anonClient;

module.exports = (test, initPromise) => {
	initPromise.then(data => {
		adminUserModel = data.adminUserModel;
		nonPrivUserModel = data.nonPrivUserModel;
		adminClient = data.adminClient;
		nonPrivClient = data.nonPrivClient;
		anonClient = data.anonClient;
	});

	test("models.oauth-client.updateSecret and verifySecret", async t => {
		const secret = "secure secret";

		return OauthClient.create({}).then(clientModel => {
			return clientModel.updateSecret(secret).then(() => {
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
		const uri = "https://re.direct.uri";

		return OauthRedirectUri.create({ uri }).then(uriModel => {
			return OauthClient.create().then(clientModel => {
				return clientModel
					.addOauthRedirectUri(uriModel)
					.then(() => {
						return clientModel.verifyRedirectUri(uri);
					})
					.then(() => {
						t.pass();
						return clientModel.verifyRedirectUri(uri + "$");
					})
					.then(() => {
						t.fail("A wrong redirect uri was verified");
					})
					.catch(() => {
						t.pass();
					});
			});
		});
	});
};
