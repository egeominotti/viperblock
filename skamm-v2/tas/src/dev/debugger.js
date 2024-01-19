const { appendFile } = require("fs").promises;
global.divergences = {};

const printRunningTask = () => {
  if (global.config.debugActive) {
    console.log(`   
      _                  __      
    /_/   _  _  ._  _   /_   _/_
    / \\/_// // /// //_/ //_|_\\/\\ . . . 
                    _/`);
  }
};

const printAwaitingSwap = () => {
  if (global.config.debugActive) {
    console.log(`
      _                     _             
      /_/    _  ._/_._  _   /_\`    _  _    
    / /|/|//_|/ / // //_/ ._/|/|//_|/_/ . . .
                      _/           /`);
  }
};

const printEvaluations = async (swapConfig, prices) => {
  if (global.config.debugActive) {
    global.log(`Evaluating divergence for ${swapConfig.token}...`);
    global.log(
      swapConfig.token + " ratio on KDSWAP: " + swapConfig.chain1Ratio
    );
    global.log(
      swapConfig.token + " ratio on KADDEX: " + swapConfig.chain2Ratio
    );
    global.log("Ratio divergence (%): " + swapConfig.ratioDivergence);

    if (
      prices.chain1[token].maximizedKdaSwapAmount &&
      prices.chain2[token].maximizedKdaSwapAmount
    ) {
      global.log(
        swapConfig.token +
          " maximum swappable amount on KDSWAP: " +
          prices.chain1[token].maximizedKdaSwapAmount +
          " KDA"
      );
      global.log(
        swapConfig.token +
          " maximum swappable amount on KADDEX: " +
          prices.chain2[token].maximizedKdaSwapAmount +
          " KDA"
      );
    }
    global.log(
      "Current source slippage: " + swapConfig.sourceExchange.slippage
    );
    global.log(
      "Current source slippage (%): " +
        (swapConfig.sourceExchange.slippage * 100).toFixed(3)
    );
    global.log(
      "Current destination slippage: " + swapConfig.destinationExchange.slippage
    );
    global.log(
      "Current destination slippage (%): " +
        (swapConfig.destinationExchange.slippage * 100).toFixed(3)
    );
  }
};

const printSwapInfo = (info) => {
  const compose = (targetExchange) => {
    return (
      "Swaping on " +
      info[targetExchange].exchangeName +
      " " +
      info[targetExchange].sourceTokenAmount +
      " " +
      info[targetExchange].sourceTokenName +
      " for " +
      +info[targetExchange].destinationTokenAmount +
      " " +
      info[targetExchange].destinationTokenName
    );
  };
  global.log(compose("sourceExchange"));
  global.log(compose("destinationExchange"));
};

const appendStats = async (token, divergence) => {
  if (divergence >= 1) {
    let firstInsert = false;
    if (!global.divergences[token]) {
      global.divergences[token] = divergence;
      firstInsert = true;
    }
    if (firstInsert || global.divergences[token] != divergence) {
      appendFile(
        "divergence-stats.txt",
        token +
          "|" +
          Date.now().toString() +
          "|" +
          divergence.toString() +
          "\r\n"
      );
      global.divergences[token] = divergence;
    }
  }
};

const appendOperations = async (message) => {
  appendFile(
    "operations-log.txt",
    new Date().toLocaleString() + "|" + message + "\r\n"
  );
};

const appendBalance = async (message) => {
  appendFile(
    "operations-balance.txt",
    new Date().toLocaleString() + "|" + message + "\r\n"
  );
};

module.exports = {
  printRunningTask,
  printAwaitingSwap,
  printEvaluations,
  printSwapInfo,
  appendStats,
  appendOperations,
  appendBalance,
};
