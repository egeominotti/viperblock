process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// configs
global.tokens = require("../tokens.json");
global.externalConfig = require("./externalConfig.json");
global.internalConfig = require("./internalConfig.json");
global.internalConfig.CHAIN_CONFIG.chain1.network.uri =
  global.internalConfig.URI[global.externalConfig.TARGET_ENV] +
  global.internalConfig.CHAIN_CONFIG.chain1.network.uri;
global.internalConfig.CHAIN_CONFIG.chain2.network.uri =
  global.internalConfig.URI[global.externalConfig.TARGET_ENV] +
  global.internalConfig.CHAIN_CONFIG.chain2.network.uri;
global.pending = [];
global.mapperChecker = [];

// imports
const { name, version } = require("./package.json");
global.pact = require("pact-lang-api");
global.pactMan = require("./pact-man");
global.sindrome = require("./sindrome");
global.telegram = require("./telegram");
global.sandwich = require("./sandwich");
global.checker = require("./checker");
global.mempool = require("./mempool");
global.sdk = require("./sdk");
global.utils = require("./utils");

const start = async () => {
  console.log(`${name.toUpperCase()} v${version} running...`);

  global.sdkConfig = await global.sdk.generateSdkConfig(
    global.externalConfig.PUBLIC_KEY
  );

  for (const [key, value] of Object.entries(global.tokens.data)) {
    if (key != "KDA") {
      global.mapperChecker[value.address + " coin"] = {
        type: "sell",
        key: key,
      };
      global.mapperChecker["coin " + value.address] = {
        type: "buy",
        key: key,
      };
    }
  }

  const delay = process.argv[0].indexOf("bun") > -1 ? Bun.sleep : utils.wait;

  while (true) {
    await global.mempool.finder();
    await delay(global.externalConfig.DELAY_MS);
  }
};

start();
