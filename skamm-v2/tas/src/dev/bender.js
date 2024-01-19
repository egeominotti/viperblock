const fs = require("fs");

module.exports.run = async () => {
  let currentStats = "";
  let lastStats = "";

  const compute = async () => {
    try {
      const stats = fs
        .readFileSync(__dirname + "/divergence-stats.txt")
        .toString()
        .trim()
        .split("\r\n")
        .map((r) => {
          return r.split("|")[2];
        })
        .sort((a, b) => {
          return parseFloat(b) - parseFloat(a);
        })
        .filter((n) => n >= 1)
        .reduce(function (count, currentValue) {
          return (
            count[currentValue]
              ? ++count[currentValue]
              : (count[currentValue] = 1),
            count
          );
        }, {});

      let binnedStats = {};
      for (let bin of Object.keys(stats).sort()) {
        const binIndex = bin.split(".")[0] || bin;
        if (!binnedStats[binIndex + "%"])
          binnedStats[binIndex + "%"] = stats[bin];
        else binnedStats[binIndex + "%"] += stats[bin];
      }

      lastStats = JSON.stringify(binnedStats);

      if (currentStats != lastStats) {
        global.notify(`Divergence Stats: ${lastStats}`);
        lastStats = currentStats;
      }
    } catch (e) {
      console.trace(e);
    }
  };

  compute();

  setInterval(compute, 360000);
};
