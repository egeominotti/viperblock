const { getPrices, getBalance } = require("./pact-man");
const { priceImpactMaximizer } = require("./math-core");
const { poolFilter } = require("./filters");
const bladerunner = require("./bladerunner");
module.exports.bladerunner = bladerunner;

let divergenceFactor = 0.9;
let tokens = [];

async function fetchBalance() {
  global.balance = await Promise.all([getBalance("1"), getBalance("2")])
    .then((balance) => {
      if (!balance) return [];
      tokens = Object.keys(balance[0]);
      return { chain1: balance[0], chain2: balance[1] };
    })
    .catch((e) => {
      delete global.balance;
      global.log("[sonic.js::fetchBalance] catch: " + e);
      console.trace(e);
    });
}

async function fetchPrices(maximize) {
  global.prices = await Promise.all([
    getPrices("kdswap", tokens),
    getPrices("kaddex", tokens),
  ])
    .then(async (prices) => {
      if (!prices) return {};
      prices = poolFilter(global.kdaUsdt, prices);
      if (maximize) {
        global.amounts = await priceImpactMaximizer(
          global.balance,
          { chain1: prices[0], chain2: prices[1] },
          divergenceFactor,
          false
        );
      }
      return {
        ...{ kdaUsdt: global.kdaUsdt },
        ...{ chain1: prices[0], chain2: prices[1] },
      };
    })
    .catch((e) => {
      delete global.prices;
      delete global.amounts;
      global.log("[sonic.js::fetchPrices] catch: " + e);
      console.trace(e);
    });
}

module.exports.fetchBalance = fetchBalance;
module.exports.fetchPrices = fetchPrices;
