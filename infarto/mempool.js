const payload = {
  method: "POST",
  headers: { "Content-Type": "application/json" },
};

module.exports.finder = async () => {
  try {
    global.internalConfig.CHAINS.map(async (chain) => {
      const API = `https://${
        global.internalConfig.HOST[global.externalConfig.TARGET_ENV]
      }/chainweb/0.0/mainnet01/chain/${chain}/mempool`;
      const reqHashes = await fetch(API + "/getPending", payload);
      if (!reqHashes.ok) return;

      let pendingHashes = await reqHashes.json();
      if (pendingHashes.hashes.length == 0) return;

      pendingHashes.hashes.map((hash) => {
        const find = global.pending.find((o) => o.hash == hash);
        if (find) {
          pendingHashes.hashes = pendingHashes.hashes.filter(
            (item) => item !== hash
          );
        }
      });

      const reqLookup = await fetch(API + "/lookup", {
        ...payload,
        ...{ body: JSON.stringify(pendingHashes.hashes) },
      });

      if (!reqLookup.ok) return;
      const lookupHash = await reqLookup.json();
      lookupHash.map(async (tx) => {
        await global.checker.finder(tx, chain);
      });
    });

    if (global.pending.length == 0) return;
    global.pending
      .filter((k) => k.processed == false)
      .map(async (tx) => {
        await global.checker.swap(tx);
      });
  } catch (e) {
    console.trace(e);
  }
};
