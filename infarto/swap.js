const pact = require("pact-lang-api");
const sdk = require("./sdk");
const api = "https://api.chainweb.com/chainweb/0.0/mainnet01/chain";

/**
 *
 * @param {*} config
 * @param {*} chain
 */
async function swapParallel(config, chain) {
  try {
    let chainDest = chain == "chain1" ? "1" : "2";
    let apiDest = `${api}/${chainDest}/pact`;
    console.log(config);
    console.log(chain);
    let cmds = [];
    cmds = await Promise.all([sdk.swap(config[0]), sdk.swap(config[1])]);
    console.log(cmds);
    let reqKeys = await pact.fetch.send(cmds, apiDest);
    console.log(reqKeys);
    let polls = [];
    polls = await Promise.all([
      sdk.poll(apiDest, reqKeys.requestKeys[0]),
      sdk.poll(apiDest, reqKeys.requestKeys[1]),
    ]);
    console.log(polls);
    /*
    console.log(polls);
    if (polls[0].pollResResolve.result.status == "failure") {
      console.log(polls[0].pollResResolve.result.error);
    }

    if (polls[1].pollResResolve.result.status == "failure") {
      console.log(polls[1].pollResResolve.result.error);
    }
    */
    process.exit(1);
    global.semaphore.swap = false;
    global.semaphore.mempool = false;
  } catch (e) {
    console.trace(e);
    process.exit(1);
    global.semaphore.swap = false;
    global.semaphore.mempool = false;
  }
}

/**
 *
 * @param {*} config
 * @param {*} chain
 */
async function swapDifferentBlock(config, chain) {
  try {
    global.semaphore.swap = true;
    let chainDest = chain == "chain1" ? "1" : "2";
    let apiDest = `${api}/${chainDest}/pact`;
    let cmdBuy = await sdk.swap(config[0], global.sdkConfig);
    console.log(cmdBuy);
    console.log(config);
    let reqKeysBuy = await pact.fetch.send(cmdBuy, apiDest);
    console.log(reqKeysBuy);
    let pollBuy = await sdk.poll(apiDest, reqKeysBuy.requestKeys[0]);
    console.log(pollBuy);
    if (pollBuy.type == "failure") process.exit(1);
    if (pollBuy.type == "success") {
      let cmdSell = await sdk.swap(config[1], global.sdkConfig);
      let reqKeysSell = await pact.fetch.send(cmdSell, apiDest);
      console.log(cmdSell);
      let pollSell = await sdk.poll(apiDest, reqKeysSell.requestKeys[0]);
      console.log(pollSell);
      if (pollSell.type == "failure") process.exit(1);
      if (pollSell.type == "success") {
        global.semaphore.swap = false;
        global.semaphore.mempool = false;
      }
    }
  } catch (e) {
    console.trace(e);
  }
}

module.exports = {
  swapParallel,
  swapDifferentBlock,
};
