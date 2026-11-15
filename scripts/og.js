/* 카톡·SNS 미리보기 이미지(og.jpg)와 홈 화면 아이콘 생성 — 실행: npx -y playwright@1 install chromium && node scripts/og.js */
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const ROOT = __dirname + '/..';
  const uniB64 = n => 'data:image/webp;base64,' + fs.readFileSync(ROOT + '/src/img/' + n + '.webp').toString('base64');
  const figs = fs.readFileSync(ROOT + '/src/figures.js', 'utf8');
  const rend = fs.readFileSync(ROOT + '/src/render.js', 'utf8');
  const stars = Array.from({ length: 90 }, () => { const x = Math.random() * 1200, y = Math.random() * 420, r = Math.random() * 1.3 + .4, o = Math.random() * .6 + .25; return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#e2f0ff" opacity="${o.toFixed(2)}"/>`; }).join('');
  const html = `<html><head><style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;overflow:hidden;background:#0d0b1e;font-family:'Pretendard','Noto Sans CJK KR','Noto Sans CJK JP',sans-serif;color:#d8ecf8;position:relative}
  .aur{position:absolute;inset:0;background:
    radial-gradient(38% 70% at 12% 110%,rgba(170,160,240,.6),transparent 70%),
    radial-gradient(30% 60% at 42% 115%,rgba(226,178,226,.4),transparent 70%),
    radial-gradient(34% 75% at 68% 112%,rgba(160,222,206,.4),transparent 70%),
    radial-gradient(30% 70% at 92% 110%,rgba(160,190,236,.5),transparent 70%);filter:blur(6px)}
  .rays{position:absolute;left:0;right:0;bottom:0;height:360px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 2px,transparent 2px 22px);-webkit-mask-image:linear-gradient(0deg,#000,transparent)}
  svg.st{position:absolute;inset:0}
  .l{position:absolute;left:84px;top:92px;width:640px}
  .brand{display:flex;align-items:center;gap:14px;font-size:34px;font-weight:500;color:#fff}
  .brand small{font-family:'Noto Serif CJK KR',serif;font-size:20px;letter-spacing:.2em;color:#9da7ba;font-weight:700}
  h1{margin-top:44px;font-size:74px;line-height:1.18;font-weight:700;letter-spacing:-.02em;color:#f2f8ff}
  p{margin-top:28px;font-size:27px;color:#c7d3ea;letter-spacing:-.01em}
  .url{margin-top:44px;display:inline-flex;align-items:center;gap:10px;font-size:22px;color:#fff;padding:12px 22px;border-radius:999px;background:rgba(102,58,243,.9);font-weight:500}
  .fig{position:absolute;right:40px;top:70px;width:470px;height:470px}
  .fig img{width:100%;height:100%;filter:drop-shadow(0 30px 40px rgba(40,10,100,.55))}
  .glow{position:absolute;right:20px;top:60px;width:520px;height:520px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,214,120,.35),rgba(150,120,255,.18) 55%,transparent)}
  .brand em{font-style:normal;color:#b3a8ff}
  .brand span{font-weight:800;letter-spacing:-.03em}
  .hj{position:absolute;right:92px;bottom:54px;font-family:'Pretendard',sans-serif;font-weight:700;font-size:26px;letter-spacing:.35em;color:rgba(216,236,248,.75)}
  </style></head><body>
  <div class="aur"></div><div class="rays"></div>
  <svg class="st" viewBox="0 0 1200 630">${stars}</svg>
  <div class="l">
    <div class="brand"><img src="${uniB64('u-calm')}" width="52" height="52"><span>우니<em>조아</em></span></div>
    <h1>내 사주로 뽑는<br>여섯 개의 행운 번호</h1>
    <p>오늘의 운세 · 꿈 해몽 · 궁합 · 2027 신년운세</p>
    <div class="url">생년월일만 넣으면 무료 · woonijoa.com</div>
  </div>
  <div class="glow"></div><div class="fig"><img src="${uniB64('u-ball')}"></div>
  <div class="hj">2027 丁未 · 붉은 양의 해</div>
  </body></html>`;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{ width:1200, height:630 }, deviceScaleFactor:1 });
  await p.setContent(html); await p.waitForTimeout(300);
  await p.screenshot({ path: ROOT + '/public/og.jpg', type:'jpeg', quality:82 });
  // icons — 2026-11-15부터 우니조아 앱 아이콘 PNG(docs/brand/woonijoa-app-icon.png)가 원본
  const iconSrc = 'data:image/png;base64,' + fs.readFileSync(ROOT + '/docs/brand/woonijoa-app-icon.png').toString('base64');
  for (const [name, size] of [['icon-512', 512], ['icon-192', 192], ['apple-touch-icon', 180], ['favicon-32', 32]]){
    const q = await b.newPage({ viewport:{ width:size, height:size } });
    await q.setContent(`<html><body style="margin:0;background:#05060f"><img src="${iconSrc}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await q.screenshot({ path: ROOT + `/public/icons/${name}.png`, omitBackground:false });
  }
  await b.close();
  for (const f of ['og.jpg','icons/icon-512.png','icons/icon-192.png','icons/apple-touch-icon.png']) console.log(f, fs.statSync(ROOT + '/public/' + f).size);
})();
