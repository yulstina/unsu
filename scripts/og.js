/* 카톡·SNS 미리보기 이미지(og.jpg)와 홈 화면 아이콘 생성 — 실행: npx -y playwright@1 install chromium && node scripts/og.js */
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const ROOT = __dirname + '/..';
  const figs = fs.readFileSync(ROOT + '/src/figures.js', 'utf8');
  const rend = fs.readFileSync(ROOT + '/src/render.js', 'utf8');
  const stars = Array.from({ length: 90 }, () => { const x = Math.random() * 1200, y = Math.random() * 420, r = Math.random() * 1.3 + .4, o = Math.random() * .6 + .25; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#e2f0ff" opacity="${o.toFixed(2)}"/>`; }).join('');
  const html = `<html><head><style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;overflow:hidden;background:#05060f;font-family:'Noto Sans CJK KR','Noto Sans CJK JP',sans-serif;color:#d8ecf8;position:relative}
  .aur{position:absolute;inset:0;background:
    radial-gradient(38% 70% at 12% 110%,rgba(102,58,243,.75),transparent 70%),
    radial-gradient(30% 60% at 42% 115%,rgba(214,92,214,.45),transparent 70%),
    radial-gradient(34% 75% at 68% 112%,rgba(61,214,190,.55),transparent 70%),
    radial-gradient(30% 70% at 92% 110%,rgba(88,140,255,.6),transparent 70%);filter:blur(6px)}
  .rays{position:absolute;left:0;right:0;bottom:0;height:360px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 2px,transparent 2px 22px);-webkit-mask-image:linear-gradient(0deg,#000,transparent)}
  svg.st{position:absolute;inset:0}
  .l{position:absolute;left:84px;top:92px;width:640px}
  .brand{display:flex;align-items:center;gap:14px;font-size:34px;font-weight:500;color:#fff}
  .brand small{font-family:'Noto Serif CJK KR',serif;font-size:20px;letter-spacing:.2em;color:#9da7ba;font-weight:700}
  h1{margin-top:44px;font-size:74px;line-height:1.18;font-weight:700;letter-spacing:-.02em;color:#f2f8ff}
  p{margin-top:28px;font-size:27px;color:#c7d3ea;letter-spacing:-.01em}
  .url{margin-top:44px;display:inline-flex;align-items:center;gap:10px;font-size:22px;color:#fff;padding:12px 22px;border-radius:999px;background:rgba(102,58,243,.9);font-weight:500}
  .fig{position:absolute;right:40px;top:70px;width:470px;height:470px}
  .fig svg{width:100%;height:100%}
  .hj{position:absolute;right:92px;bottom:54px;font-family:'Noto Serif CJK KR',serif;font-weight:700;font-size:26px;letter-spacing:.35em;color:rgba(216,236,248,.75)}
  </style></head><body>
  <div class="aur"></div><div class="rays"></div>
  <svg class="st" viewBox="0 0 1200 630">${stars}</svg>
  <div class="l">
    <div class="brand"><svg width="44" height="44" viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="none" stroke="#d1e4fa" stroke-width="1.4" opacity=".6"/><circle cx="20" cy="9" r="2.4" fill="#fff"/><circle cx="30" cy="26" r="1.8" fill="#98c0ef"/><circle cx="10" cy="26" r="1.8" fill="#98c0ef"/><path d="M20 9 L30 26 L10 26 Z" fill="none" stroke="#98c0ef" stroke-width=".9" opacity=".8"/></svg>운수<small>運數</small></div>
    <h1>내 사주로 여는<br>오늘의 운세</h1>
    <p>만세력 사주 풀이 · 오늘의 운세 · 궁합 · 행운 번호</p>
    <div class="url">생년월일만 넣으면 30초 · unsu.vercel.app</div>
  </div>
  <div class="fig" id="fig"></div>
  <div class="hj">丙午 · 붉은 말의 해</div>
  <script>${figs}\n${rend}; document.getElementById('fig').innerHTML = figSVG('말','fire');</script>
  </body></html>`;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{ width:1200, height:630 }, deviceScaleFactor:1 });
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: ROOT + '/public/og.jpg', type:'jpeg', quality:82 });
  // icons
  const svg = fs.readFileSync(ROOT + '/public/icon.svg', 'utf8');
  for (const [name, size] of [['icon-512', 512], ['icon-192', 192], ['apple-touch-icon', 180]]){
    const q = await b.newPage({ viewport:{ width:size, height:size } });
    await q.setContent(`<html><body style="margin:0;background:#05060f">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    await q.screenshot({ path: ROOT + `/public/icons/${name}.png`, omitBackground:false });
  }
  await b.close();
  for (const f of ['og.jpg','icons/icon-512.png','icons/icon-192.png','icons/apple-touch-icon.png']) console.log(f, fs.statSync(ROOT + '/public/' + f).size);
})();
