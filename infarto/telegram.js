module.exports.notify = async (payload) => {
  try {
    await fetch(
      "https://api.telegram.org/bot" +
        global.externalConfig.TG_BOT_TOKEN +
        "/sendMessage?chat_id=" +
        global.externalConfig.TG_CHAT_ID +
        "parse_mode=html&text=" +
        payload
    );
  } catch (e) {
    console.error("Telegram error sending message");
    console.trace(e);
  }
};
