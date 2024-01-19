const {
  reduceBalance,
  getCorrectBalance,
  creationTime,
  getCurrentDate,
  getCurrentTime,
  wait,
} = require("./utils");

const generateSdkConfig = async (accountName) => {
  try {
    let sdkConfig = {
      chain1: {
        account: await retrieveVerifiedAccount({
          chainId: global.internalConfig.CHAIN_CONFIG.chain1.network.chainId,
          accountName,
          network: global.internalConfig.CHAIN_CONFIG.chain1.network,
        }),
      },
      chain2: {
        account: await retrieveVerifiedAccount({
          chainId: global.internalConfig.CHAIN_CONFIG.chain2.network.chainId,
          accountName,
          network: global.internalConfig.CHAIN_CONFIG.chain2.network,
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
    console.trace(e);
  }
};

const poll = async (network, reqKey) => {
  try {
    let _a, _b, _c, _d, _e, _f;
    let retries = global.internalConfig.MAX_INTERVALS;
    let pollResResolve;
    let pollRes = {};

    while (retries > 0) {
      const attempt_no = global.internalConfig.MAX_INTERVALS - retries;
      pollRes = await global.pact.fetch.poll(
        { requestKeys: [reqKey] },
        network
      );
      if (Object.keys(pollRes).length == 0) {
        log(
          `[${new Date().toISOString()}] [sdk] polling... (attempt no. ${attempt_no}/${
            global.internalConfig.MAX_INTERVALS
          })`
        );
        retries = retries - 1;
        await wait(global.internalConfig.INTERVAL);
      } else {
        retries = 0;
      }
      pollResResolve = pollRes[reqKey];
    }
    if (
      ((_b =
        (_a = pollRes[reqKey]) == null || _a == void 0 ? void 0 : _a.result) ==
        null || _b == void 0
        ? void 0
        : _b.status) == "success"
    ) {
      return {
        reqKey,
        type: "success",
        time: getCurrentTime(),
        date: getCurrentDate(),
        link: `https://explorer.chainweb.com/mainnet/tx/${reqKey}`,
      };
    } else if (
      ((_d =
        (_c = pollRes[reqKey]) == null || _c == void 0 ? void 0 : _c.result) ==
        null || _d == void 0
        ? void 0
        : _d.status) == "failure"
    ) {
      return {
        reqKey,
        type: "failure",
        time: getCurrentTime(),
        date: getCurrentDate(),
        link: `https://explorer.chainweb.com/mainnet/tx/${reqKey}`,
      };
    }
  } catch (e) {
    console.trace(e);
  }
};

const createClist = ({ chainId, account, tokenPair, token0 }) => {
  try {
    const transferBalance = reduceBalance(token0.amount, token0.precision);
    return [
      ...(global.internalConfig.CHAIN_CONFIG[chainId].ENABLE_GAS_STATION
        ? [
            {
              name: global.internalConfig.CHAIN_CONFIG[chainId].GAS_STATION,
              args: [
                global.internalConfig.CHAIN_CONFIG[chainId].GAS_PAYER,
                { int: 1 },
                1,
              ],
            },
          ]
        : [global.pact.lang.mkCap("gas", "pay gas", "coin.GAS").cap]),
      {
        name: `${token0.address}.TRANSFER`,
        args: [account.account, tokenPair, transferBalance],
      },
    ];
  } catch (e) {
    console.error("[sdk.js::createClist] catch: " + e);
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
    const data = await global.pact.fetch.local(
      {
        pactCode: `(coin.details ${JSON.stringify(accountName)})`,
        meta: global.pact.lang.mkMeta(
          "",
          chainId,
          global.internalConfig.GAS_PRICE,
          global.internalConfig.GAS_LIMIT,
          creationTime(),
          global.internalConfig.TTL
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
      return { account: null, guard: null, balance: 0 };
    }
  } catch (e) {
    console.trace(e);
    return { account: null, guard: null, balance: 0 };
  }
};

const createEnvData = ({ account, token0, token1, slippage }) => ({
  "user-ks": account.guard,
  token0Amount: reduceBalance(token0.amount, token0.precision),
  token1Amount: reduceBalance(token1.amount, token1.precision),
  /*
  token1AmountWithSlippage: reduceBalance(
    token1.amount * (1 - parseFloat(slippage)),
    token1.precision
  ),
  token0AmountWithSlippage: reduceBalance(
    token0.amount * (1 + parseFloat(slippage)),
    token0.precision
  ),
  */
});

const getPairAccount = async ({
  chainId,
  network,
  account,
  token0,
  token1,
}) => {
  try {
    const response = await global.pact.fetch.local(
      {
        pactCode: `(at 'account (${global.internalConfig.CHAIN_CONFIG[chainId].PAIR} ${token0.address} ${token1.address}))`,
        signingPubKey: account.guard.keys[0],
        meta: global.pact.lang.mkMeta(
          "",
          chainId,
          global.internalConfig.GAS_PRICE,
          global.internalConfig.GAS_LIMIT,
          creationTime(),
          global.internalConfig.TTL
        ),
      },
      network.uri
    );
    if (response.result.status == "success") {
      return response.result.data;
    }
  } catch (e) {
    console.trace(e);
    return e;
  }
};

const swap = async (config) => {
  try {
    let chainIndex = config.chainIndex;

    let pactCode;
    const inPactCode = `(${
      global.internalConfig.CHAIN_CONFIG[chainIndex].SWAP_EXACT_IN
    }
      (read-decimal 'token0Amount)
      (read-decimal 'token1Amount)
      [${global.tokens[config.sourceTokenName].address} ${
      global.tokens[config.destinationTokenName].address
    }]
      ${global.sdkConfig[chainIndex].jsonAccount}
      ${global.sdkConfig[chainIndex].jsonAccount}
      (read-keyset 'user-ks)
    )`;
    const outPactCode = `(${
      global.internalConfig.CHAIN_CONFIG[chainIndex].SWAP_EXACT_OUT
    }
      (read-decimal 'token1Amount)
      (read-decimal 'token0Amount)
      [${global.tokens[config.sourceTokenName].address} ${
      global.tokens[config.destinationTokenName].address
    }]
      ${global.sdkConfig[chainIndex].jsonAccount}
      ${global.sdkConfig[chainIndex].jsonAccount}
      (read-keyset 'user-ks)
    )`;

    let typePact =
      config.type == "SWAP_EXACT_OUT"
        ? (pactCode = outPactCode)
        : (pactCode = inPactCode);

    return {
      network: global.internalConfig.CHAIN_CONFIG[chainIndex].network,
      pactCode: typePact,
      envData: createEnvData({
        account: global.sdkConfig[chainIndex].account,
        token0: {
          precision: global.tokens[config.sourceTokenName].precision,
          amount: config.sourceTokenAmount,
        },
        token1: {
          precision: global.tokens[config.destinationTokenName].precision,
          amount: config.destinationTokenAmount,
        },
      }),
      keyPairs: {
        publicKey: global.sdkConfig[chainIndex].account.guard.keys[0],
        secretKey: process.env.SECRET_KEY.toString(),
        clist: createClist({
          chainId: chainIndex,
          account: global.sdkConfig[chainIndex].account,
          tokenPair: await getPairAccount({
            chainId: chainIndex,
            network: global.internalConfig.CHAIN_CONFIG[chainIndex].network,
            account: global.sdkConfig[chainIndex].account,
            token0: {
              precision: global.tokens[config.sourceTokenName].precision,
              address: global.tokens[config.sourceTokenName].address,
              amount: config.sourceTokenAmount,
            },
            token1: {
              precision: global.tokens[config.destinationTokenName].precision,
              address: global.tokens[config.destinationTokenName].address,
              amount: config.destinationTokenAmount,
            },
          }),
          token0: {
            precision: global.tokens[config.sourceTokenName].precision,
            address: global.tokens[config.sourceTokenName].address,
            amount: config.sourceTokenAmount,
          },
        }),
      },
      networkId:
        global.internalConfig.CHAIN_CONFIG[chainIndex].network.networkId,
      meta: global.pact.lang.mkMeta(
        global.internalConfig.CHAIN_CONFIG[chainIndex].ENABLE_GAS_STATION
          ? global.internalConfig.CHAIN_CONFIG[chainIndex].GAS_PAYER
          : global.sdkConfig[chainIndex].account.account,
        global.internalConfig.CHAIN_CONFIG[chainIndex].network.chainId,
        global.internalConfig.GAS_PRICE,
        global.internalConfig.GAS_LIMIT,
        creationTime(),
        global.internalConfig.TTL
      ),
    };
  } catch (e) {
    console.trace(e);
    return;
  }
};

module.exports = {
  swap,
  generateSdkConfig,
  poll,
  CHAIN_CONFIG: global.internalConfig.CHAIN_CONFIG,
};
