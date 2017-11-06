const logger = require("lazuli-require")("lazuli-core/logger");

const ACCESS_DENIED = "Unauthorized";

const checkObject = (t, obj, allowed) => {
	Object.keys(obj).forEach(prop => {
		if (allowed.indexOf(prop) !== -1) {
			t.truthy(
				obj[prop],
				"graphql didn't return values that should be accessible"
			);
		} else {
			t.falsy(obj[prop], "Security Breach! graphql returned sensitive data!");
		}
	});
};

const validateAccessDenied = (t, body, allowed = []) => {
	t.truthy(body.errors, "no error was returned!");

	if (body.errors) {
		body.errors.forEach(error => {
			t.truthy(error.message, "The error doesn't contain a message!");
			t.deepEqual(
				error.message.substring(0, ACCESS_DENIED.length),
				ACCESS_DENIED,
				"graphql didn't respond with an access denied error"
			);
		});
	}

	Object.keys(body.data).forEach(key => {
		if (body.data[key]) {
			if (Array.isArray(body.data[key])) {
				body.data[key].forEach(el => {
					checkObject(t, el, allowed);
				});
			} else {
				checkObject(t, body.data[key], allowed);
			}
		}
	});
};

module.exports.validateAccessDenied = validateAccessDenied;
