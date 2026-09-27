const crypto = require('crypto');
const { rawBody, safeEq, push, notifyAdmin } = require('./_lib');

function verify(body, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 600) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${body.toString('utf8')}`).digest('hex');
  return header.split(',').some((p) => p.startsWith('v1=') && safeEq(p.slice(3), expected));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('POST only');
  const body = await rawBody(req);
  if (!verify(body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)) return res.status(400).send('bad signature');
  const ev = JSON.parse(body.toString('utf8'));
  if (ev.type === 'checkout.session.completed') {
    const s = ev.data.object;
    const userId = s.client_reference_id;
    const name = (s.customer_details && s.customer_details.name) || '';
    const amount = (s.amount_total || 0).toLocaleString('ja-JP');
    await notifyAdmin(`【お支払い完了】\n${name}さま　${amount}円（税込）\nメール：${(s.customer_details && s.customer_details.email) || ''}\nLINE連携：${userId ? 'あり' : 'なし'}`);
    if (userId && /^U[0-9a-f]{32}$/.test(userId)) {
      await push(userId, [{
        type: 'text',
        text: `${name ? name + 'さま\n' : ''}お支払いを確認しました。ありがとうございます。\n\n次は委任状です。\n記入済みの委任状と返信用封筒を、ご登録の住所へ郵送します。届いたらご署名のうえ、返信用封筒でお送りください。\n\n戸籍の取り寄せは提携の行政書士が行います。進み具合は、このLINEでお知らせします。`,
      }]);
    }
  }
  res.status(200).json({ received: true });
};
