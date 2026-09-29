const crypto = require('crypto');

const SITE = 'https://musubi-kakeizu.vercel.app';
const TIMEREX = 'https://timerex.net/s/w.closet.k8114_1f8a/95f54795';
const PLANS = {
  entry:    { name: 'エントリープラン',             price: '150,000円（税別）', link: 'https://buy.stripe.com/test_aFacN5fFRcSBgnY53m6g80S' },
  standard: { name: 'スタンダードプラン',           price: '398,000円（税別）', link: 'https://buy.stripe.com/test_28EeVdbpB8Cl9ZAeDW6g80T' },
  heritage: { name: '継承プラン',                    price: '500,000円（税別）', link: 'https://buy.stripe.com/test_6oU3cv79l7yh0p0eDW6g80V' },
  monitor:  { name: 'スタンダードプラン（モニター）', price: '300,000円（税別）', link: 'https://buy.stripe.com/test_aFa6oH51d05PgnYfI06g80U' },
};

async function rawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
  return Buffer.concat(chunks);
}

function safeEq(a, b) {
  const x = Buffer.from(a || ''), y = Buffer.from(b || '');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function sign(userId) {
  return crypto.createHmac('sha256', process.env.APP_SECRET || '').update(userId).digest('hex').slice(0, 24);
}
function makeToken(userId) { return `${userId}.${sign(userId)}`; }
function readToken(t) {
  const [u, s] = String(t || '').split('.');
  if (!u || !/^U[0-9a-f]{32}$/.test(u)) return null;
  return safeEq(s, sign(u)) ? u : null;
}

async function lineCall(path, body) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) { console.warn('LINE token not set'); return { ok: false }; }
  const r = await fetch(`https://api.line.me/v2/bot/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.error('LINE API', path, r.status, await r.text());
  return r;
}
const reply = (replyToken, messages) => lineCall('message/reply', { replyToken, messages });
const push = (to, messages) => to ? lineCall('message/push', { to, messages }) : Promise.resolve();
const notifyAdmin = (text) => push(process.env.ADMIN_LINE_USER_ID, [{ type: 'text', text: text.slice(0, 4900) }]);

module.exports = { SITE, TIMEREX, PLANS, rawBody, safeEq, makeToken, readToken, reply, push, notifyAdmin };
