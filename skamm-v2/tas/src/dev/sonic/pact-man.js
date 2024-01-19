const GAS_PRICE = 0.000001;

const Pact = require("pact-lang-api");
const tokens = require("./resources/tokens.json");

const creationTime = () => Math.round(new Date().getTime() / 1000) - 10;

const getReserve = (tokenData) => {
  return tokenData.decimal ? tokenData.decimal : tokenData;
};

const kdswapPact = generatePactCode(1);
const kaddexPact = generatePactCode(2);

function generatePactCode(exchange) {
  let r = 0;
  let p = 0;
  let pactCode = `
(use ${tokens.exchanges[exchange - 1]})
(let*
(`;
  let keys = Object.keys(tokens.data);
  keys.splice(keys.indexOf("KDA"), 1);
  keys.forEach((key) => {
    pactCode += `
      (p${p} (get-pair ${tokens.data[key].address} coin))
      (r${r++} (reserve-for p${p} ${tokens.data[key].address}))
      (r${r++} (reserve-for p${p} coin))
   `;
    p++;
  });
  pactCode += `)[`;
  for (let i = 0; i < r; i++) {
    pactCode += `r${i} `;
  }
  pactCode += `])`;
  return pactCode;
}

/*
function generatePactCode(tokens) {
  // fetch all with direct pact code | fails for zero-balance tokens
  let t = 0;
  let pactCode = `
  (let*
  (
  (pk "${global.config.publicKey}")
  `;
  Object.keys(tokens).forEach((key) => {
    pactCode += `(t${t++} (${tokens[key].code}.details pk)) `;
  });
  pactCode += `)[`;
  for (let i = 0; i < t; i++) {
    pactCode += `t${i} `;
  }
  pactCode += `])`;
  return pactCode;
}
*/

async function pactFetchLocal(token, pactCode, chain) {
  try {
    let pactResponse = await Pact.fetch.local(
      {
        pactCode,
        meta: Pact.lang.mkMeta("", chain, GAS_PRICE, 8000, creationTime(), 600),
      },
      chain == "1"
        ? (net = global.config.network + "1/pact")
        : (net = global.config.network + "2/pact")
    );

    if (pactResponse.result.status == "success") {
      return [token, getReserve(pactResponse.result.data.balance)];
    }
  } catch (e) {
    global.log("[pact-man.js::pactFetchLocal] catch: " + e);
    console.trace(e);
  }

  return [token, 0];
}

async function getPrices(target, walletTokens) {
  try {
    const [chainId, pactCode] =
      target == "kdswap" ? ["1", kdswapPact] : ["2", kaddexPact];
    let pactResponse = await Pact.fetch.local(
      {
        pactCode,
        meta: Pact.lang.mkMeta(
          "account",
          chainId,
          GAS_PRICE,
          10000,
          creationTime(),
          600
        ),
      },
      global.config.network + `${chainId}/pact`
    );
    let keys = Object.keys(tokens.data);
    keys.splice(keys.indexOf("KDA"), 1);
    if (pactResponse.result.status == "success") {
      let prices = {};
      for (let t = 0; t < keys.length * 2; t += 2) {
        let k = t / 2;
        const reserveToken0 = getReserve(pactResponse.result.data[t]);
        const reserveToken1 = getReserve(pactResponse.result.data[t + 1]);
        const div = reserveToken1 / reserveToken0;
        const ratio = !isNaN(div) ? div : 0;
        let token = tokens.data[keys[k]];
        prices[keys[k]] = {
          address: token.address,
          reserveToken0,
          reserveToken1,
          ratio,
          exchange: tokens.exchanges[parseInt(chainId) - 1],
          chainId,
          precision: token.precision,
          inWallet: walletTokens.indexOf(keys[k]) > -1,
        };
      }
      return prices;
    } else {
      global.log(
        "[pact-man.js::getPrices] error: " + JSON.stringify(pactResponse.result)
      );
    }
  } catch (e) {
    global.log("[pact-man.js::getPrices] catch: " + e);
    console.trace(e);
  }
  return null;
}

/*
const getBalance = async (chainId) => {
  try {
    let pactResponse = await Pact.fetch.local(
      {
        pactCode: walletPact,
        meta: Pact.lang.mkMeta(
          "",
          chainId,
          GAS_PRICE,
          2000,
          creationTime(),
          600
        ),
      },
      global.config.network + `${chainId}/pact`
    );

    if (
      pactResponse &&
      pactResponse.result &&
      pactResponse.result.status == "success"
    ) {
      return pactResponse.result.data.map((balance) => {
        return {
          balance: balance[1]
            ? balance[1].balance
              ? balance[1].balance.decimal
                ? balance[1].balance.decimal
                : balance[1].balance
              : 0
            : 0,
        };
      });
    }
  } catch (e) {
    global.log(e);
    console.trace(e);
  }
  return null;
};
*/

const getBalance = async (chain) => {
  return Promise.all(
    Object.keys(tokens.data).map((token) => {
      return pactFetchLocal(
        token,
        `(${tokens.data[token].address}.details "${global.config.publicKey}")`,
        chain
      );
    })
  )
    .then((balances) => {
      let table = {};
      balances.map((balance) => {
        if (balance[1] != 0) table[balance[0]] = balance[1];
      });
      return table;
    })
    .catch((e) => {
      global.log("[pact-man.js::getBalance] catch: " + e);
      console.trace(e);
    });
};

module.exports = { getPrices, getBalance };
