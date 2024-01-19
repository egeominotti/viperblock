const { appendOperations, appendBalance } = require("./debugger");
const { clone } = require("./utils");

const getWalletBalance = (balance) => {
  try {
    return `Wallet balance (KDA) chain1: ${
      balance.chain1["KDA"].toFixed(3) || "0"
    }, chain2: ${balance.chain2["KDA"].toFixed(3) || "0"}, total: ${(
      balance.chain1["KDA"] + balance.chain2["KDA"]
    ).toFixed(3)}`;
  } catch (e) {
    global.log("[wallet-manager.js::getWalletBalance] catch: " + e);
    console.trace(e);
  }
};

const evaluateBalance = async (balance) => {
  try {
    if (!global.config.previousBalances) {
      global.config.previousBalances = clone(balance);

      const initialBalance = getWalletBalance(balance);
      global.notify(`${initialBalance}`);
      appendOperations(initialBalance);
    }

    global.config.currentBalances = clone(balance);

    let previousKdaBalance =
      global.config.previousBalances.chain1["KDA"] +
      global.config.previousBalances.chain2["KDA"];

    let currentKdaBalance =
      global.config.currentBalances.chain1["KDA"] +
      global.config.currentBalances.chain2["KDA"];

    const threshold = (currentKdaBalance / 2) * 0.7;
    if (
      global.config.currentBalances.chain1["KDA"] <= threshold ||
      global.config.currentBalances.chain2["KDA"] <= threshold
    ) {
      global.config.rebalanceNeeded = true;
      if (global.config.debugActive)
        global.log("Insufficient KDA in wallet. Rebalancing needed...");
      if (!global.config.rebalanceNeededNotified) {
        global.notify(
          `KDA rebalancing needed (chain1 amount: ${
            global.config.currentBalances.chain1["KDA"].toFixed(2) || 0
          } | chain2 amount: ${
            global.config.currentBalances.chain2["KDA"].toFixed(2) || 0
          } | total: ${currentKdaBalance.toFixed(2) || 0})`
        );
        global.config.rebalanceNeededNotified = true;
      }
    } else {
      global.config.rebalanceNeeded = false;
      global.config.rebalanceNeededNotified = false;
    }

    if (!global.processManager.busyCounter) {
      let walletBalance = getWalletBalance(global.config.currentBalances);
      if (walletBalance) {
        if (currentKdaBalance != previousKdaBalance) {
          let delta =
            (previousKdaBalance == 0
              ? 0
              : Math.abs(currentKdaBalance - previousKdaBalance).toFixed(3)) ||
            0;
          let status =
            previousKdaBalance == 0
              ? ""
              : currentKdaBalance < previousKdaBalance
              ? ` (decreased: -${delta})`
              : ` (increased: +${delta})`;
          appendBalance(status);
          walletBalance += ` ${status}`;
          global.notify(`${walletBalance}`);
          appendOperations(walletBalance);
        }
        if (global.config.debugActive) global.log(walletBalance);
      }
    }
    global.config.previousBalances = JSON.parse(
      JSON.stringify(global.config.currentBalances)
    );
  } catch (e) {
    global.log("[wallet-manager.js::evaluateBalance] catch: " + e);
    console.trace(e);
  }
};

module.exports = {
  evaluateBalance,
};
