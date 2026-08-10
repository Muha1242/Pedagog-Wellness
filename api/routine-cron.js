// api/routine-cron.js
// Tashqi cron xizmati (masalan cron-job.org) bu manzilni har 5 daqiqada chaqiradi:
// https://pedagog-wellness.vercel.app/api/routine-cron?secret=SIZNING_MAXFIY_SOZINGIZ
//
// Har bir foydalanuvchining "kun tartibi"ni tekshiradi, vaqti kelgan bandlar uchun
// Telegram orqali eslatma + "Bajardim" tugmasi yuboradi. Kun oxirida sarhisob yuboradi.

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const CRON_SECRET = process.env.CRON_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN;

function tashkentNowStr() {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function tashkentDateKey() {
  const d = new Date(Date.now() + 5 * 3600 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function inWindow(itemTime, nowStr, windowMin) {
  // itemTime <= nowStr < itemTime + windowMin daqiqa oralig'ida bo'lsa true
  const [ih, im] = itemTime.split(":").map(Number);
  const [nh, nm] = nowStr.split(":").map(Number);
  const itemMin = ih * 60 + im;
  const nowMin = nh * 60 + nm;
  return nowMin >= itemMin && nowMin < itemMin + windowMin;
}

async function sendTelegramMessage(chatId, text, replyMarkup) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", reply_markup: replyMarkup }),
  });
}

export default async function handler(req, res) {
  if (req.query.secret !== CRON_SECRET) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const nowStr = tashkentNowStr();
  const todayKey = tashkentDateKey();

  const listRes = await fetch(`${APPS_SCRIPT_URL}?action=list_all&secret=${encodeURIComponent(CRON_SECRET)}`);
  const listData = await listRes.json();
  if (listData.status !== "ok") {
    res.status(200).json({ processed: 0, error: "list_all failed" });
    return;
  }

  let sentCount = 0;

  for (const user of listData.users) {
    const state = user.state || {};
    const schedule = state.customRoutine || [];
    const doneToday = (state.routine && state.routine[todayKey]) || {};
    const notified = (state._notified && state._notified[todayKey]) || [];
    let notifiedChanged = false;
    const newNotified = [...notified];

    for (const item of schedule) {
      if (doneToday[item.id]) continue;
      if (notified.includes(item.id)) continue;
      if (inWindow(item.time, nowStr, 5)) {
        await sendTelegramMessage(
          user.chat_id,
          `⏰ *${item.title}*\n\nReja vaqti keldi! Bajarganingizdan so'ng pastdagi tugmani bosing.`,
          { inline_keyboard: [[{ text: "✅ Bajardim", callback_data: `rd:${item.id}:${todayKey}` }]] }
        );
        newNotified.push(item.id);
        notifiedChanged = true;
        sentCount++;
      }
    }

    // Kun sarhisobi: 21:00 - 21:05 oralig'ida, kuniga faqat 1 marta
    const summarySentToday = (state._summarySent && state._summarySent[todayKey]) || false;
    if (!summarySentToday && inWindow("21:00", nowStr, 5) && schedule.length > 0) {
      const doneCount = schedule.filter((it) => doneToday[it.id]).length;
      const total = schedule.length;
      let msg;
      if (doneCount === total) msg = `🌟 Bugun barcha ${total} ta rejangizni bajardingiz! Ajoyib intizom.`;
      else if (doneCount === 0) msg = `🤍 Bugun birorta reja bajarilmadi. Ertaga qaytadan boshlaymiz, hammasi joyida.`;
      else msg = `💪 Bugun ${doneCount}/${total} ta rejani bajardingiz. Yaxshi natija!`;
      await sendTelegramMessage(user.chat_id, `*Kun sarhisobi*\n\n${msg}`, null);
      sentCount++;

      // save_meta orqali summarySent va notified belgilarini birga saqlaymiz
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "save_meta",
          secret: CRON_SECRET,
          email: user.email,
          notified: { [todayKey]: newNotified },
          summarySent: { [todayKey]: true },
        }),
      });
    } else if (notifiedChanged) {
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "save_meta",
          secret: CRON_SECRET,
          email: user.email,
          notified: { [todayKey]: newNotified },
        }),
      });
    }
  }

  res.status(200).json({ processed: listData.users.length, sent: sentCount });
}
