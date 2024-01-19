const CONTRACTS = {
  KDSWAP: {
    Name: "kdlaunch.kdswap-exchange",
    GET_ORACLE_CUMULATIVE_PRICE:
      "kdlaunch.kdswap-exchange.get-oracle-time-cumulative-price",
    GET_PAIR: "kdlaunch.kdswap-exchange.get-pair",
    GET_PAIR_KEY: "kdlaunch.kdswap-exchange.get-pair-key",
    GET_PAIR_BY_KEY: "kdlaunch.kdswap-exchange.get-pair-by-key",
    GET_PAIRS: "kdlaunch.kdswap-exchange.get-pairs",
    GET_TOKENS: "kdlaunch.kdswap-exchange.tokens.get-tokens",
    GET_TOTAL_SUPPLY: "kdlaunch.kdswap-exchange.tokens.total-supply",
    ADD_LIQUIDITY: "kdlaunch.kdswap-exchange.add-liquidity",
    REMOVE_LIQUIDITY: "kdlaunch.kdswap-exchange.remove-liquidity",
    SWAP: "kdlaunch.kdswap-exchange.swap",
    SWAP_EXACT_IN: "kdlaunch.kdswap-exchange.swap-exact-in",
    SWAP_EXACT_OUT: "kdlaunch.kdswap-exchange.swap-exact-out",
    TRANSFER_TOKENS: "kdlaunch.kdswap-exchange.tokens.TRANSFER",
    GAS_PAYER: "kdlaunch.kdswap-exchange.gas-station.GAS_PAYER",
  },
};
module.exports = CONTRACTS;
