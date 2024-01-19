const { superComputeIn } = require("./math-core");
const { swapExactIn } = require("./sdk/sdk");

const performRebalance = async (balance, prices, amounts) => {
  try {
    let walletTokens = Object.keys(prices.chain1);
    let transferTable = { chain1ToChain2: {}, chain2ToChain1: {} };
    for (let token of walletTokens) {
      const tokenBalance = balance.chain1[token] + balance.chain2[token];
      const halfBalance = tokenBalance / 2;
      const halfBalanceThreshold = (halfBalance / 100) * 30; // 30%
      const delta = (balance.chain1[token] - balance.chain2[token]) / 2;
      if (Math.abs(delta) > halfBalanceThreshold) {
        transferTable[delta < 0 ? "chain1ToChain2" : "chain2ToChain1"][token] =
          Math.abs(delta);
      }
    }
    walletTokens.splice(walletTokens.indexOf("KDA"), 1);
    const swapAmountRatio = global.config.swapAmount * 3 * 1.05;
    const viabilityThreshold = swapAmountRatio * walletTokens.length;
    if (viabilityThreshold > balance.chain1["KDA"] + balance.chain2["KDA"]) {
      global.notify(
        `Viability threshold issue while rebalancing. Please check`
      );
      return false;
    }
    let amountTable = { chain1: {}, chain2: {} };
    let swapConfigCandidate;
    for (let chainId of ["1", "2"]) {
      let kdaMaxCap = 0;
      for (let t = 0; t < walletTokens.length; t++) {
        const token = walletTokens[t];
        kdaMaxCap += swapAmountRatio;
        amountTable[`chain${chainId}`][token] = superComputeIn(
          swapAmountRatio,
          prices[`chain${chainId}`][token].reserveToken0,
          prices[`chain${chainId}`][token].reserveToken1,
          prices[`chain${chainId}`][token].ratio
        );

        if (
          amountTable[`chain${chainId}`][token][0] < 0.01 &&
          amountTable[`chain${chainId}`][token][1] >
            balance[`chain${chainId}`][token]
        ) {
          global.log(
            `Rebalance needed for token ${token}: ${Math.abs(
              amountTable[`chain${chainId}`][token][1] -
                balance[`chain${chainId}`][token]
            )} on chain${chainId}`
          );

          if (balance[`chain${chainId}`]["KDA"] >= kdaMaxCap) {
            swapConfigCandidate = {
              publicKey: global.config.publicKey,
              secretKey: global.config.secretKey,
              token,
              chain1Ratio: prices.chain1[token].ratio,
              chain2Ratio: prices.chain2[token].ratio,
              ratioDivergence: parseFloat(
                Math.abs(
                  100 -
                    (prices.chain2[token].ratio * 100) /
                      prices.chain1[token].ratio
                ).toFixed(2)
              ),
              sourceExchange: {
                exchangeName: chainId == "1" ? "kdswap" : "kaddex",
                sourceTokenName: "KDA",
                sourceTokenAmount: swapAmountRatio,
                destinationTokenName: token,
                destinationTokenAmount:
                  amountTable[`chain${chainId}`][token][1],
                slippage: 0.05,
              },
            };
            break;
          } else {
            global.log(
              `KDA balance of chain${chainId} (${
                balance[`chain${chainId}`]["KDA"]
              }) is less than KDA max cap allowed (${kdaMaxCap})`
            );
          }
        }
      }
    }

    if (swapConfigCandidate) {
      global.log("Performing wallet rebalance...");
      const result = await swapExactIn(swapConfigCandidate, "sourceExchange");
      if (result) {
        global.log("Rebalance swap completed...");
        console.log(result);
        return true;
      }
    } else return false;
  } catch (e) {
    global.log("[wallet-rebalancer.js::performRebalance] catch: " + e);
    console.trace(e);
    global.notify(`Rebalance errored...`);
  }
};

module.exports = { performRebalance };
