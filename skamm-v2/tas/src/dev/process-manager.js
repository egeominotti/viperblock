const { fork } = require("child_process");

global.processManager = {
  busy: false,
  swapPool: [],
  busyCounter: 0,
};

function enqueueProcess(payload) {
  try {
    payload[0].childId = global.processManager.swapPool.length;
    const child = fork("swap-task.js");
    child.on("close", function (code) {
      global.log("child process exited with code " + code);
    });
    child.on("message", async (message) => {
      if (message == "done") global.processManager.busyCounter--;
    });
    child.send(payload);
    global.processManager.swapPool.push(child);
    global.processManager.busyCounter++;
  } catch (e) {
    global.log("[process-mananger.js::enqueueProcess] catch: " + e);
    console.trace(e);
  }
}

function spawnProcess(config) {
  try {
    enqueueProcess([
      {
        ...{
          sourceExchange: config.sourceExchange,
          destinationExchange: config.destinationExchange,
          token: config.token,
          ratioDivergence: config.ratioDivergence,
        },
        ...global.config,
      },
    ]);
    if (global.config.debugActive) {
      global.log("Current swap configuration used: ");
      console.log(global.config);
    }
  } catch (e) {
    global.log("[process-mananger.js::spawnProcess] catch: " + e);
    console.trace(e);
  }
}

module.exports = { spawnProcess };
