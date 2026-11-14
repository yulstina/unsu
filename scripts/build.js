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
  const figures = (await minify(r('figures.js') + '\n' + r('render.js') + '\n' + r('machine.js'), jsOpts)).code;
  fs.writeFileSync(path.join(OUT, 'js/figures.js'), figures);
  const core = (await minify(r('engine.js').replace(/if \(typeof module[^\n]*\n?/, '') + '\n' + r('content.js') + '\n' + r('content_legacy.js') + '\n' + r('daily.js') + '\n' + r('dream.js').replace(/if \(typeof module[^\n]*\n?/, ''), jsOpts)).code;
  fs.writeFileSync(path.join(OUT, 'js/core.js'), core);
  const app = (await minify(r('app.js'), jsOpts)).code;
  fs.writeFileSync(path.join(OUT, 'js/app.js'), app);

  const markupMin = markup.replace(/\n\s+/g, '\n').replace(/>\s+</g, '><');
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>우니조아 WooniJoa — 내 사주로 뽑는 여섯 개의 행운 번호</title>
<meta name="description" content="만세력으로 푸는 사주 원국·대운, 매일 바뀌는 오늘의 운세, 궁합, 행운 번호까지. 생년월일만 입력하면 30초면 시작해요.">
<meta name="theme-color" content="#0d0b1e">
<script>try{var f=parseInt(localStorage.getItem('unsu_fs'),10);if(f>=0&&f<=2)document.documentElement.setAttribute('data-fs',f)}catch(e){}</script>
<link rel="canonical" href="${SITE}/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="우니조아 WooniJoa">
<meta property="og:locale" content="ko_KR">
<meta property="og:url" content="${SITE}/">
<meta property="og:title" content="우니조아 WooniJoa — 내 사주로 뽑는 여섯 개의 행운 번호">
<meta property="og:description" content="만세력 사주 풀이 · 오늘의 운세 · 궁합 · 행운 번호. 생년월일만 입력하면 바로 시작해요.">
<meta property="og:image" content="${SITE}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="우니조아 — 별자리와 오로라 위에 떠 있는 로고와 '내 사주로 뽑는 여섯 개의 행운 번호' 문구">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="우니조아 WooniJoa — 내 사주로 뽑는 여섯 개의 행운 번호">
<meta name="twitter:description" content="만세력 사주 풀이 · 오늘의 운세 · 궁합 · 행운 번호">
<meta name="twitter:image" content="${SITE}/og.jpg">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
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
    name:'우니조아 WooniJoa — 내 사주로 뽑는 여섯 개의 행운 번호', short_name:'우니조아', lang:'ko', start_url:'/', scope:'/', display:'standalone',
    background_color:'#0d0b1e', theme_color:'#0d0b1e',
    icons:[{ src:'/icons/icon-192.png', sizes:'192x192', type:'image/png' }, { src:'/icons/icon-512.png', sizes:'512x512', type:'image/png' }, { src:'/icon.svg', sizes:'any', type:'image/svg+xml' }]
  }));
  fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n');
  
  for (const f of fs.readdirSync(OUT, { recursive: true })) {
    const p = path.join(OUT, f); if (fs.statSync(p).isFile()) console.log(f.padEnd(26), fs.statSync(p).size);
  }
})();
