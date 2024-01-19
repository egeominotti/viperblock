const { swapExactIn } = require("./sdk/sdk");
const { appendOperations } = require("./debugger");
const { evaluateBalance } = require("./wallet-manager");
const { isEmptyObject } = require("./utils");
global.get = require("./utils").get;
global.log = require("./utils").log;
global.notify = require("./tg-notifier").notify;

function finalizeSwapBenchmark() {
  global.swapBenchmark.end = Date.now();
  const message = `[BENCHMARK] Total duration: ${
    (global.swapBenchmark.end - global.swapBenchmark.start) / 1000
  }sec. (Start: ${new Date(
    global.swapBenchmark.start
  ).toLocaleString()} - End: ${new Date(
    global.swapBenchmark.end
  ).toLocaleString()})`;
  global.notify(`${message}`);
  appendOperations(message);
}

const swapTokens = async (config) => {
  try {
    global.notify(
      `Swapping ${config.sourceExchange.sourceTokenAmount.toFixed(2)} ${
        config.sourceExchange.sourceTokenName
      } on ${
        config.sourceExchange.exchangeName
      } for ${config.sourceExchange.destinationTokenAmount.toFixed(2)} ${
        config.sourceExchange.destinationTokenName
      } | ${config.token} ratio divergence (%): ${
        config.ratioDivergence
      } | Swapping ${config.destinationExchange.sourceTokenAmount.toFixed(2)} ${
        config.destinationExchange.sourceTokenName
      } on ${
        config.destinationExchange.exchangeName
      } for ${config.destinationExchange.destinationTokenAmount.toFixed(2)} ${
        config.destinationExchange.destinationTokenName
      }`
    );
    global.swapBenchmark = {
      start: Date.now(),
    };
    const results = await swapExactIn(config);
    finalizeSwapBenchmark();
    for (let result of results) {
      if (result) {
        result = JSON.stringify(result);
        global.log(result);
        global.notify(`${result}`);
        appendOperations(`${result}`);
      }
    }
  } catch (e) {
    global.log("[swap-task.js::swapTokens] catch: " + e);
    console.trace(e);
    const error = `Swap failure: ${e}`;
    global.notify(`${error}`);
    appendOperations(error);
  } finally {
    if (!isEmptyObject(global.balance)) await evaluateBalance(global.balance);
    process.send("done");
  }
};

process.on("message", async (config) => {
  try {
    global.config = config[0];
    global.config.tag += ` [Swap-Task-${global.config.childId + 1}]`;
    await swapTokens(...config);
  } catch (e) {
    global.log("[swap-task.js::process.on] catch: " + e);
    console.trace(e);
    global.notify(`Swap failure: ${e}`);
  }
});

module.exports = { swapTokens };
