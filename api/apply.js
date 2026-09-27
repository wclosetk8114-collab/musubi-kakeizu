const { PLANS, TIMEREX, rawBody, readToken, push, notifyAdmin } = require('./_lib');

const LABEL = { name: 'お名前', kana: 'ふりがな', company: '会社名', title: '役職', phone: '電話番号', email: 'メール', zip: '郵便番号', address: '住所', honseki: '本籍地（わかる範囲）', parents: 'ご両親のお名前', line: '調べたい家系', pay: 'お支払い方法', note: 'ご要望' };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTのみ' });
  let d;
  try { d = JSON.parse((await rawBody(req)).toString('utf8')); } catch { return res.status(400).json({ error: '送信内容を読み取れませんでした。もう一度お試しください。' }); }
  const userId = readToken(d.t);
  const plan = PLANS[d.plan];
  for (const k of ['name', 'kana', 'phone', 'email', 'zip', 'address']) {
    if (!String(d[k] || '').trim()) return res.status(400).json({ error: `${LABEL[k]}を入力してください。` });
  }
  if (!plan) return res.status(400).json({ error: 'プランを選んでください。' });
  if (!d.agree) return res.status(400).json({ error: '個人情報の取り扱いへの同意にチェックを入れてください。' });

  const card = d.pay !== 'invoice';
  let payUrl = null;
  if (card) {
    const u = new URL(plan.link);
    if (userId) u.searchParams.set('client_reference_id', userId);
    if (d.email) u.searchParams.set('prefilled_email', String(d.email).trim());
    payUrl = u.toString();
  }

  const summary = Object.keys(LABEL)
    .filter((k) => String(d[k] || '').trim())
    .map((k) => `${LABEL[k]}：${k === 'pay' ? (card ? 'カード' : '請求書（銀行振込）') : String(d[k]).trim()}`)
    .join('\n');

  await notifyAdmin(`【新しいお申込み】\nプラン：${plan.name} ${plan.price}\n${summary}\nLINE連携：${userId ? 'あり' : 'なし'}`);

  if (userId) {
    const msgs = [{ type: 'text', text: `${String(d.name).trim()}さま\nお申込みありがとうございます。\n\nプラン：${plan.name}\n金額：${plan.price}` }];
    if (card) {
      msgs.push({ type: 'template', altText: 'お支払いはこちら', template: { type: 'buttons', text: 'こちらからカードでお支払いいただけます。お支払いが確認できしだい、委任状をお送りします。', actions: [{ type: 'uri', label: 'お支払いへ進む', uri: payUrl }] } });
    } else {
      msgs.push({ type: 'text', text: '請求書をこのLINEで2営業日以内にお送りします。お振込みが確認できしだい、委任状をお送りします。' });
    }
    await push(userId, msgs);
  }
  res.status(200).json({ ok: true, payUrl, linked: !!userId });
};
