/**
 * GET /api/og?r=code — 결과 공유 링크의 미리보기 이미지(1200×630 PNG)
 * 링크 코드로 서버에서 같은 계산을 다시 해서 "정리된 결과 카드"를 그린다(점수 · 번호 · 궁합 점수).
 * 주소에 들어온 글자를 그대로 그리지 않고 코드에서 계산한 값만 그리므로, 임의 문구를 넣은 이미지를 만들 수 없다.
 */
const fs = require('fs');
const path = require('path');
const core = require('./_lib/core.js');
const A = n => path.join(__dirname, '_assets', n);
let font = null; const imgs = {};
const png = n => imgs[n] || (imgs[n] = 'data:image/png;base64,' + fs.readFileSync(A(n + '.png')).toString('base64'));
const h = (style, children, type) => ({ type: type || 'div', props: { style: Object.assign({ display: 'flex' }, style), children } });
const tierCol = v => v >= 80 ? '#f5d48a' : v >= 60 ? '#c9b9ff' : v >= 40 ? '#8fe3d0' : '#ff9aa5';
const ballCol = n => n <= 10 ? ['#ffe27a', '#e0a800'] : n <= 20 ? ['#a5e2ff', '#3a9fd0'] : n <= 30 ? ['#ffb0b0', '#d85a5a'] : n <= 40 ? ['#dcdcdc', '#8a8a8a'] : ['#d8f07e', '#86ad27'];
function rnd(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function tree(c) {
  const r = rnd(c.kicker.length * 7919 + 13), stars = [];
  for (let i = 0; i < 46; i++) { const s = 2 + r() * 4; stars.push(h({ position: 'absolute', left: r() * 1200, top: r() * 630, width: s, height: s, borderRadius: 9, background: '#fff', opacity: .2 + r() * .55 })); }
  const body = [];
  body.push(h({ fontSize: 34, color: '#d9d1ff' }, c.kicker));
  const F = (c.head.length > 26 || (c.rows && c.rows.length > 1 && c.head.length > 15)) ? 46 : 58;   /* 두 줄까지만, 길면 글자를 줄인다 */
  body.push(h({ fontSize: F, color: '#fff', lineHeight: 1.25, marginTop: 12, letterSpacing: '-0.02em', maxHeight: Math.ceil(F * 1.25 * 2) + 4, overflow: 'hidden' }, c.head));
  if (c.tag) body.push(h({ marginTop: 22 }, [h({ fontSize: 28, color: '#2a1c00', background: '#f5d48a', padding: '8px 24px', borderRadius: 999 }, c.tag)]));
  if (c.nums) body.push(h({ marginTop: 30, gap: 14 }, c.nums.map(n => h({ width: 92, height: 92, borderRadius: 999, alignItems: 'center', justifyContent: 'center', fontSize: 44, color: '#2a2140',
    backgroundImage: 'linear-gradient(145deg,' + ballCol(n)[0] + ',' + ballCol(n)[1] + ')', boxShadow: '0 8px 18px rgba(8,4,40,.45)' }, String(n)))));
  if (c.rows) body.push(h({ flexDirection: 'column', marginTop: 26, gap: c.rows.length > 1 ? 14 : 0, width: 640 }, c.rows.map(rw => h({ alignItems: 'center', gap: 20 }, [
    h({ width: c.rows.length > 1 ? 120 : 190, fontSize: 30, color: '#e6e1f7' }, rw[0]),
    h({ flexGrow: 1, height: 16, borderRadius: 8, background: 'rgba(255,255,255,.16)' }, [h({ width: Math.max(4, Math.min(100, rw[1])) + '%', height: 16, borderRadius: 8, background: tierCol(rw[1]) })]),
    h({ width: 112, justifyContent: 'flex-end', fontSize: 42, color: tierCol(rw[1]) }, rw[1] + '점')
  ]))));
  const art = c.kind === 'g' ? 'uj-hands' : c.kind === 'n' ? 'u-ball' : 'u-happy';
  return h({ width: 1200, height: 630, position: 'relative', fontFamily: 'Pretendard', backgroundImage: 'linear-gradient(160deg,#120d36 0%,#2b2170 58%,#4b3b9c 100%)' }, [
    ...stars,
    h({ position: 'absolute', right: -60, top: 60, width: 520, height: 520, borderRadius: 999, backgroundImage: 'radial-gradient(circle at center,rgba(255,214,120,.30),rgba(150,120,255,.14) 55%,rgba(150,120,255,0) 70%)' }),
    { type: 'img', props: { src: png(art), width: c.kind === 'g' ? 420 : 340, height: c.kind === 'g' ? 296 : 340, style: { position: 'absolute', right: c.kind === 'g' ? 36 : 70, top: c.kind === 'g' ? 150 : 128 } } },
    h({ position: 'absolute', left: 64, top: 48, fontSize: 34, color: '#fff' }, [h({}, '우니'), h({ color: '#b3a8ff' }, '조아')]),
    h({ position: 'absolute', left: 64, top: 112, width: 700, height: 400, flexDirection: 'column', justifyContent: 'center' }, body),
    h({ position: 'absolute', left: 64, bottom: 44, alignItems: 'center', gap: 20 }, [
      h({ fontSize: 28, color: '#fff', background: '#663af3', padding: '12px 28px', borderRadius: 999 }, '눌러서 결과 보기 · 내 사주도 보러 가기'),
      h({ fontSize: 24, color: '#cfc7f2' }, 'woonijoa.com')
    ])
  ]);
}

module.exports = async (req, res) => {
  const got = core.read(String((req.query && req.query.r) || ''));
  if (!got) { res.statusCode = 302; res.setHeader('Location', '/og.jpg'); return res.end(); }
  try {
    if (!font) font = fs.readFileSync(A('Pretendard-Bold.subset.otf'));
    const satori = (await import('satori')).default;
    const { Resvg } = require('@resvg/resvg-js');
    const svg = await satori(tree(got.card), { width: 1200, height: 630, fonts: [{ name: 'Pretendard', data: font, weight: 700, style: 'normal' }] });
    const buf = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 }, font: { loadSystemFonts: false } }).render().asPng();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=31536000, immutable');
    res.end(buf);
  } catch (e) {
    console.error('og', e);
    res.statusCode = 302; res.setHeader('Location', '/og.jpg'); res.end();
  }
};
module.exports.tree = tree;
