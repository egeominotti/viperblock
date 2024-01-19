const log = (msg) => {
  console.log(`[${new Date().toLocaleString()}] ${msg}`);
};

const delay = async (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const toMb = (r) => {
  return parseInt(((r / 1024 / 1024) * 100) / 100);
};

const clone = (obj) => {
  if (isEmptyObject(obj)) return {};
  return JSON.parse(JSON.stringify(obj));
};

const memoryFootprint = () => {
  return `Approximately ${Math.round(
    toMb(process.memoryUsage().heapUsed)
  )} MB of RAM used...`;
};

const get = async (url, resultType) => {
  return await (await fetch(url))[resultType]();
};

const isEmptyObject = (obj) => {
  if (!obj) return true;
  return Object.keys(obj).length == 0 && obj.constructor === Object;
};

const healthCheck = async (heartbeat) => {
  const getResponse = () => {
    return get(global.config.healthCheckUrl, "text");
  };
  let response = "";
  if (!heartbeat) {
    while (response.indexOf("Health check OK.") == -1) {
      response = (await getResponse()).trim();
      await delay(1000);
    }
    global.lastHealthCheckMessage = response;
    log(global.lastHealthCheckMessage);
    notify(global.lastHealthCheckMessage);
  } else response = (await getResponse()).trim();

  if (response != global.lastHealthCheckMessage) {
    global.lastHealthCheckMessage = response;
    log(response);
    notify(response);
  }
};

module.exports = {
  log,
  delay,
  clone,
  memoryFootprint,
  get,
  isEmptyObject,
  healthCheck,
  toMb,
};
