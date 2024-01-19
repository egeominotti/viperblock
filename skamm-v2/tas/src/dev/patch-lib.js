// patch node fetch inside /node_modules/patct-lang-api
const fs = require("fs");
const path = "./node_modules/pact-lang-api/pact-lang-api.js";
let libToPatch = fs.readFileSync(path).toString().split("\n");
libToPatch[8] = (!libToPatch[8].startsWith("//") ? "// " : "") + libToPatch[8];
fs.writeFileSync(path, libToPatch.join("\n"));
