const balanceCheck = (swapConfig) => {
  try {
    const sourceTokenBalance =
      swapConfig.sourceExchange.sourceTokenAmount <
      global.config.currentBalances[swapConfig.sourceExchange.chainIndex][
        swapConfig.sourceExchange.sourceTokenName
      ];
    if (!sourceTokenBalance) {
      let message = `Cannot swap due to low ${swapConfig.sourceExchange.sourceTokenName} token amount (${swapConfig.sourceExchange.sourceTokenAmount} -> ${swapConfig.sourceExchange.destinationTokenAmount} ${swapConfig.sourceExchange.destinationTokenName}) on ${swapConfig.sourceExchange.chainIndex}`;
      global.notify(`${message}`);
      if (global.config.debugActive) {
        console.log(swapConfig);
        console.log(global.config.currentBalances);
        global.log(message);
      }
    }
    const destinationTokenBalance =
      swapConfig.destinationExchange.sourceTokenAmount <
      global.config.currentBalances[swapConfig.destinationExchange.chainIndex][
        swapConfig.destinationExchange.sourceTokenName
      ];
    if (!destinationTokenBalance) {
      let message = `Cannot swap due to low ${swapConfig.destinationExchange.sourceTokenName} token amount (${swapConfig.destinationExchange.sourceTokenAmount} -> ${swapConfig.destinationExchange.destinationTokenAmount} ${swapConfig.destinationExchange.destinationTokenName}) on ${swapConfig.destinationExchange.chainIndex}`;
      global.notify(`${message}`);
      if (global.config.debugActive) {
        console.log(swapConfig);
        console.log(global.config.currentBalances);
        global.log(message);
      }
    }

    return (
      !global.config.rebalanceNeeded &&
      sourceTokenBalance &&
      destinationTokenBalance
    );
  } catch (e) {
    console.trace(e);
    process.exit(1);
  }
};

module.exports = { balanceCheck };
