const { balanceCheck } = require("./balance-checker");
const { swapConfigCheck } = require("./swap-sanitizer");

const swapCheck = (swapConfig) => {
  try {
    return (
      swapConfig.sourceExchange.slippage > 0 &&
      swapConfig.sourceExchange.slippage <= 1 &&
      swapConfig.destinationExchange.slippage > 0 &&
      swapConfig.destinationExchange.slippage <= 1 &&
      swapConfigCheck(swapConfig) &&
      balanceCheck(swapConfig)
    );
  } catch (e) {
    console.trace(e);
    process.exit(1);
  }
};

module.exports = { swapCheck };
