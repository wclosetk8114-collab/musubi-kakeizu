const { rawBody, notifyAdmin } = require('./_lib');
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTのみ' });
  let email = '';
  try { email = String(JSON.parse((await rawBody(req)).toString('utf8')).email || '').trim().toLowerCase(); } catch {}
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 200) return res.status(400).json({ error: 'メールアドレスを確認してください。' });
  console.log('UNSUBSCRIBE', email, new Date().toISOString());
  await notifyAdmin(`【配信停止】\n${email}\n今後のメール配信リストから外してください。`);
  res.status(200).json({ ok: true });
};
