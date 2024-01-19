const { appendOperations } = require("../debugger");
const pact = require("pact-lang-api");
const TOKEN = require("./tokens.json");
const {
  reduceBalance,
  getCorrectBalance,
  creationTime,
  getCurrentDate,
  getCurrentTime,
  wait,
} = require("./utils");

const GAS_LIMIT = 10000;
const GAS_PRICE = 0.00002;
const TTL = 600;
const SECONDS = 1000;
const MINUTES = 60 * SECONDS;
const INTERVAL = 5 * SECONDS;
const MAX_WAIT = 5 * MINUTES;
const MAX_INTERVALS = Math.floor(MAX_WAIT / INTERVAL);

const generateSdkConfig = async (accountName) => {
  try {
    let sdkConfig = {
      chain1: {
        account: await retrieveVerifiedAccount({
          chainId: global.config.chains.chain1.network.chainId,
          accountName,
          network: global.config.chains.chain1.network,
        }),
      },
      chain2: {
        account: await retrieveVerifiedAccount({
          chainId: global.config.chains.chain2.network.chainId,
          accountName,
          network: global.config.chains.chain2.network,
        }),
      },
    };
    sdkConfig.chain1.jsonAccount = JSON.stringify(
      sdkConfig.chain1.account.account
    );
    sdkConfig.chain2.jsonAccount = JSON.stringify(
      sdkConfig.chain2.account.account
    );
    return sdkConfig;
  } catch (e) {
    global.log("[sdk.js::generateSdkConfig] catch: " + e);
    console.trace(e);
  }
};

const poll = async (network, reqKey, config, targetExchange) => {
  try {
    let _a, _b, _c, _d, _e, _f;
    let retries = MAX_INTERVALS;
    let pollRes = {};
    while (retries > 0) {
      const attempt_no = MAX_INTERVALS - retries;
      pollRes = await pact.fetch.poll({ requestKeys: [reqKey] }, network.uri);
      if (Object.keys(pollRes).length == 0) {
        global.log(
          `${global.config.tag} Polling... (attempt no. ${attempt_no}/${MAX_INTERVALS})`
        );
        retries = retries - 1;
        await wait(INTERVAL);
      } else {
        retries = 0;
      }
    }
    if (
      ((_b =
        (_a = pollRes[reqKey]) === null || _a === void 0
          ? void 0
          : _a.result) === null || _b === void 0
        ? void 0
        : _b.status) == "success"
    ) {
      return {
        chain: network.chainId,
        reqKey,
        type: "success",
        time: getCurrentTime(),
        date: getCurrentDate(),
        title: "Transaction Success!",
        description: "Check it out in the block explorer",
        link: `https://explorer.chainweb.com/${network.type}/txdetail/${reqKey}`,
        isReaded: false,
      };
    } else if (
      ((_d =
        (_c = pollRes[reqKey]) === null || _c === void 0
          ? void 0
          : _c.result) === null || _d === void 0
        ? void 0
        : _d.status) == "failure"
    ) {
      const message = `Swap failure: rolling back...`;
      global.notify(message);
      appendOperations(message);
      await swapExactIn(config, targetExchange);
      global.log(
        "[sdk.js::pactListen] error: " +
          JSON.stringify(
            (_f =
              (_e = pollRes[reqKey]) === null || _e === void 0
                ? void 0
                : _e.result) === null || _f === void 0
              ? void 0
              : _f.error
          )
      );
    } else {
      global.log("[sdk.js::pactListen] error: Unknown error in pact.listen");
    }
  } catch (e) {
    global.log("[sdk.js::pactListen] catch: " + e);
    console.trace(e);
  }
};

const createClist = ({ chainId, account, tokenPair, token0 }) => {
  try {
    const transferBalance = reduceBalance(token0.amount, token0.precision);
    return [
      ...(global.config.chains[chainId].ENABLE_GAS_STATION
        ? [
            {
              name: global.config.chains[chainId].GAS_STATION,
              args: [global.config.chains[chainId].GAS_PAYER, { int: 1 }, 1],
            },
          ]
        : [pact.lang.mkCap("gas", "pay gas", "coin.GAS").cap]),
      {
        name: `${token0.address}.TRANSFER`,
        args: [account.account, tokenPair, transferBalance],
      },
    ];
  } catch (e) {
    global.log("[sdk.js::createClist] catch: " + e);
    console.trace(e);
  }
};

const retrieveVerifiedAccount = async ({
  chainId,
  network,
  accountName,
  onConnectionSuccess,
}) => {
  try {
    const data = await pact.fetch.local(
      {
        pactCode: `(coin.details ${JSON.stringify(accountName)})`,
        meta: pact.lang.mkMeta(
          "",
          chainId,
          GAS_PRICE,
          GAS_LIMIT,
          creationTime(),
          TTL
        ),
      },
      network.uri
    );
    if (data.result.status == "success") {
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }
      return Object.assign(Object.assign({}, data.result.data), {
        balance: getCorrectBalance(data.result.data.balance),
      });
    } else {
      global.log(
        `Please make sure the account \`${accountName}\` exists on the kadena blockchain with chain ID ${network.chainId}`
      );
      return { account: null, guard: null, balance: 0 };
    }
  } catch (e) {
    global.log("[sdk.js::retrieveVerifiedAccount] catch: " + e);
    console.trace(e);
    return { account: null, guard: null, balance: 0 };
  }
};

const createEnvData = ({ account, token0, token1, slippage }) => ({
  "user-ks": account.guard,
  token0Amount: reduceBalance(token0.amount, token0.precision),
  token1Amount: reduceBalance(token1.amount, token1.precision),
  token1AmountWithSlippage: reduceBalance(
    token1.amount * (1 - parseFloat(slippage)),
    token1.precision
  ),
  token0AmountWithSlippage: reduceBalance(
    token0.amount * (1 + parseFloat(slippage)),
    token0.precision
  ),
});

const getPairAccount = async ({
  chainId,
  network,
  account,
  token0,
  token1,
}) => {
  try {
    const response = await pact.fetch.local(
      {
        pactCode: `(at 'account (${global.config.chains[chainId].PAIR} ${token0.address} ${token1.address}))`,
        signingPubKey: account.guard.keys[0],
        meta: pact.lang.mkMeta(
          "",
          chainId,
          GAS_PRICE,
          GAS_LIMIT,
          creationTime(),
          TTL
        ),
      },
      network.uri
    );
    if (response.result.status === "success") {
      return response.result.data;
    }
  } catch (e) {
    global.log("[sdk.js::getPairAccount] catch: " + e);
    console.trace(e);
    return e;
  }
};
/*
const buildCmd = async (exchange, config) => {
  try {
    const chainIndex = config[exchange].chainIndex;
    return {
      network: global.config.chains[chainIndex].network,
      pact: {
        pactCode: `
       (${global.config.chains[chainIndex].SWAP_EXACT_IN}
       (read-decimal 'token0Amount)
       (read-decimal 'token1AmountWithSlippage)
       [${TOKEN[config[exchange].sourceTokenName].address} ${
          TOKEN[config[exchange].destinationTokenName].address
        }]
       ${global.config.sdkConfig[chainIndex].jsonAccount}
       ${global.config.sdkConfig[chainIndex].jsonAccount} 
       (read-keyset 'user-ks))`,
        envData: createEnvData({
          account: global.config.sdkConfig[chainIndex].account,
          token0: {
            precision: TOKEN[config[exchange].sourceTokenName].precision,
            amount: config[exchange].sourceTokenAmount,
          },
          token1: {
            precision: TOKEN[config[exchange].destinationTokenName].precision,
            amount: config[exchange].destinationTokenAmount,
          },
          slippage: config[exchange].slippage,
        }),
        keyPairs: {
          publicKey:
            global.config.sdkConfig[chainIndex].account.guard.keys[0],
          secretKey: config.secretKey,
          clist: createClist({
            chainId: chainIndex,
            account: global.config.sdkConfig[chainIndex].account,
            tokenPair: await getPairAccount({
              chainId: chainIndex,
              network: global.config.chains[chainIndex].network,
              account: global.config.sdkConfig[chainIndex].account,
              token0: {
                precision: TOKEN[config[exchange].sourceTokenName].precision,
                address: TOKEN[config[exchange].sourceTokenName].address,
                amount: config[exchange].sourceTokenAmount,
              },
              token1: {
                precision:
                  TOKEN[config[exchange].destinationTokenName].precision,
                address: TOKEN[config[exchange].destinationTokenName].address,
                amount: config[exchange].destinationTokenAmount,
              },
            }),
            token0: {
              precision: TOKEN[config[exchange].sourceTokenName].precision,
              address: TOKEN[config[exchange].sourceTokenName].address,
              amount: config[exchange].sourceTokenAmount,
            },
          }),
        },
        networkId: global.config.chains[chainIndex].network.networkId,
        meta: pact.lang.mkMeta(
          global.config.chains[chainIndex].ENABLE_GAS_STATION
            ? global.config.chains[chainIndex].GAS_PAYER
            : global.config.sdkConfig[chainIndex].account.account,
          global.config.chains[chainIndex].network.chainId,
          GAS_PRICE,
          GAS_LIMIT,
          creationTime(),
          TTL
        ),
      },
    };
  } catch (e) {
    global.log("[sdk.js::buildCmd] catch: " + e);
    console.trace(e);
    return;
  }
};
*/

const buildCmd = async (exchange, config) => {
  try {
    const chainIndex = config[exchange].chainIndex;
    return {
      network: config.chains[chainIndex].network,
      pact: {
        pactCode: `
       (${config.chains[chainIndex].SWAP_EXACT_IN}
       (read-decimal 'token0Amount)
       (read-decimal 'token1AmountWithSlippage)
       [${TOKEN[config[exchange].sourceTokenName].address} ${
          TOKEN[config[exchange].destinationTokenName].address
        }]
       ${config.sdkConfig[chainIndex].jsonAccount}
       ${config.sdkConfig[chainIndex].jsonAccount} 
       (read-keyset 'user-ks))`,
        envData: createEnvData({
          account: config.sdkConfig[chainIndex].account,
          token0: {
            precision: TOKEN[config[exchange].sourceTokenName].precision,
            amount: config[exchange].sourceTokenAmount,
          },
          token1: {
            precision: TOKEN[config[exchange].destinationTokenName].precision,
            amount: config[exchange].destinationTokenAmount,
          },
          slippage: 0.05,
        }),
        keyPairs: {
          publicKey: config.sdkConfig[chainIndex].account.guard.keys[0],
          secretKey: config.secretKey,
          clist: createClist({
            chainId: chainIndex,
            account: config.sdkConfig[chainIndex].account,
            tokenPair: await getPairAccount({
              chainId: chainIndex,
              network: config.chains[chainIndex].network,
              account: config.sdkConfig[chainIndex].account,
              token0: {
                precision: TOKEN[config[exchange].sourceTokenName].precision,
                address: TOKEN[config[exchange].sourceTokenName].address,
                amount: config[exchange].sourceTokenAmount,
              },
              token1: {
                precision:
                  TOKEN[config[exchange].destinationTokenName].precision,
                address: TOKEN[config[exchange].destinationTokenName].address,
                amount: config[exchange].destinationTokenAmount,
              },
            }),
            token0: {
              precision: TOKEN[config[exchange].sourceTokenName].precision,
              address: TOKEN[config[exchange].sourceTokenName].address,
              amount: config[exchange].sourceTokenAmount,
            },
          }),
        },
        networkId: config.chains[chainIndex].network.networkId,
        meta: pact.lang.mkMeta(
          config.chains[chainIndex].ENABLE_GAS_STATION
            ? config.chains[chainIndex].GAS_PAYER
            : config.sdkConfig[chainIndex].account.account,
          config.chains[chainIndex].network.chainId,
          GAS_PRICE,
          GAS_LIMIT,
          creationTime(),
          TTL
        ),
      },
    };
  } catch (e) {
    global.log("[sdk.js::buildCmd] catch: " + e);
    console.trace(e);
    return;
  }
};

const swapExactIn = async (config, rollbackExchange) => {
  try {
    let cmds = [];
    if (rollbackExchange) {
      const destinationTokenAmount = config[rollbackExchange].sourceTokenAmount;
      const destinationTokenName = config[rollbackExchange].sourceTokenName;
      const sourceTokenAmount = config[rollbackExchange].destinationTokenAmount;
      const sourceTokenName = config[rollbackExchange].destinationTokenName;
      config[rollbackExchange].sourceTokenAmount = sourceTokenAmount;
      config[rollbackExchange].sourceTokenName = sourceTokenName;
      config[rollbackExchange].destinationTokenAmount = destinationTokenAmount;
      config[rollbackExchange].destinationTokenName = destinationTokenName;
      config.chains[
        config[rollbackExchange].chainIndex
      ].ENABLE_GAS_STATION = true;
      cmds.push(await buildCmd(rollbackExchange, config));
    } else {
      cmds = await Promise.all([
        buildCmd("sourceExchange", config),
        buildCmd("destinationExchange", config),
      ]);
    }
    if (rollbackExchange) {
      const reqKey = await pact.fetch.send(cmds[0].pact, cmds[0].network.uri);
      return await poll(cmds[0].network, reqKey, config, rollbackExchange);
    } else {
      const reqKeys = await Promise.all([
        pact.fetch.send(cmds[0].pact, cmds[0].network.uri),
        pact.fetch.send(cmds[1].pact, cmds[1].network.uri),
      ]);
      return await Promise.all([
        poll(
          cmds[0].network,
          reqKeys[0].requestKeys[0],
          config,
          "sourceExchange"
        ),
        poll(
          cmds[1].network,
          reqKeys[1].requestKeys[0],
          config,
          "destinationExchange"
        ),
      ]);
    }
  } catch (e) {
    global.log("[sdk.js::swapExactIn] catch: " + e);
    console.trace(e);
  }
};

module.exports = {
  generateSdkConfig,
  swapExactIn,
  poll,
};
