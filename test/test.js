//import test from "ava";

process.on("uncaughtException", console.log);

const Lazuli = require("lazuli-require")("lazuli-core");
const eventEmitter = require("lazuli-require")(
	"lazuli-core/globals/event-emitter"
);

const Authentication = new (require("../src/lazuli-authentication"))();

Lazuli.init();

/*test("lazuli init", t => {
	t.pass();
});*/

eventEmitter.emit("express.stop");
