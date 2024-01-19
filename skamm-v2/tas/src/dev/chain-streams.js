// https://www.npmjs.com/package/chainweb/v/2.0.0
const chainweb = require("chainweb");
global.blockInfo = {
  time: Date.now(),
  height: -1,
};
global.chainEvents = [];

const startStream = (
  streamType = "transaction",
  chains = [1, 2],
  callback = (event) => {
    global.log("Transaction stream event received: ");
    console.log(event);
  }
) => {
  global.chainStreams = {
    [streamType]: chainweb[streamType].stream(2, chains, callback),
  };
};

const checkChainEvents = () => {
  const chainEvents = [...global.chainEvents].sort((a, b) => {
    return b.creationTime.unix - a.creationTime.unix;
  });
  const l = chainEvents.length;
  if (l < 2) return;
  for (let e = 0; e < l - 1; e++) {
    if (chainEvents[e].height == chainEvents[e + 1].height) {
      if (
        Math.abs(
          chainEvents[e].creationTime.unix -
            chainEvents[e + 1].creationTime.unix
        ) /
          1000 <
        60 * 1000
      ) {
        global.blockInfo = {
          time: Date.now(),
          height: chainEvents[e].height,
        };
        global.chainEvents = [];
        global.log(
          "Current block time: " +
            new Date(global.blockInfo.time).toLocaleString()
        );
        global.log("Current block height: " + global.blockInfo.height);
        global.notify(`${JSON.stringify(global.blockInfo)}`);
        return;
      }
    }
  }
  global.blockInfo = {
    time: Date.now(),
    height: -1,
  };
};

const runStream = () => {
  startStream("block", ["1", "2"], (event) => {
    const chainEvent = {
      chainId: event.header.chainId,
      height: event.header.height,
      creationTime: {
        unix: event.header.creationTime,
        human: new Date(
          Math.floor(event.header.creationTime / 1000)
        ).toLocaleString(),
      },
    };
    if (global.config.debugActive) global.log(chainEvent);
    global.chainEvents.push(chainEvent);
    checkChainEvents();
  });
};

module.exports = { runStream };
