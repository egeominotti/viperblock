const FEE = 0.003;

// const superComputeIn = function (amount, token0, token1, ratio) {
//   return (
//     computeIn(amount, token0, token1) -
//     ((amount * FEE) / ratio +
//       (amount * priceImpact(amount, token0, token1)) / ratio)
//   );
// };

const superComputeIn = function (amount, token0, token1, ratio) {
  const pimpact = priceImpact(amount, token0, token1);
  const liquidityPoolFee0 = amount * FEE;
  const priceImpactFee0 = amount * pimpact;
  const liquidityPoolFeeToken0 = liquidityPoolFee0 / ratio;
  const priceImpactFeeToken0 = priceImpactFee0 / ratio;

  if (global.config.debugActive) {
    console.log("superComputeIn data: ", {
      pimpact,
      liquidityPoolFee0,
      priceImpactFee0,
      liquidityPoolFeeToken0,
      priceImpactFeeToken0,
    });
  }

  return [
    pimpact,
    computeIn(amount, token0, token1) -
      (liquidityPoolFeeToken0 + priceImpactFeeToken0),
  ];
};

// const superComputeOut = function (amount, token0, token1, ratio) {
//   return (
//     computeOut(amount, token0, token1) -
//     (amount * FEE * ratio +
//       amount * priceImpact(amount, token1, token0) * ratio)
//   );
// };

const superComputeOut = function (amount, token0, token1, ratio) {
  const pimpact = priceImpact(amount, token1, token0);
  const liquidityPoolFee0 = amount * FEE;
  const priceImpactFee0 = amount * pimpact;
  const liquidityPoolFeeToken0 = liquidityPoolFee0 * ratio;
  const priceImpactFeeToken0 = priceImpactFee0 * ratio;

  if (global.config.debugActive) {
    console.log("superComputeOut data: ", {
      pimpact,
      liquidityPoolFee0,
      priceImpactFee0,
      liquidityPoolFeeToken0,
      priceImpactFeeToken0,
    });
  }

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

module.exports = {
  priceImpact,
  superComputeIn,
  superComputeOut,
};
