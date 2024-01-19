const { healthCheck, toMb } = require("./utils");
const os = require("os");

function cpuAverage() {
  var totalIdle = 0,
    totalTick = 0;
  var cpus = os.cpus();
  for (var i = 0, len = cpus.length; i < len; i++) {
    var cpu = cpus[i];
    for (type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  }
  return { idle: totalIdle / cpus.length, total: totalTick / cpus.length };
}

module.exports.run = async () => {
  setInterval(async () => {
    try {
      // health check
      await healthCheck(true);
      // heap check
      const heapUsedMb = toMb(process.memoryUsage().heapUsed);
      if (heapUsedMb > global.config.heapAlertMb)
        global.notify(
          ` [HEAP ALERT] Limit exceeded (${heapUsedMb}Mb out of ${global.config.heapAlertMb}Mb)`
        );
      // ram check
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
      const usedMem = totalMem - freeMem;
      const ramUsedPerc = parseInt((100 * usedMem) / os.totalmem());
      if (ramUsedPerc > global.config.ramAlertPerc) {
        global.notify(
          ` [RAM ALERT] Limit exceeded (${ramUsedPerc}% out of ${global.config.ramAlertPerc}%)`
        );
      }

      // cpu check
      var startMeasure = cpuAverage();
      setTimeout(function () {
        var endMeasure = cpuAverage();
        var idleDifference = endMeasure.idle - startMeasure.idle;
        var totalDifference = endMeasure.total - startMeasure.total;
        var usedCpuPerc = 100 - ~~((100 * idleDifference) / totalDifference);
        if (usedCpuPerc > global.config.cpuAlertPerc) {
          global.notify(
            ` [CPU ALERT] Limit exceeded (${usedCpuPerc}% out of ${global.config.cpuAlertPerc}%)`
          );
        }
      }, 100);
    } catch (e) {
      console.trace(e);
    }
  }, 5000);
};
