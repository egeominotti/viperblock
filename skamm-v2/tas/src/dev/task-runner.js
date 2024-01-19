const { spawnProcess } = require("./process-manager");
const { priceImpact } = require("./math-core");
const { evaluateBalance } = require("./wallet-manager");
const { createConfig, updateConfig } = require("./swap-wizard");
const { performRebalance } = require("./wallet-rebalancer");
const {
  appendStats,
  printRunningTask,
  printEvaluations,
  printAwaitingSwap,
} = require("./debugger");
const { swapCheck } = require("./swap-checker");
const { fetchBalance } = require("./sonic/sonic");
const chainDivergenceFactor = 0.009;

const runTask = async () => {
  try {
    if (global.config.debugActive) printRunningTask();

    await evaluateBalance(global.balance);
    if (global.config.autoRebalance) {
      const rebalancePerformed = await performRebalance(
        global.balance,
        global.prices,
        global.amounts
      );

      if (rebalancePerformed) {
        const updatedBalance = await fetchBalance();
        if (JSON.stringify(global.balance) == JSON.stringify(updatedBalance))
          return;
        else await evaluateBalance(updatedBalance);
      }
    }

    if (global.config.debugActive) {
      global.log(`Current KDA price ($): ${global.kdaUsdt}`);
      global.log("Finding profitable swap...");
    }

    for (token of Object.keys(global.prices.chain1)) {
      if (global.amounts[token] >= global.config.swapAmount) {
        const priceImpactChain1 = priceImpact(
          global.amounts[token] || global.config.swapAmount,
          global.prices["chain1"][token].reserveToken0,
          global.prices["chain1"][token].reserveToken1
        );
        const priceImpactChain2 = priceImpact(
          global.amounts[token] || global.config.swapAmount,
          global.prices["chain2"][token].reserveToken0,
          global.prices["chain2"][token].reserveToken1
        );
        if (
          priceImpactChain1 <= chainDivergenceFactor &&
          priceImpactChain2 <= chainDivergenceFactor
        ) {
          let swapConfig = createConfig(
            token,
            global.prices,
            global.amounts[token]
          );
          if (
            swapConfig.chain2Ratio >
            swapConfig.chain1Ratio * global.config.divergenceFactor
          ) {
            swapConfig = updateConfig(
              swapConfig,
              global.prices,
              global.amounts[token] || global.config.swapAmount,
              1
            );
            printEvaluations(swapConfig, global.prices);
            if (swapCheck(swapConfig)) {
              if (global.config.testMode) break;
              spawnProcess(swapConfig);
              appendStats(swapConfig.token, swapConfig.ratioDivergence);
            }
          } else if (
            swapConfig.chain1Ratio >
            swapConfig.chain2Ratio * global.config.divergenceFactor
          ) {
            swapConfig = updateConfig(
              swapConfig,
              global.prices,
              global.amounts[token] || global.config.swapAmount,
              2
            );
            printEvaluations(swapConfig, global.prices);
            if (swapCheck(swapConfig)) {
              if (global.config.testMode) break;
              spawnProcess(swapConfig);
              appendStats(swapConfig.token, swapConfig.ratioDivergence);
            }
          }
          appendStats(swapConfig.token, swapConfig.ratioDivergence);
        }
      }
    }

    if (!global.processManager.busyCounter) {
      if (global.config.debugActive)
        global.log("No profitable swap found. Retrying...");
    } else {
      printAwaitingSwap();
      while (global.processManager.busyCounter > 0) {
        await global.delay(1000);
      }
    }
    if (global.config.debugActive) global.log("Cleaning swap pool...");
    global.processManager.swapPool = [];
  } catch (e) {
    global.log("[tas.js::run] catch: " + e);
    console.trace(e);
    global.notify(`${e}`);
  } finally {
    global.processManager.busy = false;
  }
};

module.exports = { runTask };
