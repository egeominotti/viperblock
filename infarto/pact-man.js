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
(use ${global.tokens.exchanges[exchange - 1]})
(let*
(`;
  let keys = Object.keys(global.tokens.data);
  keys.splice(keys.indexOf("KDA"), 1);
  keys.forEach((key) => {
    pactCode += `
      (p${p} (get-pair ${global.tokens.data[key].address} coin))
      (r${r++} (reserve-for p${p} ${global.tokens.data[key].address}))
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

async function pactFetchLocal(token, pactCode, chain) {
  try {
    let net;
    let pactResponse = await global.pact.fetch.local(
      {
        pactCode,
        meta: pact.lang.mkMeta("", chain, 0.000001, 8000, creationTime(), 600),
      },
      chain == "1"
        ? (net =
            global.internalConfig.URI[global.externalConfig.TARGET_ENV] +
            "1/pact")
        : (net =
            global.internalConfig.URI[global.externalConfig.TARGET_ENV] +
            "2/pact")
    );

    if (pactResponse.result.status == "success") {
      return [token, getReserve(pactResponse.result.data.balance)];
    }
  } catch (e) {
    console.error("[pact-man.js::pactFetchLocal] catch: " + e);
    console.trace(e);
  }

  return [token, 0];
}

async function fetchPrices(target, walletTokens) {
  try {
    const [chainId, pactCode] =
      target == "kdswap" ? ["1", kdswapPact] : ["2", kaddexPact];
    let pactResponse = await global.pact.fetch.local(
      {
        pactCode,
        meta: pact.lang.mkMeta(
          "account",
          chainId,
          0.000001,
          10000,
          creationTime(),
          600
        ),
      },
      global.internalConfig.URI[global.externalConfig.TARGET_ENV] +
        `${chainId}/pact`
    );
    let keys = Object.keys(global.tokens.data);
    keys.splice(keys.indexOf("KDA"), 1);
    if (pactResponse.result.status == "success") {
      let prices = {};
      for (let t = 0; t < keys.length * 2; t += 2) {
        let k = t / 2;
        const reserveToken0 = getReserve(pactResponse.result.data[t]);
        const reserveToken1 = getReserve(pactResponse.result.data[t + 1]);
        const div = reserveToken1 / reserveToken0;
        const ratio = !isNaN(div) ? div : 0;
        let token = global.tokens.data[keys[k]];
        prices[keys[k]] = {
          address: token.address,
          reserveToken0,
          reserveToken1,
          ratio,
          exchange: global.tokens.exchanges[parseInt(chainId) - 1],
          chainId,
          precision: token.precision,
        };
      }
      return prices;
    } else {
      console.error(
        "[pact-man.js::fetchPrices] error: " +
          JSON.stringify(pactResponse.result)
      );
    }
  } catch (e) {
    console.error("[pact-man.js::getPrices] catch: " + e);
    console.trace(e);
  }
  return null;
}

const fetchBalance = async (chain) => {
  return Promise.all(
    Object.keys(global.tokens.data).map((token) => {
      return pactFetchLocal(
        token,
        `(${global.tokens.data[token].address}.details "${global.externalConfig.PUBLIC_KEY}")`,
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
      console.error("[pact-man.js::fetchBalance] catch: " + e);
      console.trace(e);
    });
};

module.exports = { fetchPrices, fetchBalance };
