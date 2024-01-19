async function swap(tx) {
  try {
    global.pending.find((k) => k.hash == tx.hash).processed = true;
    const { chain, key, slippage } = global.pending.find(
      (k) => k.hash == tx.hash
    );

    const prices = await global.sindrome.getPrices();
    if (!prices[chain][key]) return;

    const attackResult = global.sandwich.burgerKing(
      prices[chain][key].reserveToken1,
      prices[chain][key].reserveToken0,
      slippage.token0Amount,
      slippage.ratio
    );
    console.log(attackResult);
    if (!attackResult.revenue || attackResult.revenue < 0.1) return;
    if (
      (tx.type == "sell" && attackResult.attackerInputAmountTx1 > 999) ||
      (tx.type == "buy" && attackResult.attackerInputAmountTx1 > 999)
    )
      return;

    const balance = await global.sindrome.getBalance();

    /*
    ----------------------------
    PAIR [COIN TOKEN]
    BUY ------------------------ 
    SWAP_EXACT_OUT [COIN TOKEN]
    SWAP_EXACT_IN [TOKEN COIN]

    ----------------------------
    PAIR [TOKEN COIN]
    SELL -----------------------
    SWAP_EXACT_OUT [TOKEN COIN]
    SWAP_EXACT_IN [COIN TOKEN]
    -----------------------------
    */
    const config = [
      {
        sourceTokenAmount: attackResult.attackerInputAmountTx1,
        destinationTokenAmount: attackResult.attackerOutputAmountTx1,
        sourceTokenName: tx.type == "buy" ? "KDA" : key,
        destinationTokenName: tx.type == "buy" ? key : "KDA",
        chainIndex: chain,
        slippage: 0.001,
        type: "SWAP_EXACT_OUT",
      },
      {
        sourceTokenAmount: attackResult.attackerInputAmountTx2,
        destinationTokenAmount: attackResult.attackerOutputAmountTx2,
        sourceTokenName: tx.type == "buy" ? key : "KDA",
        destinationTokenName: tx.type == "buy" ? "KDA" : key,
        chainIndex: chain,
        slippage: 0.001,
        type: "SWAP_EXACT_IN",
      },
    ];

    await global.telegram.notify(
      JSON.stringify({
        date: new Date().toISOString(),
        env: global.externalConfig.TARGET_ENV,
        type: tx.type,
        pair: tx.type == "buy" ? "KDA " + key : key + " KDA",
        config: config,
        reserve: prices[chain][key],
        profit: attackResult.profit,
        chain: tx.chain,
        attackResult: attackResult,
        data: tx.slippage,
        hash: "https://explorer.chainweb.com/mainnet/txdetail/" + tx.hash,
      })
    );
  } catch (e) {
    console.trace(e);
    return e;
  }
}

async function finder(tx, chain) {
  try {
    if (tx.tag !== "Pending") return;
    const content = JSON.parse(tx.contents);
    if (content.cmd.indexOf(".swap-exact-in") == -1) return;
    if (
      content.cmd.indexOf("token0Amount") == -1 &&
      content.cmd.indexOf("token1Amount") == -1 &&
      content.cmd.indexOf("token0AmountWithSlippage") == -1 &&
      content.cmd.indexOf("token1AmountWithSlippage") == -1
    )
      return;
    const contents = JSON.parse(content.cmd);
    const _tx = contents.payload.exec.data;
    const _code = contents.payload.exec.code;
    if (
      !_tx.token0Amount &&
      !_tx.token1Amount &&
      !_tx.token0AmountWithSlippage &&
      !_tx.token1AmountWithSlippage
    )
      return;

    const totalSlippage =
      ((_tx.token0AmountWithSlippage - _tx.token0Amount) / _tx.token0Amount) *
      100;
    if (totalSlippage < 4) return;
    let matches = _code.match(/\[(.*?)\]/);
    if (!matches) return;
    let submatch = matches[1];
    const entries = Object.entries(mapperChecker);
    for (const [key, value] of entries) {
      if (key == submatch)
        global.pending.push({
          processed: false,
          key: value.key,
          type: value.type,
          hash: content.hash,
          chain: "chain" + chain,
          slippage: {
            token0Amount: _tx.token0Amount,
            token1Amount: _tx.token1Amount,
            token0AmountWithSlippage: _tx.token0AmountWithSlippage,
            token1AmountWithSlippage: _tx.token1AmountWithSlippage,
            ratio: totalSlippage,
          },
        });
    }
  } catch (e) {
    console.trace(e);
    return e;
  }
}

module.exports = {
  finder,
  swap,
};
