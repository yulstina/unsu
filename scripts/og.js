/* 카톡·SNS 미리보기 이미지(og.jpg)와 홈 화면 아이콘 생성 — 실행: npm run build:site 후 node scripts/og.js, 다시 npm run build:site(og.jpg?v= 해시 갱신)
   2026-11-21: 번호 추첨 기능을 없애고 '행운 부적' 카드 + 복주머니 든 우니로 교체 */
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const ROOT = __dirname + '/..';
  const img = n => 'data:image/webp;base64,' + fs.readFileSync(ROOT + '/src/img/' + n + '.webp').toString('base64');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647; // 매번 같은 별 배치
  const stars = Array.from({ length: 80 }, () => `<circle cx="${(rnd() * 1200).toFixed(0)}" cy="${(rnd() * 630).toFixed(0)}" r="${(rnd() * 1.3 + .4).toFixed(1)}" fill="#fff" opacity="${(rnd() * .6 + .2).toFixed(2)}"/>`).join('');
  const b = await chromium.launch();

  // 2) 미리보기 카드 1200×630
  const html = `<html><head><style>
  *{margin:0;box-sizing:border-box}
  body{width:1200px;height:630px;overflow:hidden;font-family:'Pretendard','Noto Sans CJK KR',sans-serif;position:relative;letter-spacing:-.02em;background:radial-gradient(60% 80% at 78% 40%,#3b2a92,#120d36 70%)}
  svg{position:absolute;inset:0}
  .l{position:absolute;left:80px;top:84px;width:600px}
  .brand{display:flex;align-items:center;gap:12px;font-size:32px;font-weight:800;color:#fff}
  .brand em{font-style:normal;color:#b3a8ff}
  h1{margin-top:36px;font-size:66px;line-height:1.2;font-weight:800;color:#fff}
  h1 b{color:#f5d48a}
  p{margin-top:22px;font-size:27px;color:#c9c2ee;font-weight:500}
  .url{margin-top:38px;display:inline-block;padding:14px 26px;border-radius:999px;background:#6a45f0;color:#fff;font-size:23px;font-weight:700}
  .tal{position:absolute;right:250px;top:120px;width:330px;padding:28px;border-radius:28px;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 2px rgba(245,212,138,.55);display:flex;flex-direction:column;gap:14px;color:#fff;font-size:26px;font-weight:700}
  .tal small{font-size:22px;color:#d9d1ff;font-weight:500}
  .tal .ch{display:flex;gap:12px;margin-top:6px}
  .tal .ch i{font-style:normal;min-width:76px;height:68px;padding:0 14px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:36px;color:#f5d48a;background:rgba(245,212,138,.16);box-shadow:inset 0 0 0 2px #f5d48a}
  .uni{position:absolute;right:28px;bottom:-4px;width:250px;filter:drop-shadow(0 14px 22px rgba(0,0,0,.4))}
  </style></head><body>
  <svg viewBox="0 0 1200 630">${stars}</svg>
  <div class="l">
    <div class="brand"><img src="${img('u-wave')}" width="48"><span>우니<em>조아</em></span></div>
    <h1>매일 열어보는<br>나만의 <b>행운 부적</b></h1>
    <p>내 사주로 알려 주는 오늘의 색 · 방향 · 숫자</p>
    <div class="url">생년월일만 넣으면 무료 · woonijoa.com</div>
  </div>
  <div class="tal"><small>오늘의 행운 부적</small><b>행운의 색 · 초록</b><b>행운의 방향 · 동쪽</b><b>행운의 숫자 · 3 · 8 · 23</b></div><img class="uni" src="${img('u-pouch')}">
  </body></html>`;
  const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await p.setContent(html); await p.waitForTimeout(300);
  const fonts = await p.evaluate(() => document.fonts.check('800 66px Pretendard'));
  if (!fonts) console.warn('⚠ Pretendard 글꼴이 이 PC에 없어 대체 글꼴로 그려졌습니다. Pretendard 설치 후 다시 실행하세요.');
  await p.screenshot({ path: ROOT + '/public/og.jpg', type: 'jpeg', quality: 86 });

  // icons — 2026-11-15부터 우니조아 앱 아이콘 PNG(docs/brand/woonijoa-app-icon.png)가 원본
  const iconSrc = 'data:image/png;base64,' + fs.readFileSync(ROOT + '/docs/brand/woonijoa-app-icon.png').toString('base64');
  for (const [name, size] of [['icon-512', 512], ['icon-192', 192], ['apple-touch-icon', 180], ['favicon-32', 32]]){
    const q = await b.newPage({ viewport: { width: size, height: size } });
    await q.setContent(`<html><body style="margin:0;background:#05060f"><img src="${iconSrc}" width="${size}" height="${size}" style="display:block"></body></html>`);
    await q.screenshot({ path: ROOT + `/public/icons/${name}.png`, omitBackground: false });
  }
  await b.close();
  for (const f of ['og.jpg', 'icons/icon-512.png', 'icons/icon-192.png', 'icons/apple-touch-icon.png']) console.log(f, fs.statSync(ROOT + '/public/' + f).size);
})();
