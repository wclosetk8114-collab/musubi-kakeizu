const crypto = require('crypto');
const { SITE, ININJO, TIMEREX, rawBody, safeEq, makeToken, reply, notifyAdmin } = require('./_lib');

const quick = {
  items: [
    { type: 'action', action: { type: 'uri', label: '無料相談を予約', uri: TIMEREX } },
    { type: 'action', action: { type: 'message', label: 'お申込み', text: '申込み' } },
    { type: 'action', action: { type: 'uri', label: '料金を見る', uri: `${SITE}/#plan` } },
    { type: 'action', action: { type: 'message', label: '委任状について', text: '委任状' } },
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
  if (/委任状/.test(t)) {
    return reply(ev.replyToken, [{
      type: 'text',
      text: '委任状は、戸籍の取り寄せを提携の行政書士に任せるための書類です。\n\nお支払いのあと、記入済みの委任状と返信用封筒をご自宅へお送りします。お名前を手書きでご署名いただき、返送するだけです。印鑑は認印で大丈夫です。\n\nご自宅で印刷できる方は、こちらから印刷して送っていただくと、少し早く進みます。',
    }, {
      type: 'template',
      altText: '委任状を印刷する',
      template: { type: 'buttons', text: '委任状（A4・印刷用）', actions: [{ type: 'uri', label: '委任状を開く', uri: ININJO }] },
      quickReply: quick,
    }]);
  }
  if (/料金|値段|価格|モニター|プラン/.test(t)) {
    return reply(ev.replyToken, [{ type: 'text', text: '■ はじまりプラン　69,800円（税別・税込76,780円）\n直系4代前までの家系図／PDF納品／納期1〜2ヶ月\n\n■ エントリープラン　150,000円（税別・税込165,000円）\nはじまりの内容＋解説書＋読み解きセッション（Zoom45分）＋動画（約30秒）／納期1〜2ヶ月\n\n■ スタンダードプラン　398,000円（税別・税込437,800円）\n5〜7代前まで／高級和紙のA3証書ファイル／解説書／ポイント解説（Zoom約90分）／動画（約1分半）／納期2〜3ヶ月\n\n■ 継承プラン　500,000円（税別・税込550,000円）\nスタンダードの内容＋家紋の額装＋ヒストリー動画（約3分）／納期3〜4ヶ月\n\n■ モニター価格（先着10名様）　300,000円（税別・税込330,000円）\nスタンダードプランを、ご感想をいただく条件でお受けします。\n\nどのプランも、戸籍の取り寄せは提携の行政書士が行います（委任状にご署名いただくだけです）。\nお支払いは、クレジットカード（一括・分割）・銀行振込からお選びいただけます。', quickReply: quick }]);
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
