let calculon = {};

let reserve_original_1;
let reserve_original_2;
let victimIn;
let allowedSlippage;
let gasPrice;
let attackerPaysGas;
let sandwichInput;
let gasCostInToken2 = 0;

let victim_expected_amountOut;
let victim_minAmountOut;

function simulateSwap(reserve1, reserve2, amountIn, allowedSlippage = 1) {
  let amountInWithFee = amountIn * (997 / 1000);
  let numerator = amountInWithFee * reserve2;
  let denominator = reserve1 + amountInWithFee;
  let amountOut = numerator / denominator;
  let expectedPrice = amountInWithFee / amountOut;
  let maxPrice = allowedSlippage * expectedPrice + expectedPrice;
  let minAmountOut = amountInWithFee / maxPrice;
  let newReserve1 = reserve1 + amountIn;
  let newReserve2 = reserve2 - amountOut;
  return [amountOut, minAmountOut, newReserve1, newReserve2];
}

function findIdealSandwichInput(
  reserve1,
  reserve2,
  victimIn,
  minAmountOut,
  allowedSlippage
) {
  // calculate maximal input such that slippage of victim transaction is still tolerated
  let maxInputCalc =
    (5.01505 *
      Math.pow(10, -7) *
      Math.sqrt(
        9000000 * reserve1 * reserve1 * minAmountOut +
          3976036000000 * reserve1 * reserve2 * victimIn -
          5964054000 * reserve1 * minAmountOut * victimIn +
          988053892081 * minAmountOut * victimIn * victimIn
      )) /
      Math.sqrt(minAmountOut) -
    1.0015 * reserve1 -
    0.4985 * victimIn;
  let [, transactionFailed] = updateSandwich(
    [reserve1, reserve2, victimIn, allowedSlippage, 0, maxInputCalc, false],
    false
  );

  //correct result to account for rounding errors if transaction fails
  if (transactionFailed) {
    let currentInput;
    let largestFailInput = maxInputCalc;
    for (let rate of [0.5, 0.9, 0.99, 0.999, 0.9999]) {
      currentInput = largestFailInput;
      transactionFailed = true;
      while (transactionFailed) {
        currentInput = currentInput * rate;
        let [, newTransactionFailed] = updateSandwich(
          [
            reserve1,
            reserve2,
            victimIn,
            allowedSlippage,
            0,
            currentInput,
            false,
          ],
          false
        );
        if (newTransactionFailed) {
          largestFailInput = currentInput;
        }
        transactionFailed = newTransactionFailed;
      }
    }
    maxInputCalc = currentInput;
  }

  return maxInputCalc;
}

function findMaxInput(
  reserve1,
  reserve2,
  allowedSlippage,
  gasPrice,
  totalAmount,
  attackerPaysGas
) {
  //check if binary search is even necessary
  let testAmount = totalAmount;
  let [, victim_minAmountOut] = simulateSwap(
    reserve1,
    reserve2,
    testAmount,
    allowedSlippage
  );
  let idealSandwichInput = findIdealSandwichInput(
    reserve1,
    reserve2,
    testAmount,
    victim_minAmountOut,
    allowedSlippage
  );
  let [profit] = updateSandwich(
    [
      reserve1,
      reserve2,
      testAmount,
      allowedSlippage,
      gasPrice,
      idealSandwichInput,
      attackerPaysGas,
    ],
    false
  );
  if (profit <= 0) {
    return testAmount;
  }

  let lowerBound = 0;
  let upperBound = totalAmount;
  testAmount = (lowerBound + upperBound) / 2;

  while (testAmount * 0.999 > lowerBound) {
    [victim_expected_amountOut, victim_minAmountOut] = simulateSwap(
      reserve1,
      reserve2,
      testAmount,
      allowedSlippage
    );
    idealSandwichInput = findIdealSandwichInput(
      reserve1,
      reserve2,
      testAmount,
      victim_minAmountOut,
      allowedSlippage
    );
    [profit] = updateSandwich(
      [
        reserve1,
        reserve2,
        testAmount,
        allowedSlippage,
        gasPrice,
        idealSandwichInput,
        attackerPaysGas,
      ],
      false
    );
    if (profit <= 0) {
      lowerBound = testAmount;
    } else {
      upperBound = testAmount;
    }
    testAmount = (lowerBound + upperBound) / 2;
  }

  return lowerBound;
}

function readInput() {
  reserve_original_1 = parseFloat(calculon["p_1"]);
  reserve_original_2 = parseFloat(calculon["p_2"]);
  victimIn = parseFloat(calculon["v_in_input"]);
  allowedSlippage = parseFloat(calculon["slippage"]) / 100;
  gasPrice = 0;
  attackerPaysGas = false;
  sandwichInput = parseFloat(calculon["a1_in"]);

  return [
    reserve_original_1,
    reserve_original_2,
    victimIn,
    allowedSlippage,
    gasPrice,
    sandwichInput,
    attackerPaysGas,
  ];
}

//returns profit
function updateSandwich(inputData = []) {
  if (inputData.length == 0) {
    [
      reserve_original_1,
      reserve_original_2,
      victimIn,
      allowedSlippage,
      gasPrice,
      sandwichInput,
      attackerPaysGas,
    ] = readInput();
  } else {
    [
      reserve_original_1,
      reserve_original_2,
      victimIn,
      allowedSlippage,
      gasPrice,
      sandwichInput,
      attackerPaysGas,
    ] = inputData;
  }

  let [, victim_minAmountOut] = simulateSwap(
    reserve_original_1,
    reserve_original_2,
    victimIn,
    allowedSlippage
  );

  let [adversary_output1, , reserve_after_a1_1, reserve_after_a1_2] =
    simulateSwap(reserve_original_1, reserve_original_2, sandwichInput);

  let [victim_output, , reserve_after_v_1, reserve_after_v_2] = simulateSwap(
    reserve_after_a1_1,
    reserve_after_a1_2,
    victimIn
  );

  let adversary_output2, reserve_after_a2_2, reserve_after_a2_1;

  if (victim_output >= victim_minAmountOut) {
    [adversary_output2, , reserve_after_a2_2, reserve_after_a2_1] =
      simulateSwap(reserve_after_v_2, reserve_after_v_1, adversary_output1);
  } else {
    [adversary_output2, , reserve_after_a2_2, reserve_after_a2_1] =
      simulateSwap(reserve_after_a1_2, reserve_after_a1_1, adversary_output1);
  }

  let profit, revenue;
  profit = revenue = adversary_output2 - sandwichInput;
  let transactionFailed = victim_output < victim_minAmountOut;

  calculon["p_original_1"] = reserve_original_1;
  calculon["p_original_2"] = reserve_original_2;
  calculon["a1_output"] = adversary_output1;
  calculon["p_t1"] = reserve_after_a1_1;
  calculon["p_t2"] = reserve_after_a1_2;
  calculon["v_in"] = victimIn;

  if (!transactionFailed) {
    calculon["v_output"] = victim_output;
    if (profit > 0) {
      calculon["result_attack"] = victim_output.toFixed(7);
      calculon["result_attack_gas"] = (victim_output - gasCostInToken2).toFixed(
        7
      );
      let resultNoAttack = parseFloat(calculon["result_no_attack_gas"]);
      calculon["result_order_savings"] = (
        resultNoAttack -
        (victim_output - gasCostInToken2)
      ).toFixed(7);
    }
  } else {
    calculon["v_output"] = "Transaction failed!";
  }

  calculon["p_a2_1"] = reserve_after_v_2;
  calculon["p_a2_2"] = reserve_after_v_1;
  calculon["a2_in"] = adversary_output1;
  calculon["a2_output"] = adversary_output2;
  calculon["revenue_val"] = revenue.toFixed(7);
  calculon["profit_val"] = profit.toFixed(7);

  return [profit, transactionFailed];
}

//returns amount of token victim receives
function generateSandwich() {
  let reserve_original_1, reserve_original_2, victimIn, allowedSlippage;
  [reserve_original_1, reserve_original_2, victimIn, allowedSlippage] =
    readInput();

  [victim_expected_amountOut, victim_minAmountOut] = simulateSwap(
    reserve_original_1,
    reserve_original_2,
    victimIn,
    allowedSlippage
  );

  let idealInputAmount = findIdealSandwichInput(
    reserve_original_1,
    reserve_original_2,
    victimIn,
    victim_minAmountOut,
    allowedSlippage
  );
  calculon["a1_in"] = idealInputAmount;

  let [attackerProfit] = updateSandwich();

  return attackerProfit > 0 ? parseFloat(calculon["v_output"]) : -1;
}

function calcOrderSplit() {
  let [
    reserve1,
    reserve2,
    victimIn,
    allowedSlippage,
    gasPrice,
    ,
    attackerPaysGas,
  ] = readInput();

  let [outputNoAttack] = simulateSwap(
    reserve1,
    reserve2,
    victimIn,
    allowedSlippage
  );

  let totalReceived = 0;
  let leftToTrade = victimIn;
  let orderSplits = [];

  while (leftToTrade > 0) {
    let maxInput = findMaxInput(
      reserve1,
      reserve2,
      allowedSlippage,
      gasPrice,
      leftToTrade,
      attackerPaysGas
    );
    let swapInput = Math.min(leftToTrade, maxInput);
    orderSplits.push(swapInput);
    [victim_expected_amountOut, , reserve1, reserve2] = simulateSwap(
      reserve1,
      reserve2,
      swapInput
    );
    totalReceived += victim_expected_amountOut;
    leftToTrade -= swapInput;
  }

  let sandwichedReturn = generateSandwich();
  if (sandwichedReturn == -1) {
    sandwichedReturn = outputNoAttack;
  }

  let savings = (
    totalReceived -
    orderSplits.length * gasCostInToken2 -
    (sandwichedReturn - gasCostInToken2)
  ).toFixed(7);

  calculon["result_no_attack"] = outputNoAttack.toFixed(7);
  calculon["result_attack"] = sandwichedReturn.toFixed(7);
  calculon["result_order_split"] = totalReceived.toFixed(7);
  calculon["result_no_attack_gas"] = (outputNoAttack - gasCostInToken2).toFixed(
    7
  );
  calculon["result_attack_gas"] = (sandwichedReturn - gasCostInToken2).toFixed(
    7
  );
  calculon["result_order_split_gas"] = (
    totalReceived -
    orderSplits.length * gasCostInToken2
  ).toFixed(7);
  calculon["result_order_savings"] = savings;

  orderSplits = orderSplits.map(
    (x) => "  " + Math.floor(x * 100000) / 100000 + "  "
  );

  calculon["result_input_order_split"] = orderSplits;

  return {
    attackerInputAmountTx1: calculon["a1_in"],
    attackerOutputAmountTx1: calculon["a1_output"],
    attackerInputAmountTx2: calculon["a2_in"],
    attackerOutputAmountTx2: calculon["a2_output"],
    profit: calculon["profit_val"],
    revenue: calculon["revenue_val"],
  };
}

// test data
// calculon["p_1"] = 25440.818209932033;
// calculon["p_2"] = 3813537.451130213;
// calculon["v_in_input"] = 1000;
// calculon["slippage"] = 5;
// calculon["a1_in"] = 0;

// console.log(calcOrderSplit());

module.exports.burgerKing = (p_1, p_2, v_in_input, slippage) => {
  calculon = {
    p_1,
    p_2,
    v_in_input,
    slippage,
    a1_in: 0,
  };
  return calcOrderSplit();
};
