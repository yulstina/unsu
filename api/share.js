/**
 * GET /s/:code (vercel.json rewrite → /api/share?r=code) — 결과 공유 링크
 * 앱 화면(public/index.html)을 그대로 내려주되, 카톡·문자·SNS 링크 미리보기가 "그 사람의 결과 카드"로 보이도록
 * og:title · og:description · og:image(/api/og) 만 바꿔 끼운다. 화면 쪽은 app.js 가 주소의 코드를 읽어 결과를 그린다.
 */
const fs = require('fs');
const path = require('path');
const core = require('./_lib/core.js');
let page = null;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const setMeta = (html, attr, key, val) => html.replace(new RegExp('(<meta ' + attr + '="' + key + '" content=")[^"]*(")'), (m, a, b) => a + esc(val) + b);

module.exports = (req, res) => {
  if (!page) page = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  const code = String((req.query && req.query.r) || '');
  const got = core.read(code);
  /* 주소가 /s/코드 라서 상대 경로(img/…)가 /s/img/… 로 풀리지 않게 기준 주소를 루트로 고정 */
  let html = page.replace('<head>', '<head>\n<base href="/">');
  if (got) {
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'woonijoa.com';
    const origin = 'https://' + host, c = got.card;
    const title = c.title + ' | 우니조아', desc = c.desc + ' · 눌러서 결과를 보고, 내 사주도 바로 확인해 보세요.';
    const img = origin + '/api/og?r=' + code;
    html = html.replace(/<title>[^<]*<\/title>/, '<title>' + esc(title) + '</title><meta name="robots" content="noindex">');
    [['property', 'og:title', title], ['property', 'og:description', desc], ['property', 'og:url', origin + '/s/' + code], ['property', 'og:image', img],
      ['property', 'og:image:alt', c.title + ' 결과 카드'], ['name', 'twitter:title', title], ['name', 'twitter:description', desc], ['name', 'twitter:image', img]
    ].forEach(m => { html = setMeta(html, m[0], m[1], m[2]); });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.statusCode = 200;
  res.end(html);
};
