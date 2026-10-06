const { PLANS, TIMEREX, rawBody, readToken, push, notifyAdmin } = require('./_lib');

const LABEL = { name: 'お名前', kana: 'ふりがな', company: '会社名', title: '役職', phone: '電話番号', email: 'メール', zip: '郵便番号', address: '住所', honseki: '本籍地（わかる範囲）', parents: 'ご両親のお名前', line: '調べたい家系', pay: 'お支払い方法', note: 'ご要望', referrer: 'ご紹介者', ref: '紹介コード' };

/** 税抜の金額。紹介料はここから計算する（台帳側で 率をかける） */
const NET = { entry: 150000, standard: 398000, heritage: 500000, monitor: 300000 };

/** 紹介の台帳に1件書く。台帳は KAKEIZ+ 側の Supabase にある。
 *
 *  **ここが無かったので紹介料が計算できなかった。**
 *  これまで申し込みは、つっちーさんのLINEに通知が飛ぶだけで、どこにも残っていなかった。
 *
 *  合言葉（REFERRAL_SECRET）が合わなければ、向こうで黙って捨てられる。
 *  失敗しても申し込み自体は止めない（お客さまを待たせない）。 */
async function logReferral(code, plan, name, email) {
  const secret = process.env.REFERRAL_SECRET;
  if (!secret || !/^P-[A-Za-z0-9]{4,12}$/.test(String(code || ''))) return;
  try {
    const r = await fetch('https://kakeiz-plus.vercel.app/api/referral/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret, code: String(code).toUpperCase(), source: 'musubi',
        plan, plan_name: (PLANS[plan] || {}).name || null, amount: NET[plan] || null,
        name: name || null, email: email || null,
      }),
    });
    if (!r.ok) console.error('referral log', r.status, await r.text());
  } catch (e) {
    console.error('referral log threw', String(e).slice(0, 200));
  }
}

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
  const PAYNAME = { invoice: '請求書（銀行振込）' };
  let payUrl = null;
  if (card) {
    const u = new URL(plan.link);
    if (userId) u.searchParams.set('client_reference_id', userId);
    if (d.email) u.searchParams.set('prefilled_email', String(d.email).trim());
    payUrl = u.toString();
  }

  const summary = Object.keys(LABEL)
    .filter((k) => String(d[k] || '').trim())
    .map((k) => `${LABEL[k]}：${k === 'pay' ? (card ? 'カード' : PAYNAME[d.pay]) : String(d[k]).trim()}`)
    .join('\n');

  const refCode = String(d.ref || '').trim().toUpperCase();
  const refLine = (String(d.referrer||'').trim() || refCode)
    ? `\n★紹介あり：${String(d.referrer||'').trim()}${refCode ? ' / ' + refCode : ''}` : '';
  await notifyAdmin(`【新しいお申込み】${refLine}\nプラン：${plan.name} ${plan.price}\n${summary}\nLINE連携：${userId ? 'あり' : 'なし'}`);

  // 紹介の台帳に残す。入金の確認と紹介料の計算は、運営コンソールの「紹介料」で行う
  await logReferral(refCode, d.plan, d.name, d.email);

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
