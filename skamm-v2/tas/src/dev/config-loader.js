const { generateSdkConfig } = require("./sdk/sdk");

module.exports.loadConfig = async (version) => {
  try {
    global.log("Loading system configuration...");
    global.config = require("./config.json");
    global.config.tag = `[SKAMM-V2::TAS] [v${version}] [${global.config.nodeEnv.toUpperCase()}]`;
    const secure = global.config.nodeEnv == "dev" ? "s" : "";
    const devHost = "api.chainweb.com";
    const localHost = "localhost:1848";
    const host = global.config.nodeEnv == "dev" ? devHost : localHost;
    global.config.network = `http${secure}://${host}/chainweb/0.0/mainnet01/chain/`;
    global.config.chains = {
      chain1: {
        ENABLE_GAS_STATION: false,
        SWAP_EXACT_IN: "kdlaunch.kdswap-exchange.swap-exact-in",
        PAIR: "kdlaunch.kdswap-exchange.get-pair",
        GAS_STATION: "kdlaunch.kdswap-gas-station.GAS_PAYER",
        GAS_PAYER: "kdswap-gas-payer",
        network: {
          networkId: "mainnet01",
          chainId: "1",
          type: "mainnet",
        },
      },
      chain2: {
        ENABLE_GAS_STATION: false,
        SWAP_EXACT_IN: "kaddex.exchange.swap-exact-in",
        PAIR: "kaddex.exchange.get-pair",
        GAS_STATION: "kaddex.gas-station.GAS_PAYER",
        GAS_PAYER: "kaddex-free-gas",
        network: {
          networkId: "mainnet01",
          chainId: "2",
          type: "mainnet",
        },
      },
    };

    global.config.chains.chain1.network.host =
      global.config.chains.chain2.network.host = host;
    global.config.chains.chain1.network.uri = `http${secure}://${host}/chainweb/0.0/mainnet01/chain/1/pact`;
    global.config.chains.chain2.network.uri = `http${secure}://${host}/chainweb/0.0/mainnet01/chain/2/pact`;
    global.config.healthCheckUrl = `http${secure}://${host}/health-check`;

    global.log("Generating SDK configuration...");
    global.config.sdkConfig = await generateSdkConfig(global.config.publicKey);
  } catch (e) {
    console.trace(e);
    process.exit(0);
  }
};
