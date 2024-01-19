const creationTime = () => Math.round(new Date().getTime() / 1000) - 10;

const getCurrentTime = () => {
  const d = new Date();
  return `${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
};

const getCurrentDate = () => {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const getCorrectBalance = (balance) => {
  return !isNaN(balance) ? balance : balance.decimal;
};

const wait = async (timeout) => {
  return new Promise((resolve) => setTimeout(resolve, timeout));
};

const reduceBalance = (balance, prec = 6) => {
  if (balance) {
    if (balance.int) balance = balance.int;
    if (balance.decimal) balance = balance.decimal;
    if (parseFloat(balance) % 1 == 0) {
      return parseInt(balance);
    }
    return (
      Math.trunc(parseFloat(balance) * Math.pow(10, prec)) / Math.pow(10, prec)
    );
  }
  if (balance == 0) return 0;
};

module.exports = {
  reduceBalance,
  getCorrectBalance,
  creationTime,
  getCurrentDate,
  getCurrentTime,
  wait,
};
