global.swappableTokens = [];
global.nonSwappableTokens = [];
global.swappableTokensOffWallet = [];

const poolFilter = (kdaUsdt, prices) => {
  try {
    let swappableTokensOffWallet = [];
    let nonSwappableTokens = [];
    let swappableTokens = [];
    const calcPoolSize = (reserveToken1) => {
      const poolSize = kdaUsdt * reserveToken1 * 2;
      if (global.config.poolSizeStrategy == "MAX")
        return poolSize >= global.config.poolSizeThreshold;
      else return poolSize < global.config.poolSizeThreshold;
    };
    const deleteKeys = (key) => {
      delete prices[0][key];
      delete prices[1][key];
    };
    Object.keys(prices[0]).forEach((key) => {
      if (
        eval(
          `${!calcPoolSize(prices[0][key].reserveToken1)} ${
            global.config.poolSizeStrategy == "MAX" ? "||" : "&&"
          } ${!calcPoolSize(prices[1][key].reserveToken1)}`
        )
      ) {
        deleteKeys(key);
        nonSwappableTokens.push(key);
      } else {
        if (!prices[0][key].inWallet || !prices[1][key].inWallet) {
          deleteKeys(key);
          swappableTokensOffWallet.push(key);
        } else swappableTokens.push(key);
      }
    });
    swappableTokens.sort();
    nonSwappableTokens.sort();
    swappableTokensOffWallet.sort();

    if (
      JSON.stringify(nonSwappableTokens) !=
      JSON.stringify(global.nonSwappableTokens)
    ) {
      global.nonSwappableTokens = [...nonSwappableTokens];
      if (global.nonSwappableTokens.length > 0) {
        global.notify(
          `Non-swappable tokens (low liquidity): ${global.nonSwappableTokens.join(
            ", "
          )}`
        );
      }
    }

    if (
      JSON.stringify(swappableTokens) != JSON.stringify(global.swappableTokens)
    ) {
      global.swappableTokens = [...swappableTokens];
      if (global.swappableTokens.length > 0) {
        global.notify(
          `Swappable tokens in wallet (liquidity ${
            global.config.poolSizeStrategy == "MAX" ? ">=" : "<"
          } ${
            global.config.poolSizeThreshold
          }k$): ${global.swappableTokens.join(", ")}`
        );
      }
    }

    if (
      JSON.stringify(swappableTokensOffWallet) !=
      JSON.stringify(global.swappableTokensOffWallet)
    ) {
      global.swappableTokensOffWallet = [...swappableTokensOffWallet];
      if (global.swappableTokensOffWallet.length > 0) {
        global.notify(
          `Swappable tokens off wallet (liquidity ${
            global.config.poolSizeStrategy == "MAX" ? ">=" : "<"
          } ${
            global.config.poolSizeThreshold
          }k$): ${global.swappableTokensOffWallet.join(", ")}`
        );
      }
    }

    return prices;
  } catch (e) {
    global.log("[filters.js::poolFilter] catch: " + e);
    console.trace(e);
  }
};

module.exports = { poolFilter };
