const isObjectEmpty = require("../utils").isEmptyObject;

const FEE = 0.003;

const superComputeIn = function (amount, token0, token1, ratio) {
  const pimpact = priceImpact(amount, token0, token1);
  const liquidityPoolFee0 = amount * FEE;
  const priceImpactFee0 = amount * pimpact;
  const liquidityPoolFeeToken0 = liquidityPoolFee0 / ratio;
  const priceImpactFeeToken0 = priceImpactFee0 / ratio;

  return [
    pimpact,
    computeIn(amount, token0, token1) -
      (liquidityPoolFeeToken0 + priceImpactFeeToken0),
  ];
};

const superComputeOut = function (amount, token0, token1, ratio) {
  const pimpact = priceImpact(amount, token1, token0);
  const liquidityPoolFee0 = amount * FEE;
  const priceImpactFee0 = amount * pimpact;
  const liquidityPoolFeeToken0 = liquidityPoolFee0 * ratio;
  const priceImpactFeeToken0 = priceImpactFee0 * ratio;

  return [
    pimpact,
    computeOut(amount, token0, token1) -
      (liquidityPoolFeeToken0 + priceImpactFeeToken0),
  ];
};

const computeIn = function (amountOut, token0, token1) {
  return (
    Number(Number(token0) * amountOut) / Number(Number(token1) - amountOut)
  );
};

const computeOut = function (amountIn, token0, token1) {
  return Number(amountIn * Number(token1)) / Number(Number(token0) + amountIn);
};

function computePriceImpact(amountIn, amountOut, token0, token1) {
  const exactQuote = (amountIn * Number(token1)) / Number(token0);
  return (exactQuote - amountOut) / exactQuote;
}

function priceImpact(amount, token0, token1) {
  const computeInResult = computeIn(amount, token0, token1);
  const computeOuResult = computeOut(computeInResult, token0, token1);
  return computePriceImpact(computeInResult, computeOuResult, token0, token1);
}

async function priceImpactMaximizer(
  balance,
  prices,
  divergenceFactor,
  reduceFactor
) {
  if (
    isObjectEmpty(balance) ||
    isObjectEmpty(balance.chain1) ||
    isObjectEmpty(balance.chain2) ||
    isObjectEmpty(prices) ||
    isObjectEmpty(prices.chain1) ||
    isObjectEmpty(prices.chain2)
  )
    return;

  const kdaBalance = {
    chain1: Math.trunc(balance.chain1["KDA"]),
    chain2: Math.trunc(balance.chain2["KDA"]),
  };

  let keys = Object.keys(balance.chain1);
  keys.splice(keys.indexOf("KDA"), 1);
  let validAmounts = { chain1: {}, chain2: {} };
  let chains = Object.keys(prices);

  for (let p = 0; p < chains.length; p++) {
    keys.forEach((key) => {
      if (prices[`chain${p + 1}`][key]) {
        validAmounts[`chain${p + 1}`][key] = 0;
        for (
          let maximizedKdaSwapAmount = 1;
          maximizedKdaSwapAmount < prices[`chain${p + 1}`][key].reserveToken1;
          maximizedKdaSwapAmount++
        ) {
          if (maximizedKdaSwapAmount > kdaBalance[`chain${p + 1}`]) {
            validAmounts[`chain${p + 1}`][key] = Math.min(
              kdaBalance.chain1,
              kdaBalance.chain2
            );
            break;
          } else {
            let priceImpactPercentage =
              priceImpact(
                maximizedKdaSwapAmount,
                prices[`chain${p + 1}`][key].reserveToken0,
                prices[`chain${p + 1}`][key].reserveToken1
              ) * 100;
            if (priceImpactPercentage >= divergenceFactor) {
              validAmounts[`chain${p + 1}`][key] = maximizedKdaSwapAmount;
              break;
            }
          }
        }
      }
    });
  }

  const reduceBy = (input) => {
    return input - (input / 100) * reduceFactor;
  };

  let finalValidAmounts = {};
  keys.forEach((key) => {
    if (validAmounts.chain1[key] && validAmounts.chain2[key]) {
      let min = Math.min(validAmounts.chain1[key], validAmounts.chain2[key]);
      validAmounts.chain1[key] = validAmounts.chain2[key] = !reduceFactor
        ? min
        : reduceBy(min);
      if (min > kdaBalance.chain1 && min > kdaBalance.chain2) {
        global.notify(
          `Insufficient amount (KDA) for ${key} token (min: ${min} | chain1 ${kdaBalance.chain1} | chain2: ${kdaBalance.chain2}) `
        );
      } else if (min > kdaBalance.chain1 || min > kdaBalance.chain2) {
        min = Math.min(kdaBalance.chain1, kdaBalance.chain2);
        finalValidAmounts[key] = !reduceFactor ? min : reduceBy(min);
      } else if (min < kdaBalance.chain1 && min < kdaBalance.chain2) {
        finalValidAmounts[key] = !reduceFactor ? min : reduceBy(min);
      }

      if (finalValidAmounts[key]) {
        const destinationSwapAmount = {
          chain1: finalValidAmounts[key] / prices.chain1[key].priceInUsd,
          chain2: finalValidAmounts[key] / prices.chain2[key].priceInUsd,
        };
        if (
          balance.chain1[key] <= destinationSwapAmount.chain1 ||
          balance.chain2[key] <= destinationSwapAmount.chain2
        ) {
          delete finalValidAmounts[key];
        } else {
          finalValidAmounts[key] *= 0.3;
          finalValidAmounts[key] = Math.trunc(finalValidAmounts[key]);
        }
      }
    }
  });
  return finalValidAmounts;
}

module.exports = {
  priceImpact,
  superComputeIn,
  superComputeOut,
  priceImpactMaximizer,
};
