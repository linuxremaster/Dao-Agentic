// Node-only command-line entry point; browser module is candidates.js.
import { emit } from "./emit.js";
console.log(JSON.stringify(await emit()));
