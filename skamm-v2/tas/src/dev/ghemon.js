const shelljs = require("shelljs");

module.exports.run = async () => {
  let isBusy = false;
  const config = {
    async: false,
    silent: true,
  };
  setInterval(() => {
    try {
      if (!isBusy) {
        isBusy = true;
        const { stdout, code } = shelljs.exec("git pull", config);
        if (code == 0 && stdout.indexOf("Already up to date.") == -1) {
          shelljs.exec("npm i s", config);
          shelljs.exec("pm2 restart all", { async: true });
        }
        isBusy = false;
      }
    } catch (e) {
      console.trace(e);
    }
  }, 5000);
};
