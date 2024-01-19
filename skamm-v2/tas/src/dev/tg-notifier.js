global.lastMessage = "";

module.exports.notify = async (payload) => {
  payload = `${global.config.tag} ${payload}`;
  const telegram =
    "https://api.telegram.org/bot" +
    global.config.tgBotToken +
    "/sendMessage?chat_id=" +
    global.config.tgChatId +
    "parse_mode=html&text=";
  if (global.config.debugActive) console.log(telegram + payload);
  if (!global.config.testMode) {
    if (global.lastMessage != payload) {
      global.lastMessage = payload;
      global.get(telegram + payload, "json").catch((e) => {
        global.log("[tg-notifier.js::notify] catch: " + e);
        console.trace(e);
      });
    }
  }
};
