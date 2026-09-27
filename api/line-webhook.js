const crypto = require('crypto');
const { SITE, TIMEREX, rawBody, safeEq, makeToken, reply, notifyAdmin } = require('./_lib');

const quick = {
  items: [
    { type: 'action', action: { type: 'uri', label: '無料相談を予約', uri: TIMEREX } },
    { type: 'action', action: { type: 'message', label: 'お申込み', text: '申込み' } },
    { type: 'action', action: { type: 'uri', label: '料金を見る', uri: `${SITE}/#plan` } },
  ],
};

function applyMessage(userId) {
  return {
    type: 'template',
    altText: 'お申込みフォームはこちら',
    template: {
      type: 'buttons',
      title: 'お申込みフォーム',
      text: 'ご本人さまの情報と、ご希望のプランをご入力ください（約3分）。',
      actions: [{ type: 'uri', label: 'フォームを開く', uri: `${SITE}/apply/?t=${makeToken(userId)}` }],
    },
  };
}

async function handle(ev) {
  const userId = ev.source && ev.source.userId;
  if (ev.type === 'follow') {
    return reply(ev.replyToken, [{
      type: 'text',
      text: '友だち追加ありがとうございます。\n結び 家系図のつっちーです。\n\n一生に一度の家系図づくりを、ご相談からお届けまでこのLINEでお手伝いします。\n\nまずは無料相談（Zoom・最大60分）で、知りたいことをお聞かせください。',
      quickReply: quick,
    }]);
  }
  if (ev.type !== 'message' || ev.message.type !== 'text') return;
  const t = ev.message.text.trim();
  if (/^管理者ID$/.test(t)) {
    return reply(ev.replyToken, [{ type: 'text', text: `あなたのIDです：\n${userId}` }]);
  }
  if (/申込|申し込/.test(t)) return reply(ev.replyToken, [applyMessage(userId)]);
  if (/相談|予約/.test(t)) {
    return reply(ev.replyToken, [{ type: 'text', text: `無料相談はこちらからご予約いただけます（Zoom・最大60分）。\n${TIMEREX}`, quickReply: quick }]);
  }
  if (/料金|値段|価格|モニター/.test(t)) {
    return reply(ev.replyToken, [{ type: 'text', text: '■ エントリープラン　150,000円（税別）\n直系4代前まで／納期1〜2ヶ月\n\n■ スタンダードプラン　398,000円（税別）\n5〜7代前まで／A3証書ファイル／ポイント解説／納期2〜3ヶ月\n\n■ モニター価格（先着10名様）　300,000円（税別）\nスタンダードプランを、ご感想をいただく条件でお受けします。', quickReply: quick }]);
  }
  await notifyAdmin(`【LINEメッセージ】\n${t}`);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('ok');
  const body = await rawBody(req);
  const sig = crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET || '').update(body).digest('base64');
  if (!process.env.LINE_CHANNEL_SECRET || !safeEq(sig, req.headers['x-line-signature'])) return res.status(401).send('bad signature');
  const { events = [] } = JSON.parse(body.toString('utf8') || '{}');
  await Promise.all(events.map((e) => handle(e).catch((err) => console.error(err))));
  res.status(200).send('ok');
};
