import test from "ava";

const { initPromise } = require("./helpers/init.js");

let adminUserModel, adminClient, anonClient;

test.before(t => {
	return initPromise.then(data => {
		adminUserModel = data.adminUserModel;
		adminClient = data.adminClient;
		anonClient = data.anonClient;
	});
});

require("./graphql/user")(test, initPromise);
require("./graphql/oauth-client")(test, initPromise);

require("./models/user")(test, initPromise);
require("./models/oauth-client")(test, initPromise);
