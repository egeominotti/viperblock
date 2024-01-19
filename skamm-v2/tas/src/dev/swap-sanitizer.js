const swapConfigCheck = (swapConfig) => {
  try {
    const keys = Object.keys(swapConfig);
    for (let k = 0; k < keys.length; k++) {
      const key = keys[k];
      if (
        !swapConfig[key] ||
        (typeof swapConfig[key] == "number" && isNaN(swapConfig[key]))
      ) {
        global.log(`Key '${key}' of 'swapConfig' is invalid`);
        return false;
      } else if (key == "sourceExchange" || key == "destinationExchange") {
        const subKeys = Object.keys(swapConfig[key]);
        for (let s = 0; s < subKeys.length; s++) {
          const subkey = subKeys[s];
          if (
            !swapConfig[key][subkey] ||
            (typeof swapConfig[key][subkey] == "number" &&
              isNaN(swapConfig[key][subkey]))
          ) {
            global.log(
              `[swap-sanitizer.js::swapConfigCheck] subkey '${subkey}' of Key '${key}' of 'swapConfig' is invalid`
            );
            return false;
          }
        }
      }
    }
    return true;
  } catch (e) {
    global.log("[swap-sanitizer.js::swapConfigCheck] catch: " + e);
    console.trace(e);
    return false;
  }
};

module.exports = { swapConfigCheck };
