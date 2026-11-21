/* src/ → public/ 빌드: index.html + css/style.css + js/*.js 로 분리·압축
   실행: npm install && npm run build:site  (og 이미지·아이콘은 scripts/og.js) */
const fs = require('fs');
const crypto = require('crypto');
const ver = s => crypto.createHash('md5').update(s).digest('hex').slice(0, 8);
const path = require('path');
const { minify } = require('terser');
const CleanCSS = require('clean-css');
const ROOT = path.join(__dirname, '..');
const r = f => fs.readFileSync(path.join(ROOT, f.startsWith('node_modules') ? f : 'src/' + f), 'utf8');
const OUT = path.join(ROOT, 'public');
const SITE = 'https://woonijoa.com';
/* og.jpg가 바뀌면 주소도 바뀌게(?v=해시): 카톡·SNS가 예전 미리보기를 캐시해 두는 문제 방지 */
const OG = SITE + '/og.jpg?v=' + ver(fs.readFileSync(path.join(__dirname, '..', 'public', 'og.jpg')));

(async () => {
  ['css', 'js', 'icons', 'img'].forEach(d => fs.mkdirSync(path.join(OUT, d), { recursive: true }));
  /* src/img/* → public/img/* (배너 등 정적 이미지) */
  if (fs.existsSync(path.join(ROOT, 'src/img'))) for (const f of fs.readdirSync(path.join(ROOT, 'src/img'))) fs.copyFileSync(path.join(ROOT, 'src/img', f), path.join(OUT, 'img', f));
  const src = r('app.src.html');
  const styleStart = src.indexOf('<style>'), styleEnd = src.indexOf('</style>');
  const css = src.slice(styleStart + 7, styleEnd);
  const bodyStart = src.indexOf('<canvas id="atmosphere"');
  const scriptsStart = src.indexOf('<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap');
  const markup = src.slice(bodyStart, scriptsStart).trim();

  const cssMin = new CleanCSS({ level: 1 }).minify(css).styles;
  fs.writeFileSync(path.join(OUT, 'css/style.css'), cssMin);

  const jsOpts = { compress: { passes: 2 }, mangle: true, format: { ascii_only: false, comments: false } };
  const lunar = r('node_modules/korean-lunar-calendar/dist/korean-lunar-calendar.min.js').replace(/\/\/# sourceMappingURL=.*$/m, '').trim();
  fs.writeFileSync(path.join(OUT, 'js/lunar.js'), '/*! korean-lunar-calendar v0.4.0 | MIT License | (c) 2022 Jinil Lee */\n' + lunar + '\n');
  const figures = (await minify(r('figures.js') + '\n' + r('render.js'), jsOpts)).code;
  fs.writeFileSync(path.join(OUT, 'js/figures.js'), figures);
  const core = (await minify(r('engine.js').replace(/if \(typeof module[^\n]*\n?/, '') + '\n' + r('content.js') + '\n' + r('content_legacy.js') + '\n' + r('daily.js') + '\n' + r('taekil.js').replace(/if \(typeof module[^\n]*\n?/, '') + '\n' + r('dream.js').replace(/if \(typeof module[^\n]*\n?/, '') + '\n' + r('share.js').replace(/if \(typeof module[^\n]*\n?/, '') + '\n' + r('legal.js').replace(/if \(typeof module[^\n]*\n?/, ''), jsOpts)).code;
  fs.writeFileSync(path.join(OUT, 'js/core.js'), core);
  const app = (await minify(r('app.js'), jsOpts)).code;
  fs.writeFileSync(path.join(OUT, 'js/app.js'), app);

  const markupMin = markup.replace(/\n\s+/g, '\n').replace(/>\s+</g, '><');
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>우니조아 — 매일 열어보는 나만의 행운 부적</title>
<meta name="description" content="만세력으로 푸는 사주 원국·대운, 매일 바뀌는 오늘의 운세, 궁합, 꿈해몽, 행운 부적까지. 생년월일만 입력하면 30초면 시작해요.">
<meta name="theme-color" content="#0d0b1e">
<script>try{var f=parseInt(localStorage.getItem('unsu_fs'),10);if(f>=0&&f<=2)document.documentElement.setAttribute('data-fs',f);var x=localStorage.getItem('unsu_fx'),a=(localStorage.getItem('unsu_fxauto')||'').split('|');if(x==='lite'||(x!=='full'&&a[0]==='lite'))document.documentElement.setAttribute('data-perf','lite')}catch(e){}</script>
<link rel="canonical" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="우니조아">
<meta property="og:locale" content="ko_KR">
<meta property="og:url" content="${SITE}/">
<meta property="og:title" content="우니조아 — 매일 열어보는 나만의 행운 부적">
<meta property="og:description" content="만세력 사주 풀이 · 오늘의 운세 · 궁합 · 꿈해몽 · 행운 부적. 생년월일만 입력하면 바로 시작해요.">
<meta property="og:image" content="${OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="우니조아 — 밤하늘 배경에 복주머니를 든 우니와 '매일 열어보는 나만의 행운 부적', 오늘의 색·방향·숫자 카드">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="우니조아 — 매일 열어보는 나만의 행운 부적">
<meta name="twitter:description" content="만세력 사주 풀이 · 오늘의 운세 · 궁합 · 꿈해몽 · 행운 부적">
<meta name="twitter:image" content="${OG}">
<link rel="icon" href="/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="icon" href="/icons/icon-192.png" type="image/png" sizes="192x192">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="우니조아">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=IBM+Plex+Sans+KR:wght@400;500;600&family=Noto+Serif+KR:wght@500;700&display=swap">
<link rel="stylesheet" href="/css/style.css?v=${ver(cssMin)}">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}</style>
</head>
<body>
${markupMin}
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="/js/lunar.js?v=${ver(lunar)}"></script>
<script src="/js/figures.js?v=${ver(figures)}"></script>
<script src="/js/core.js?v=${ver(core)}"></script>
<script src="/js/app.js?v=${ver(app)}"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT, 'index.html'), html);

  fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
    name:'우니조아 — 매일 열어보는 나만의 행운 부적', short_name:'우니조아', lang:'ko', start_url:'/', scope:'/', display:'standalone',
    background_color:'#0d0b1e', theme_color:'#0d0b1e',
    icons:[{ src:'/icons/icon-192.png', sizes:'192x192', type:'image/png' }, { src:'/icons/icon-512.png', sizes:'512x512', type:'image/png' }]
  }));
  /* 정적 약관 페이지 /terms /privacy /refund — PG·통신판매업 심사, 카카오 콘솔에 넣을 주소. 내용은 src/legal.js 하나에서 */
  delete require.cache[require.resolve('../src/legal.js')];
  const LEGAL = require('../src/legal.js');
  const page = (k, slug) => {
    const d = LEGAL.DOCS[k];
    const nav = [['terms', '이용약관'], ['privacy', '개인정보처리방침'], ['refund', '환불 정책']].map(([s, t]) => s === slug ? `<b>${t}</b>` : `<a href="/${s}">${t}</a>`).join(' · ');
    return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${d.title} — 우니조아</title><link rel="canonical" href="${SITE}/${slug}"><meta name="robots" content="index,follow"><meta name="theme-color" content="#0d0b1e">
<link rel="icon" href="/icons/favicon-32.png" type="image/png" sizes="32x32">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
:root{color-scheme:dark}body{margin:0;background:#0d0b1e;color:#c9c6e0;font:15px/1.75 'Pretendard Variable',Pretendard,system-ui,sans-serif;word-break:keep-all}
main{max-width:720px;margin:0 auto;padding:28px 20px 64px}header a{color:#fff;text-decoration:none;font-weight:700;font-size:17px}
h1{color:#fff;font-size:24px;margin:22px 0 6px}h4{color:#fff;font-size:16px;margin:26px 0 6px}nav{font-size:14px;color:#8d89ad}nav a{color:#b8b4d8}
a{color:#b9a8ff}ol,ul{padding-left:20px}li{margin:3px 0}.todo{background:rgba(255,154,138,.14);color:#ffb4a8;border-radius:6px;padding:0 6px;font-size:.92em}
.doc-date{color:#8d89ad;margin-top:28px}footer{margin-top:40px;padding-top:18px;border-top:1px solid rgba(255,255,255,.1);font-size:12.5px;color:#8d89ad;line-height:1.8}
</style></head><body><main><header><a href="/">← 우니조아</a></header><h1>${d.title}</h1><nav>${nav}</nav>
${d.html()}
<footer>${LEGAL.footer()}</footer></main></body></html>
`;
  };
  for (const [k, slug] of [['terms', 'terms'], ['privacy', 'privacy'], ['refund', 'refund']]){
    fs.mkdirSync(path.join(OUT, slug), { recursive: true });
    fs.writeFileSync(path.join(OUT, slug, 'index.html'), page(k, slug));
  }
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  
  for (const f of fs.readdirSync(OUT, { recursive: true })) {
    const p = path.join(OUT, f); if (fs.statSync(p).isFile()) console.log(f.padEnd(26), fs.statSync(p).size);
  }
})();
