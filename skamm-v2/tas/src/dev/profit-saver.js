const { clone } = require("./utils");

global.profitInfo = {
  lastRead: Date.now(),
  previousAmount: 0,
  currentAmount: 0,
  pollInterval: 1000 * 60 * 60 * 12,
  pollerId: -1,
};

const pollProfitSaver = async () => {
  try {
    if (
      Date.now() - global.profitInfo.lastRead >=
      global.profitInfo.pollInterval
    ) {
      if (!global.processManager.busyCounter) {
        const balance = clone(global.balance);
        global.profitInfo.currentAmount =
          balance.chain1["KDA"] + balance.chain2["KDA"];
        const deltaProfit =
          global.profitInfo.currentAmount - global.profitInfo.previousAmount;
        if (deltaProfit > 0) {
          if (deltaProfit > 5) {
            global.notify(
              `Profit in the last 12h (KDA): ${deltaProfit.toFixed(3)}`
            );
            const majorChain =
              "chain" + (balance.chain1["KDA"] > balance.chain2["KDA"])
                ? "1"
                : "2";

            // TBD: transfer delta from the majorChain to the piggybank wallet
          }
        } else {
          if (!deltaProfit) {
            global.notify(
              `Profit remained unchanged in the last 12h | (KDA) Current: ${global.profitInfo.currentAmount.toFixed(
                3
              )}`
            );
          } else
            global.notify(
              ` Profit decreased in the last 12h | (KDA) Previous: ${global.profitInfo.previousAmount.toFixed(
                3
              )} | Current: ${global.profitInfo.currentAmount.toFixed(
                3
              )} | Delta: ${deltaProfit.toFixed(3)}`
            );
        }
        global.profitInfo.previousAmount = global.profitInfo.currentAmount;
      }
    }
  } catch (e) {
    global.log("[profit-saver.js::pollProfitSaver] catch: " + e);
    console.trace(e);
  }
};

const runProfitSaver = async () => {
  try {
    let balance = {};
    while (JSON.stringify(balance) == "{}") {
      balance = clone(global.balance);
      await global.delay(1000);
    }
    global.profitInfo.lastRead = Date.now();
    global.profitInfo.previousAmount =
      balance.chain1["KDA"] + balance.chain2["KDA"];
    pollProfitSaver();
    global.profitInfo.pollerId = setInterval(async () => {
      await pollProfitSaver();
    }, global.profitInfo.pollInterval);
  } catch (e) {
    global.log("[profit-saver.js::runProfitSaver] catch: " + e);
    console.trace(e);
  }
};

module.exports = { runProfitSaver };
