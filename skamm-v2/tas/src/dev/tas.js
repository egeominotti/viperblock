const { bladerunner, fetchPrices, fetchBalance } = require("./sonic/sonic");
const ghemon = require("./ghemon");
const hellboy = require("./hellboy");
const bender = require("./bender");
const { runProfitSaver } = require("./profit-saver");
const { runTask } = require("./task-runner");
const { healthCheck, isEmptyObject } = require("./utils");
const { version } = require("./package.json");

console.log(`
 _________   ____
/_  __/ _ | / __/
 / / / __ |_\\ \\  
/_/ /_/ |_/___/  

Version: ${version}
Author: viperblock.xyz
`);

async function main() {
  try {
    global.log = require("./utils").log;
    await require("./config-loader").loadConfig(version);
    global.log("Initializing globals...");

    global.get = require("./utils").get;
    global.errors = require("./errors.json");
    global.notify = require("./tg-notifier").notify;
    global.delay = require("./utils").delay;

    global.kdaUsdt;
    global.balance;
    global.prices;
    global.amounts;

    global.log("Evaluating system health check...");
    await healthCheck(false);

    if (global.config.nodeEnv == "prod") {
      global.log("Starting ghemon...");
      ghemon.run();
    }

    global.log("Starting bladerunner...");
    bladerunner.run();

    global.log("Starting hellboy...");
    hellboy.run();

    global.log("Starting bender...");
    bender.run();

    global.log("Awaiting KDA price...");
    while (!global.kdaUsdt) await global.delay(1000);

    global.notify(
      `Started with divergence factor (%): ${(
        parseFloat(global.config.divergenceFactor - 1) * 100
      ).toFixed(1)}`
    );

    global.log("Starting profit saver...");
    runProfitSaver();

    const message = "System inizialized. Service running in background...";
    global.log(message);
    let loaded = false;
    while (true) {
      try {
        if (!global.processManager.busy && !global.processManager.busyCounter) {
          global.processManager.busy = true;

          await fetchBalance();
          await fetchPrices(true);

          if (global.config.nodeEnv == "dev") await global.delay(10000);

          const check =
            global.kdaUsdt &&
            !isEmptyObject(global.prices) &&
            !isEmptyObject(global.amounts) &&
            !isEmptyObject(global.balance);
          console.log(global.prices)
          console.log(global.amounts)
          console.log(global.balance)
          if (check) await runTask();
          else global.processManager.busy = false;

          if (!loaded && check) {
            loaded = true;
            global.notify(message);
          }
        }
      } catch (e) {
        global.notify(e);
        global.log("[tas.js::while] catch: " + e);
        console.trace(e);
      }
    }
  } catch (e) {
    global.notify("fatal error on tas.js please check.");
    global.log("[tas.js::start] catch: " + e);
    console.trace(e);
    process.exit(1);
  }
}

main();
