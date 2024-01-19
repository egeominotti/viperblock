var ccxt = require("ccxt");
const roundRobin = [
  // "binance",
  "bitget",
  "bybit",
  "gateio",
  "kucoin",
  "okx",
];

module.exports.run = async () => {
  try {
    let exchanges = roundRobin.map((e) => new ccxt[e]());
    let r = 0;
    let l = roundRobin.length - 1;
    while (true) {
      let lastIndex = r;
      try {
        if (!exchanges[r]) console.error(roundRobin[r] + " exchange invalid");
        let kdaPrice = (await exchanges[r++].fetch_ticker("KDA/USDT")).close;
        if (kdaPrice) global.kdaUsdt = kdaPrice;
        await global.delay(30000);
        if (r > l) r = 0;
        if (kdaPrice < global.config.lowKdaValueAlertThr) {
          global.notify(
            `[KDA ALERT] Price below threshold (${kdaPrice} USDT out of ${global.config.lowKdaValueAlertThr} USDT)`
          );
        } else if (kdaPrice >= global.config.highKdaValueAlertThr) {
          global.notify(
            `[KDA ALERT] Price above threshold (${kdaPrice} USDT out of ${global.config.highKdaValueAlertThr} USDT)`
          );
        }
      } catch (e) {
        global.log("[bladerunner.js::run] catch: " + e);
        console.trace(e);
        if (r == lastIndex) {
          r++;
          if (r > l) r = 0;
        }
      }
    }
  } catch (e) {
    delete global.kdaUsdt;
    global.notify(
      " [CRITICAL ERROR] Service in charge of KDA price retrieval failed. Please check."
    );
  }
};
