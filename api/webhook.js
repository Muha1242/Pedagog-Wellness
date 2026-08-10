// api/webhook.js
// Telegram bot uchun webhook: /start bosilganda xush kelibsiz matni,
// va "Bajardim" inline tugmasi bosilganda kun tartibi bandini bajarilgan deb belgilaydi.

const APP_URL = "https://pedagog-wellness.vercel.app/";
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).send("OK");
    return;
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const update = req.body;

  // "Bajardim" tugmasi bosilganda
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId = cq.from.id;
    const data = cq.data || "";

    if (data.startsWith("rd:")) {
      const [, itemId, dateKey] = data.split(":");
      try {
        await fetch(APPS_SCRIPT_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "mark_routine_done",
            secret: CRON_SECRET,
            chat_id: chatId,
            itemId,
            dateKey,
          }),
        });
      } catch (e) {}
      await answerCallback(BOT_TOKEN, cq.id, "Ajoyib! Bajarilgan deb belgilandi ✅");
      await editMessageText(BOT_TOKEN, chatId, cq.message.message_id, cq.message.text + "\n\n✅ *Bajarildi!*");
    } else {
      await answerCallback(BOT_TOKEN, cq.id, "");
    }
    res.status(200).send("OK");
    return;
  }

  const message = update.message;
  if (message && message.text) {
    const chatId = message.chat.id;
    const text = message.text.trim();

    if (text === "/start") {
      await sendMessage(BOT_TOKEN, chatId,
        "🌸 *Pedagog Wellness*ga xush kelibsiz!\n\n" +
        "Bu — o'qituvchilar uchun emotsional salomatlik ilovasi:\n\n" +
        "🌿 Emotsional intellekt, kasbiy charchash va stressga bardosh testlari\n" +
        "🧘 Kunlik nafas va relaksatsiya mashqlari\n" +
        "🎯 Amaliy pedagogik vaziyatlar\n" +
        "🗓️ Shaxsiy kun tartibi va eslatmalar\n\n" +
        "Boshlash uchun pastdagi tugmani bosing 👇",
        {
          inline_keyboard: [[
            { text: "🚀 Ilovani ochish", web_app: { url: APP_URL } }
          ]]
        }
      );
    }
  }

  res.status(200).send("OK");
}

async function sendMessage(token, chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", reply_markup: replyMarkup })
  });
}
async function answerCallback(token, callbackId, text) {
  const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text })
  });
}
async function editMessageText(token, chatId, messageId, text) {
  const url = `https://api.telegram.org/bot${token}/editMessageText`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: "Markdown" })
  });
}
