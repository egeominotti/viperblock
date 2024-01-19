module.exports.getBalance = async () => {
  let balance = await Promise.all([
    global.pactMan.fetchBalance("1"),
    global.pactMan.fetchBalance("2"),
  ])
    .then((balance) => {
      if (!balance) return [];
      global.walletTokens = Object.keys(balance[0]);
      return balance;
    })
    .catch((e) => {
      console.error("[sindrome.js::getBalance] catch: " + e);
      console.trace(e);
    });

  return { chain1: balance[0], chain2: balance[1] };
};

module.exports.getPrices = async () => {
  let prices = await Promise.all([
    global.pactMan.fetchPrices("kdswap"),
    global.pactMan.fetchPrices("kaddex"),
  ])
    .then((prices) => {
      if (!prices) return {};
      return prices;
    })
    .catch((e) => {
      console.error("[sindrome.js::getPrices] catch: " + e);
      console.trace(e);
    });

  return { chain1: prices[0], chain2: prices[1] };
};
