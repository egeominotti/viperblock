const CONTRACTS = {
  KADDEX: {
    Name: "kaddex",
    GET_ORACLE_CUMULATIVE_PRICE:
      "kaddex.exchange.get-oracle-time-cumulative-price",
    GET_PAIR: "kaddex.exchange.get-pair",
    GET_PAIR_KEY: "kaddex.exchange.get-pair-key",
    GET_PAIR_BY_KEY: "kaddex.exchange.get-pair-by-key",
    GET_PAIRS: "kaddex.exchange.get-pairs",
    GET_TOKENS: "kaddex.tokens.get-tokens",
    GET_TOTAL_SUPPLY: "kaddex.tokens.total-supply",
    ADD_LIQUIDITY: "kaddex.exchange.add-liquidity",
    REMOVE_LIQUIDITY: "kaddex.exchange.remove-liquidity",
    SWAP: "kaddex.exchange.swap",
    SWAP_EXACT_IN: "kaddex.exchange.swap-exact-in",
    SWAP_EXACT_OUT: "kaddex.exchange.swap-exact-out",
    TRANSFER_TOKENS: "kaddex.tokens.TRANSFER",
    GAS_PAYER: "kaddex.gas-station.GAS_PAYER",
  },
};
module.exports = CONTRACTS;
