// api/webhook.js
// Telegram bot uchun webhook: /start bosilganda xush kelibsiz matni + "Ilovani ochish" tugmasini yuboradi.
// Bot tokeni Vercel'ning "Environment Variables" bo'limida BOT_TOKEN nomi bilan saqlanadi (kodda yozilmaydi).

const APP_URL = "https://pedagog-wellness.vercel.app/";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).send("OK");
    return;
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const update = req.body;
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
        "🎯 Amaliy pedagogik vaziyatlar\n\n" +
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
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
      reply_markup: replyMarkup
    })
  });
}
