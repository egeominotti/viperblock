const { superComputeIn, superComputeOut } = require("./math-core");

const createConfig = (token, prices, amount) => {
  return {
    publicKey: global.config.publicKey,
    secretKey: global.config.secretKey,
    token,
    chain1Ratio: prices.chain1[token].ratio,
    chain2Ratio: prices.chain2[token].ratio,
    ratioDivergence: parseFloat(
      Math.abs(
        100 - (prices.chain2[token].ratio * 100) / prices.chain1[token].ratio
      ).toFixed(2)
    ),
    sourceExchange: {
      chainIndex: "",
      exchangeName: "",
      sourceTokenName: "KDA",
      sourceTokenAmount: amount || global.config.swapAmount,
      destinationTokenName: token,
      destinationTokenAmount: 0,
      slippage: 0,
    },
    destinationExchange: {
      chainIndex: "",
      exchangeName: "",
      sourceTokenName: token,
      sourceTokenAmount: 0,
      destinationTokenName: "KDA",
      destinationTokenAmount: 0,
      slippage: 0,
    },
    gas: {
      chain1: 0,
      chain2: 0,
    },
    // blockInfo: global.blockInfo,
  };
};

const updateConfig = (swapConfig, prices, amount, strategy) => {
  const inputs = ["chain1", "kdswap", "kaddex", "chain2"];
  const [
    sourceChainIndex,
    sourceChainName,
    destinationChainName,
    destinationChainIndex,
  ] = strategy == 1 ? inputs : inputs.reverse();
  swapConfig.sourceExchange.exchangeName = sourceChainName;
  swapConfig.destinationExchange.exchangeName = destinationChainName;
  swapConfig.sourceExchange.chainIndex = sourceChainIndex;
  swapConfig.destinationExchange.chainIndex = destinationChainIndex;
  swapConfig.sourceExchange.sourceTokenAmount = amount;

  const [pimpactIn, sci] = superComputeIn(
    swapConfig.sourceExchange.sourceTokenAmount,
    prices[sourceChainIndex][token].reserveToken0,
    prices[sourceChainIndex][token].reserveToken1,
    prices[sourceChainIndex][token].ratio
  );

  swapConfig.sourceExchange.destinationTokenAmount = sci;

  swapConfig.destinationExchange.sourceTokenAmount =
    swapConfig.sourceExchange.destinationTokenAmount;

  const [pimpactOut, sco] = superComputeOut(
    swapConfig.destinationExchange.sourceTokenAmount,
    prices[destinationChainIndex][token].reserveToken0,
    prices[destinationChainIndex][token].reserveToken1,
    prices[destinationChainIndex][token].ratio
  );

  swapConfig.destinationExchange.destinationTokenAmount = sco;

  let slippage = swapConfig.ratioDivergence / 100;
  swapConfig.sourceExchange.slippage = slippage - (0.003 + pimpactIn);
  if (swapConfig.sourceExchange.slippage < 0)
    swapConfig.sourceExchange.slippage = 0;
  swapConfig.destinationExchange.slippage = slippage - (0.003 + pimpactOut);
  if (swapConfig.destinationExchange.slippage < 0)
    swapConfig.destinationExchange.slippage = 0;

  if (global.config.debugActive) {
    console.log(
      "chain1 balance for " + swapConfig.token,
      global.config.currentBalances.chain1[token]
    );
    console.log(
      "chain2 balance for " + swapConfig.token,
      global.config.currentBalances.chain2[token]
    );
    console.log(swapConfig);
  }
  return swapConfig;
};

module.exports = { createConfig, updateConfig };
