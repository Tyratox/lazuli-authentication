//import test from "ava";

process.on("uncaughtException", console.log);

const Lazuli = require("lazuli-require")("lazuli-core");
const Authentication = new (require("../src/lazuli-authentication"))(
	Lazuli.eventEmitter,
	Lazuli.valueFilter
);

Lazuli.init();
//
// test("load empty config", t => {
// 	t.deepEqual({}, {});
// });
