const crypto = require('crypto');
const { SITE, PLANS } = require('./_lib');

/** 請求書。申込みのときに署名つきのリンクを作り、開くとその場で請求書を表示する（印刷→PDF保存できる）。
 *  中身はリンクに入っていて、署名が合わないと表示しない（金額や宛名を書きかえられないように）。 */
const NET = { hajimari: 69800, hikitoki: 98000, tsumugi: 198000, entry: 150000, standard: 398000, heritage: 500000, monitor: 300000 };
const DESC = {
  hajimari: '直系4代前までの家系図／PDF納品',
  hikitoki: '直系4代前まで／和紙印刷A3＋PDF／解説書',
  tsumugi: '5〜7代前まで／和紙印刷A3＋PDF／解説書／解説セッション（Zoom30分）／動画（約30秒）',
  entry: '直系4代前まで／データ納品／解説書／読み解きセッション（Zoom45分）／動画（約30秒）',
  standard: '5〜7代前までの調査／A3証書ファイル／解説書／ポイント解説（Zoom約90分）／動画（約1分半）',
  heritage: 'スタンダードの内容＋家紋の額装＋ヒストリー動画（約3分）',
  monitor: 'スタンダードプランの内容（モニター価格・お届け後にご感想をいただく条件）',
};

const sig = (s) => crypto.createHmac('sha256', process.env.APP_SECRET || '').update('inv:' + s).digest('hex').slice(0, 24);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

function jst(d) { const x = new Date(d.getTime() + 9 * 3600e3); return `${x.getUTCFullYear()}年${x.getUTCMonth() + 1}月${x.getUTCDate()}日`; }

function invoiceUrl({ no, plan, company, title, name }) {
  const d = b64({ no, plan, c: company || '', t: title || '', n: name || '', at: Date.now() });
  return `${SITE}/api/invoice?d=${d}&s=${sig(d)}`;
}

const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yen = (n) => n.toLocaleString('ja-JP');

function render(o) {
  const net = NET[o.plan], tax = Math.round(net * 0.1), total = net + tax;
  const issued = new Date(o.at), due = new Date(o.at + 14 * 86400e3);
  const to = o.c
    ? `${esc(o.c)}<small>${o.t ? esc(o.t) + '　' : ''}${esc(o.n)} 様</small>`
    : `${esc(o.n)} 様`;
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>請求書 ${esc(o.no)}｜結び 家系図</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@600;700&display=swap">
<style>
@page{size:A4;margin:0}
body{margin:0;background:#E9E6DF;font-family:"Noto Sans JP",sans-serif;color:#1C2340;font-size:10.5pt}
.sheet{background:#fff;width:210mm;min-height:297mm;margin:16px auto;box-sizing:border-box;padding:18mm;box-shadow:0 2px 12px rgba(0,0,0,.12)}
h1{font-family:"Noto Serif JP",serif;letter-spacing:.6em;text-align:center;font-size:24pt;margin:0 0 8mm;border-bottom:2px solid #AD8A3F;padding-bottom:4mm}
.top{display:flex;justify-content:space-between;gap:10mm}
.to{font-size:13pt;border-bottom:1px solid #1C2340;padding-bottom:2mm;min-width:85mm}.to small{font-size:10pt;display:block}
.meta{text-align:right;font-size:9.5pt;line-height:1.8}
.from{margin-top:6mm;text-align:right;font-size:9.5pt;line-height:1.7}.from b{font-size:12pt;font-family:"Noto Serif JP",serif}
.total{margin:8mm 0 6mm;display:flex;align-items:center;border:2px solid #1C2340}
.total span{background:#1C2340;color:#fff;padding:3mm 6mm;font-weight:700;letter-spacing:.2em}
.total b{font-size:18pt;padding:0 6mm 0 8mm;font-family:"Noto Serif JP",serif}
table{width:100%;border-collapse:collapse}
th{background:#F3EEE2;border:1px solid #CBBF9F;padding:2.2mm;font-size:9.5pt}
td{border:1px solid #CBBF9F;padding:2.6mm}td.n{text-align:right;white-space:nowrap}
.sum td{border:none;padding:1.5mm 2.6mm}.sum td:first-child{text-align:right;width:75%}
.box{margin-top:7mm;border:1px solid #CBBF9F;padding:4mm 5mm;line-height:1.8}.box h3{margin:0 0 2mm;font-size:10.5pt;color:#8A6D2E}
.foot{margin-top:6mm;font-size:8.5pt;color:#4A4F63;line-height:1.7}
.bar{text-align:center;margin:16px}.bar button{background:#1C2340;color:#fff;border:0;padding:14px 28px;font-size:15px;font-weight:700;letter-spacing:.1em;cursor:pointer}
.bar p{font-size:12px;color:#4A4F63;margin:8px 0 0}
@media screen and (max-width:820px){.sheet{zoom:.46}}
@media print{body{background:#fff}.sheet{margin:0;box-shadow:none;zoom:1}.bar{display:none}}
</style></head><body>
<div class="bar"><button onclick="print()">PDFで保存・印刷する</button><p>印刷の画面で「PDFに保存」を選ぶと、PDFで保存できます。</p></div>
<div class="sheet">
<h1>請求書</h1>
<div class="top">
 <div><div class="to">${to}</div><p style="margin:4mm 0 0;font-size:9.5pt">下記のとおりご請求申し上げます。</p></div>
 <div class="meta">請求書番号：${esc(o.no)}<br>発行日：${jst(issued)}<br>お支払い期限：${jst(due)}</div>
</div>
<div class="from"><b>結び 家系図</b><br>代表　土屋 千穂<br>〒105-6234 東京都港区愛宕2丁目5-1<br>愛宕グリーンヒルズMORIタワー34階<br>w.closet.k8114@gmail.com</div>
<div class="total"><span>ご請求金額</span><b>¥${yen(total)}-</b><small>（税込）</small></div>
<table>
<tr><th style="width:52%">品目</th><th>数量</th><th>単価（税別）</th><th>金額（税別）</th></tr>
<tr><td>本格家系図作成　${esc(PLANS[o.plan].name)}<br><small style="color:#4A4F63">${esc(DESC[o.plan])}</small></td><td class="n">1式</td><td class="n">${yen(net)}</td><td class="n">${yen(net)}</td></tr>
<tr><td style="height:9mm"></td><td></td><td></td><td></td></tr>
</table>
<table class="sum" style="margin-top:2mm">
<tr><td>小計（税別）</td><td class="n">¥${yen(net)}</td></tr>
<tr><td>消費税（10%）</td><td class="n">¥${yen(tax)}</td></tr>
<tr><td><b>合計（税込）</b></td><td class="n"><b>¥${yen(total)}</b></td></tr>
</table>
<div class="box"><h3>お振込先</h3>ゆうちょ銀行　〇〇八（ゼロゼロハチ）支店<br>普通　2311733<br>口座名義：ツチヤ　チホ<br>
<small>※恐れ入りますが、お振込手数料はご負担頂きますようお願い申し上げます。</small></div>
<div class="foot">・戸籍の取得にかかる役所の手数料・郵送費は実費として、別途ご請求いたします。<br>・お振込みを確認しだい、委任状と返信用封筒をお送りし、調査を開始します。<br>・戸籍の取り寄せに着手する前（委任状のご返送前）のキャンセルは、全額返金いたします。</div>
</div></body></html>`;
}

module.exports = async (req, res) => {
  const u = new URL(req.url, SITE);
  const d = u.searchParams.get('d') || '', s = u.searchParams.get('s') || '';
  let o = null;
  if (d && s && s.length === 24 && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(sig(d)))) {
    try { o = JSON.parse(Buffer.from(d, 'base64url').toString('utf8')); } catch {}
  }
  if (!o || !NET[o.plan]) { res.statusCode = 404; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end('この請求書は表示できません。公式LINEでお問い合わせください。'); }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(render(o));
};
module.exports.invoiceUrl = invoiceUrl;
