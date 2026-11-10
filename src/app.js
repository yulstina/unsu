(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id){ return document.getElementById(id); }
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function todayStr(){ var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  /* 저장소: 예시 모드는 'demo:' 네임스페이스로 분리, 계정/모드 키는 전역 */
  var MEM = {}, NS = '', syncHook = null;
  var GLOBAL_KEYS = { unsu_mode:1, unsu_auth:1, unsu_account:1, unsu_intro:1, unsu_invite:1, unsu_gift:1 };
  var DATA_KEYS = ['unsu_list','unsu_me','unsu_coin','unsu_coinlog','unsu_att','unsu_ad','unsu_unlock','unsu_extra','unsu_draft','unsu_zbirth','unsu_seeded','unsu_welcomed','unsu_nudge','unsu_invgift','unsu_ny_alert','unsu_pet','unsu_coupons'];
  function nsk(k){ return GLOBAL_KEYS[k] ? k : NS + k; }
  function store(k, v){
    var key = nsk(k);
    if (v === undefined){ try { var s = localStorage.getItem(key); if (s !== null) return JSON.parse(s); } catch(e){} return MEM[key] !== undefined ? MEM[key] : null; }
    MEM[key] = v; var ok = true;
    try { localStorage.setItem(key, JSON.stringify(v)); } catch(e){ ok = null; }
    if (!NS && !GLOBAL_KEYS[k] && syncHook) syncHook();
    return ok;
  }
  function clearData(){ DATA_KEYS.forEach(function(k){ var key = nsk(k); delete MEM[key]; try { localStorage.removeItem(key); } catch(e){} }); }
  if (store('unsu_mode') === 'demo') NS = 'demo:';

  /* =========================================================
     ATMOSPHERE — 반짝이는 별 + 오로라
     ========================================================= */
  var cv = $('atmosphere'), cx = cv.getContext('2d');
  var off = document.createElement('canvas'), ox = off.getContext('2d');
  var W = 0, H = 0, DPR = 1, stars = [];
  var OS = 6; /* 1/6 해상도로 그린 뒤 업스케일 → 결 없이 부드러운 블러 */
  /* 블루·바이올렛 중심 + 청록·연두·분홍을 은은하게 */
  var RIBBONS = [
    { c:[76,128,255],  y:.30, amp:.07, k:2.1, sp:.00009,  ph:0.0, hgt:.46, a:.30 },
    { c:[124,86,246],  y:.38, amp:.09, k:1.6, sp:.00011,  ph:2.2, hgt:.52, a:.30 },
    { c:[64,176,255],  y:.24, amp:.06, k:2.7, sp:.00012,  ph:4.1, hgt:.34, a:.18 },
    { c:[168,110,255], y:.46, amp:.08, k:1.3, sp:.00008,  ph:5.3, hgt:.40, a:.20 },
    /* 예전 오로라 색: 청록 · 연두 · 분홍 (낮은 농도로 은은하게) */
    { c:[61,214,190],  y:.34, amp:.08, k:1.8, sp:.000095, ph:1.2, hgt:.44, a:.20 },
    { c:[120,236,160], y:.42, amp:.07, k:2.3, sp:.00007,  ph:3.4, hgt:.36, a:.13 },
    { c:[214,92,214],  y:.28, amp:.08, k:1.4, sp:.000085, ph:6.0, hgt:.38, a:.14 }
  ];
  function size(){
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    off.width = Math.ceil(W / OS); off.height = Math.ceil(H / OS);
    stars = [];
    var n = Math.max(90, Math.round(W * H / 5200));
    for (var i = 0; i < n; i++){
      var big = Math.random() < .07;
      stars.push({ x:Math.random()*W, y:Math.random()*H*.92, r:big ? Math.random()*.8 + 1.3 : Math.random()*1.1 + .35,
        b:Math.random()*.45 + .25, s:Math.random()*.0035 + .0012, p:Math.random()*6.28, big:big });
    }
  }
  function drawOff(t){
    var w = off.width, h = off.height;
    ox.globalCompositeOperation = 'source-over';
    ox.clearRect(0, 0, w, h);
    ox.globalCompositeOperation = 'lighter';
    /* 바닥 쪽 은은한 인디고 안개 */
    var fog = ox.createLinearGradient(0, h, 0, h*.45);
    fog.addColorStop(0, 'rgba(70,60,200,.30)'); fog.addColorStop(1, 'rgba(70,60,200,0)');
    ox.fillStyle = fog; ox.fillRect(0, h*.45, w, h*.55);
    /* 리본 커튼: 열마다 세로 그라데이션, 부드러운 사인 합성으로 일렁임 */
    RIBBONS.forEach(function(r, ri){
      for (var x = 0; x < w; x++){
        var u = x / w;
        var wave = Math.sin(u*Math.PI*2*r.k + t*r.sp*2 + r.ph) * .6 + Math.sin(u*Math.PI*2*r.k*.47 - t*r.sp*1.5 + r.ph*1.3) * .4;
        var cy = (r.y + r.amp * wave) * h;
        var inten = .55 + .45 * Math.sin(u*Math.PI*3.1 + t*r.sp*4 + ri*1.9);
        var edge = Math.sin(u*Math.PI); edge = Math.pow(edge, .55);
        var al = r.a * inten * edge;
        var hh = r.hgt * h * (.8 + .2*Math.sin(u*5 + t*r.sp*2 + ri));
        var g = ox.createLinearGradient(0, cy - hh*.15, 0, cy + hh);
        g.addColorStop(0, 'rgba(' + r.c + ',0)');
        g.addColorStop(.12, 'rgba(' + r.c + ',' + al + ')');
        g.addColorStop(.5, 'rgba(' + r.c + ',' + (al*.35) + ')');
        g.addColorStop(1, 'rgba(' + r.c + ',0)');
        ox.fillStyle = g; ox.fillRect(x, cy - hh*.15, 1, hh*1.15);
      }
    });
  }
  function frame(t){
    cx.globalCompositeOperation = 'source-over';
    var bg = cx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#04061a'); bg.addColorStop(.6, '#0a0f2e'); bg.addColorStop(1, '#14103a');
    cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
    /* aurora */
    drawOff(t);
    cx.globalCompositeOperation = 'lighter';
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'high';
    cx.drawImage(off, 0, 0, W, H);
    /* twinkling stars */
    for (var i = 0; i < stars.length; i++){
      var st = stars[i];
      var tw = Math.sin(t*st.s + st.p);
      var a = Math.max(0, Math.min(1, st.b + tw*.45));
      cx.fillStyle = 'rgba(226,240,255,' + a + ')';
      cx.beginPath(); cx.arc(st.x, st.y, st.r, 0, 6.283); cx.fill();
      if (st.big && tw > .35){
        var k = (tw - .35) / .65, L = st.r * (3 + k*5);
        cx.strokeStyle = 'rgba(226,240,255,' + (k*.75) + ')'; cx.lineWidth = .8;
        cx.beginPath(); cx.moveTo(st.x - L, st.y); cx.lineTo(st.x + L, st.y); cx.moveTo(st.x, st.y - L); cx.lineTo(st.x, st.y + L); cx.stroke();
        var gl = cx.createRadialGradient(st.x, st.y, 0, st.x, st.y, st.r*5);
        gl.addColorStop(0, 'rgba(200,225,255,' + (k*.5) + ')'); gl.addColorStop(1, 'rgba(200,225,255,0)');
        cx.fillStyle = gl; cx.beginPath(); cx.arc(st.x, st.y, st.r*5, 0, 6.283); cx.fill();
      }
    }
    cx.globalCompositeOperation = 'source-over';
    if (!reduceMotion && !document.hidden) raf = requestAnimationFrame(frame);
    else raf = 0;
  }
  var raf = 0;
  size();
  window.addEventListener('resize', size);
  document.addEventListener('visibilitychange', function(){ if (!document.hidden && !raf && !reduceMotion) raf = requestAnimationFrame(frame); });
  if (reduceMotion) frame(8000); else raf = requestAnimationFrame(frame);

  (function(){ var b = $('brandHome'); function home(){ if (typeof go === 'function'){ go('today'); window.scrollTo(0, 0); } } b.onclick = home; b.onkeydown = function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); home(); } }; })();

  /* =========================================================
     공통 헬퍼
     ========================================================= */
  function seedHash(str){ var h = 0; for (var i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0; return h >>> 0; }
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function drawSixFromSeed(seedStr){
    var rand = mulberry32(seedHash(seedStr));
    var pool = []; for (var i = 1; i <= 45; i++) pool.push(i);
    var picked = [];
    for (var k = 0; k < 6; k++){ var idx = Math.floor(rand()*pool.length); picked.push(pool[idx]); pool.splice(idx, 1); }
    return picked.sort(function(a,b){ return a-b; });
  }
  /* 용신 수(하도수) 가중 번호: 용신 끝자리 번호 3개 + 나머지 3개 */
  function drawYongNumbers(seedStr, el){
    var rand = mulberry32(seedHash(seedStr));
    var digits = EL_TEXT[el].num.map(function(n){ return n % 10; });
    var yongPool = [], rest = [];
    for (var i = 1; i <= 45; i++) (digits.indexOf(i % 10) > -1 ? yongPool : rest).push(i);
    var out = [];
    for (var a = 0; a < 3; a++){ var ix = Math.floor(rand()*yongPool.length); out.push({ n:yongPool[ix], y:true }); yongPool.splice(ix, 1); }
    for (var b = 0; b < 3; b++){ var jx = Math.floor(rand()*rest.length); out.push({ n:rest[jx], y:false }); rest.splice(jx, 1); }
    return out.sort(function(p, q){ return p.n - q.n; });
  }
  function revealBalls(container){
    var balls = container.querySelectorAll('.ball');
    if (reduceMotion || !window.gsap){ balls.forEach(function(b){ b.classList.remove('pre'); }); return; }
    gsap.fromTo(balls, { opacity:0, scale:.5 }, { opacity:1, scale:1, duration:.5, ease:'back.out(1.7)', stagger:.08, onStart:function(){ balls.forEach(function(b){ b.classList.remove('pre'); }); } });
  }
  var toastT = 0;
  function toast(msg){ var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove('show'); }, 2200); }
  function fallbackCopy(text){ var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch(e){} document.body.removeChild(ta); }
  function copyText(text, msg){
    var done = function(){ toast(msg || '복사했어요'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(function(){ fallbackCopy(text); done(); });
    else { fallbackCopy(text); done(); }
  }
  function shareText(title, text){
    if (navigator.share){
      navigator.share({ title:title, text:text }).catch(function(err){ if (err && err.name !== 'AbortError') copyText(text, '결과를 복사했어요. 메신저에 붙여넣어 공유하세요'); });
    } else copyText(text, '결과를 복사했어요. 메신저에 붙여넣어 공유하세요');
  }
  function drawOn(svgWrap){
    if (!svgWrap) return;
    var s = svgWrap.querySelector('svg.fig'); if (!s || reduceMotion) return;
    s.classList.remove('draw'); void s.getBoundingClientRect(); s.classList.add('draw');
  }

  var EL_CLASS = ['el-wood','el-fire','el-earth','el-metal','el-water'];
  var BR_EL = [4,2,0,0,2,1,1,2,3,3,2,4];
  var ANIMAL_EL = { '쥐':'water','소':'earth','호랑이':'wood','토끼':'wood','용':'earth','뱀':'fire','말':'fire','양':'earth','원숭이':'metal','닭':'metal','개':'earth','돼지':'water' };

  /* top date */
  (function(){
    var now = new Date();
    var r = MS.calc({ y:now.getFullYear(), m:now.getMonth()+1, d:now.getDate(), cal:'solar', hour:now.getHours(), minute:now.getMinutes(), gender:'M', lonCorr:false });
    var yb = r.error ? 6 : r.pillars.year.br;
    var an = MS.BR_ANIMAL[yb];
    $('heroFig').innerHTML = figSVG(an, ANIMAL_EL[an]) + '<figcaption>' + (r.error ? '' : r.seun.year + ' ' + r.pillars.year.hanja + ' · ' + r.color + ' ' + an) + '</figcaption>';
    $('heroFig').querySelector('svg').classList.add('fig');
  })();

  /* =========================================================
     탭 네비게이션
     ========================================================= */
  var VIEWS = { today:$('v-today'), onboard:$('v-onboard'), my:$('v-my'), input:$('v-input'), result:$('v-result'), list:$('v-list'), zodiac:$('v-zodiac'), gunghap:$('v-gunghap'), fill:$('v-fill') };
  var TAB_OF = { today:'today', onboard:'', my:'', input:'saju', result:'saju', list:'saju', zodiac:'today', gunghap:'gunghap', fill:'num' };
  var currentTab = 'today', currentView = 'today', lastSajuView = null;
  function show(view, tab){
    Object.keys(VIEWS).forEach(function(k){ VIEWS[k].hidden = k !== view; });
    currentView = view; currentTab = tab !== undefined ? tab : TAB_OF[view];
    document.body.classList.toggle('focus', view === 'onboard');
    if (typeof updateTopbar === 'function') updateTopbar();
    if (view === 'input' || view === 'list' || view === 'result') lastSajuView = view;
    document.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === currentTab); b.setAttribute('aria-current', b.dataset.tab === currentTab ? 'page' : 'false'); });
    var ti = ['today','saju','gunghap','num'].indexOf(currentTab), lens = document.querySelector('.tab-lens');
    if (lens){ lens.style.opacity = ti < 0 ? '0' : '1'; if (ti >= 0) lens.style.setProperty('--ti', ti); }
    var segKey = view === 'result' ? 'mine' : view;
    document.querySelectorAll('.seg button').forEach(function(b){ b.setAttribute('aria-selected', String(b.dataset.sub === segKey)); });
    window.scrollTo(0, 0);
  }
  function go(t){
    if (t === 'today'){ renderToday(); show('today'); }
    else if (t === 'saju'){
      var v = (currentTab === 'saju' || !lastSajuView) ? (getMe() ? 'mine' : 'input') : lastSajuView;
      if (v === 'result' && (!cur || cur.asTab)) v = getMe() ? 'mine' : 'input';
      if (v === 'mine'){ openMine(); return; }
      if (v === 'list') renderList();
      show(v);
    }
    else if (t === 'gunghap'){ renderGunghap(); show('gunghap'); }
    else if (t === 'num'){ renderNumToday(); show('fill'); }
  }
  /* 스크롤: 상단 바 유리 전환 + 탭바 최소화 (iOS 스타일) */
  (function(){
    var lastY = 0, ticking = false;
    function onScroll(){
      var y = window.scrollY || 0;
      document.body.classList.toggle('scrolled', y > 8);
      if (y > 140 && y > lastY + 6) document.body.classList.add('tb-min');
      else if (y < lastY - 6 || y < 140) document.body.classList.remove('tb-min');
      lastY = y; ticking = false;
    }
    window.addEventListener('scroll', function(){ if (!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, { passive:true });
  })();
  document.querySelector('.tabbar').addEventListener('click', function(e){ var b = e.target.closest('.tab'); if (b) go(b.dataset.tab); });
  document.querySelectorAll('.seg button').forEach(function(b){ b.addEventListener('click', function(){ if (b.dataset.sub === 'mine'){ openMine(); return; } if (b.dataset.sub === 'list') renderList(); show(b.dataset.sub); }); });
  function openMine(){ var me = getMe(); if (!me){ startOnboarding('new'); return; } var r = compute(me); if (r.error){ show('input'); return; } openResult(me, r, true); }

  /* =========================================================
     사주 입력 폼
     ========================================================= */
  var form = { gender:'F', cal:'solar', leap:false, unknown:false, corr:true };
  function setPressed(groupSel, attr, val){ document.querySelectorAll(groupSel).forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset[attr] === String(val))); }); }
  function syncForm(){
    setPressed('#gM,#gF', 'g', form.gender);
    setPressed('#cS,#cL', 'c', form.cal);
    setPressed('#lN,#lY', 'l', form.leap ? '1' : '0');
    var lunar = form.cal === 'lunar';
    $('leapPill').classList.toggle('is-disabled', !lunar);
    $('lN').disabled = $('lY').disabled = !lunar;
    $('fUnknown').setAttribute('aria-checked', String(form.unknown));
    $('ddHour').disabled = $('ddMin').disabled = form.unknown;
    if (form.unknown) closeDD();
    renderDDVals();
    $('fCorr').setAttribute('aria-checked', String(form.corr));
    updateBirthHint(); updateTimeHint();
  }
  $('gM').onclick = $('gF').onclick = function(){ form.gender = this.dataset.g; syncForm(); saveDraft(); };
  $('cS').onclick = $('cL').onclick = function(){ form.cal = this.dataset.c; if (form.cal === 'solar') form.leap = false; syncForm(); saveDraft(); };
  $('lN').onclick = $('lY').onclick = function(){ form.leap = this.dataset.l === '1'; syncForm(); saveDraft(); };
  $('fUnknown').onclick = function(){ form.unknown = !form.unknown; syncForm(); saveDraft(); };
  $('fCorr').onclick = function(){ form.corr = !form.corr; syncForm(); saveDraft(); };
  ['fBirth','zBirth'].forEach(function(id){ $(id).addEventListener('input', function(){ this.value = this.value.replace(/\D/g, '').slice(0, 8); }); });
  $('fBirth').addEventListener('input', function(){ updateBirthHint(); saveDraft(); });

  /* ---- 출생시간 드롭다운 ---- */
  var tsel = { h:null, m:null };
  var SIJIN = []; for (var hh0 = 0; hh0 < 24; hh0++) SIJIN.push(['자','축','인','묘','진','사','오','미','신','유','술','해'][Math.floor((hh0 + 1) / 2) % 12]);
  function timeValue(){ return (tsel.h === null || tsel.m === null) ? '' : pad2(tsel.h) + pad2(tsel.m); }
  function renderDDVals(){
    $('ddHour').value = tsel.h === null ? '' : String(tsel.h);
    $('ddMin').value = tsel.m === null ? '' : String(tsel.m);
  }
  (function buildDD(){
    var hp = '<option value="">시</option>', mp = '<option value="">분</option>';
    for (var i = 0; i < 24; i++) hp += '<option value="' + i + '">' + pad2(i) + '시 (' + SIJIN[i] + '시)</option>';
    for (var j = 0; j < 60; j++) mp += '<option value="' + j + '">' + pad2(j) + '분</option>';
    $('ddHour').innerHTML = hp; $('ddMin').innerHTML = mp;
  })();
  function closeDD(){}
  $('ddHour').onchange = function(){ tsel.h = this.value === '' ? null : +this.value; if (tsel.h !== null && tsel.m === null){ tsel.m = 0; renderDDVals(); } updateTimeHint(); saveDraft(); };
  $('ddMin').onchange = function(){ tsel.m = this.value === '' ? null : +this.value; updateTimeHint(); saveDraft(); };
  $('fName').addEventListener('input', saveDraft);

  function parseBirth(v){
    if (!/^\d{8}$/.test(v)) return null;
    return { y:+v.slice(0,4), m:+v.slice(4,6), d:+v.slice(6,8) };
  }
  function parseTime(v){
    if (!/^\d{4}$/.test(v)) return null;
    var h = +v.slice(0,2), m = +v.slice(2,4);
    if (h > 23 || m > 59) return null;
    return { h:h, m:m };
  }
  function updateBirthHint(){
    var el = $('birthHint'), v = $('fBirth').value, b = parseBirth(v);
    el.className = 'field-hint';
    if (!v){ el.textContent = '1900~2050년 · 음력은 윤달 여부까지 선택해 주세요'; return; }
    if (v.length < 8){ el.textContent = '8자리로 입력해 주세요 (예: 19881230)'; return; }
    if (!b || b.y < 1900 || b.y > 2050){ el.className = 'field-hint err'; el.textContent = '1900~2050년 사이의 날짜를 입력해 주세요'; return; }
    if (form.cal === 'solar'){
      var dt = new Date(Date.UTC(b.y, b.m-1, b.d));
      if (dt.getUTCMonth() !== b.m-1 || dt.getUTCDate() !== b.d){ el.className = 'field-hint err'; el.textContent = '달력에 없는 날짜예요'; return; }
      var l = MS.solarToLunar(b.y, b.m, b.d);
      el.className = 'field-hint ok';
      el.textContent = '양력 ' + b.y + '년 ' + b.m + '월 ' + b.d + '일' + (l ? ' · 음력 ' + l.y + '.' + l.m + '.' + l.d + (l.leap ? ' (윤달)' : '') : '');
    } else {
      var s = MS.lunarToSolar(b.y, b.m, b.d, form.leap);
      if (!s){
        el.className = 'field-hint err';
        el.textContent = form.leap ? b.y + '년에는 윤' + b.m + '월이 없어요. 평달을 선택해 주세요' : '음력 달력에 없는 날짜예요';
        return;
      }
      el.className = 'field-hint ok';
      var leapNote = (!form.leap && MS.hasLeapMonth(b.y, b.m)) ? ' · 이 해엔 윤' + b.m + '월도 있어요' : '';
      el.textContent = '음력 ' + (form.leap ? '윤' : '') + b.m + '월 ' + b.d + '일 → 양력 ' + s.y + '.' + s.m + '.' + s.d + leapNote;
    }
  }
  var BR_TIME = ['자시','축시','인시','묘시','진시','사시','오시','미시','신시','유시','술시','해시'];
  function updateTimeHint(){
    var el = $('timeHint'); el.className = 'field-hint';
    if (form.unknown){ el.textContent = '시주를 뺀 6글자로 풀이해요'; return; }
    var v = timeValue(), t = parseTime(v);
    if (!v){ el.textContent = tsel.h !== null ? '분을 골라 주세요' : '시간을 모르면 ‘모름’을 켜 주세요'; return; }
    if (!t){ el.className = 'field-hint err'; el.textContent = '00:00~23:59 사이로 입력해 주세요'; return; }
    var mins = t.h*60 + t.m - (form.corr ? 32 : 0);
    var br = Math.floor((((mins + 60) % 1440) + 1440) % 1440 / 120) % 12;
    el.className = 'field-hint ok';
    el.textContent = pad2(t.h) + ':' + pad2(t.m) + ' · ' + BR_TIME[br] + (form.corr ? ' (진태양시 보정 기준)' : '');
  }
  function saveDraft(){ store('unsu_draft', { name:$('fName').value, birth:$('fBirth').value, time:timeValue(), form:form }); }
  (function loadDraft(){
    var d = store('unsu_draft');
    if (d){ $('fName').value = d.name || ''; $('fBirth').value = d.birth || ''; if (/^\d{4}$/.test(d.time || '')){ tsel.h = +d.time.slice(0,2); tsel.m = +d.time.slice(2); } if (d.form) Object.keys(form).forEach(function(k){ if (d.form[k] !== undefined) form[k] = d.form[k]; }); }
    syncForm();
  })();

  $('btnReset').onclick = function(){
    $('fName').value = ''; $('fBirth').value = ''; tsel.h = tsel.m = null;
    form = { gender:'F', cal:'solar', leap:false, unknown:false, corr:true };
    $('formMsg').textContent = '';
    syncForm(); saveDraft(); $('fName').focus();
  };

  function readForm(){
    var msg = $('formMsg'); msg.textContent = '';
    var b = parseBirth($('fBirth').value);
    if (!b){ msg.textContent = '생년월일 8자리를 입력해 주세요'; $('fBirth').focus(); return null; }
    var t = null;
    if (!form.unknown){
      t = parseTime(timeValue());
      if (!t){ msg.textContent = '출생시간(시·분)을 고르거나 ‘모름’을 켜 주세요'; $('ddHour').focus(); return null; }
    }
    var entry = {
      name: $('fName').value.trim() || '이름 없음', gender: form.gender, cal: form.cal, leap: form.cal === 'lunar' && form.leap,
      y:b.y, m:b.m, d:b.d, unknown: form.unknown, hour: t ? t.h : null, minute: t ? t.m : null, corr: form.corr
    };
    var r = compute(entry);
    if (r.error){ msg.textContent = r.error; return null; }
    return { entry:entry, result:r };
  }
  function compute(e){
    return MS.calc({ y:e.y, m:e.m, d:e.d, cal:e.cal, leap:e.leap, hour:e.hour, minute:e.minute, unknownTime:e.unknown, gender:e.gender, lonCorr:e.corr !== false, lon:127 });
  }

  /* =========================================================
     저장 / 목록
     ========================================================= */
  function getList(){ var l = store('unsu_list'); return Array.isArray(l) ? l : []; }
  function sameEntry(a, b){ return ['name','gender','cal','leap','y','m','d','unknown','hour','minute'].every(function(k){ return a[k] === b[k]; }); }
  function saveEntry(entry){
    var list = getList();
    var found = list.filter(function(x){ return sameEntry(x, entry); })[0];
    if (found){ toast('이미 목록에 있는 사주예요'); return found.id; }
    entry.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    entry.saved = Date.now();
    list.unshift(entry);
    if (list.length > 60) list.length = 60;
    if (store('unsu_list', list) === null && getList().length === 0){ toast('이 브라우저에서는 저장할 수 없어요'); return null; }
    toast('‘' + entry.name + '’ 사주를 저장했어요');
    updateSegCount();
    if (!getMe() && !entry.sample) setTimeout(function(){ askIsMe(entry); }, 350);
    return entry.id;
  }
  $('sajuForm').addEventListener('submit', function(e){
    e.preventDefault();
    var r = readForm(); if (!r) return;
    openResult(r.entry, r.result);
  });
  $('btnSaveForm').onclick = function(){ var r = readForm(); if (r) saveEntry(r.entry); };

  function fmtEntryDate(e){
    return (e.cal === 'lunar' ? '음 ' + (e.leap ? '윤' : '') : '양 ') + e.y + '.' + pad2(e.m) + '.' + pad2(e.d) + (e.unknown ? ' · 시간 모름' : ' ' + pad2(e.hour) + ':' + pad2(e.minute));
  }
  var confirmId = null;
  function renderList(){
    var list = getList(), wrap = $('list'), meId = (getMe() || {}).id;
    updateSegCount();
    $('listCount').textContent = list.length ? list.length + '명' : '';
    if (!list.length){
      wrap.innerHTML = '<div class="card empty-state">' + figSVG('토끼','wood') + '<div style="font-size:calc(15px*var(--fs));color:#fff">아직 저장된 사주가 없어요</div><p class="helper">가족, 친구의 사주를 저장해 두면 언제든 다시 꺼내 볼 수 있어요.</p><button class="btn-primary" id="btnGoInput">사주 입력하기</button></div>';
      $('btnGoInput').onclick = function(){ show('input'); };
      updateSegCount();
      return;
    }
    wrap.innerHTML = list.map(function(e){
      var r = compute(e); if (r.error) return '';
      var p = r.pillars, dEl = p.day.sEl;
      var html = '<div class="li" data-id="' + e.id + '">' +
        '<button class="li-fig" data-open="' + e.id + '" aria-label="' + esc(e.name) + ' 사주 열기">' + figSVG(r.animal, ANIMAL_EL[r.animal], 'mini') + '</button>' +
        '<button class="li-main" data-open="' + e.id + '"><span class="li-name">' + esc(e.name) + '<span class="g">' + (e.gender === 'M' ? '남' : '여') + '</span>' + (e.sample ? '<span class="g">예시</span>' : '') + (meId === e.id ? '<span class="g" style="color:#c9b8ff;box-shadow:inset 0 0 0 1px rgba(201,184,255,.5)">대표</span>' : '') + '</span>' +
        '<span class="li-sub">' + fmtEntryDate(e) + '</span><span class="li-sub">' + p.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · ' + p.day.name + '일주</span></button>' +
        '<div class="li-side"><span class="li-gj ' + EL_CLASS[dEl] + '">' + p.day.hanja + '</span>' +
        '<button class="li-del" data-me="' + e.id + '" aria-pressed="' + (meId === e.id) + '" aria-label="' + esc(e.name) + ' 대표 사주로 설정" style="color:' + (meId === e.id ? '#c9b8ff' : '') + '"><svg width="18" height="18" viewBox="0 0 24 24" fill="' + (meId === e.id ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z"/></svg></button>' +
        '<button class="li-del" data-del="' + e.id + '" aria-label="' + esc(e.name) + ' 삭제"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg></button></div>';
      if (confirmId === e.id) html += '<div class="li-confirm">‘' + esc(e.name) + '’을 삭제할까요?<button class="btn-ghost" data-cancel="1">취소</button><button class="btn-ghost btn-danger" data-confirm="' + e.id + '">삭제</button></div>';
      return html + '</div>';
    }).join('');
  }
  $('list').addEventListener('click', function(e){
    var t;
    if ((t = e.target.closest('[data-open]'))){
      var entry = getList().filter(function(x){ return x.id === t.dataset.open; })[0];
      if (entry){ openResult(entry, compute(entry)); }
    } else if ((t = e.target.closest('[data-me]'))){ setMe(t.dataset.me); toast('대표 사주로 설정했어요. 오늘의 운세에 반영돼요'); renderList(); }
    else if ((t = e.target.closest('[data-del]'))){ confirmId = t.dataset.del; renderList(); }
    else if (e.target.closest('[data-cancel]')){ confirmId = null; renderList(); }
    else if ((t = e.target.closest('[data-confirm]'))){
      store('unsu_list', getList().filter(function(x){ return x.id !== t.dataset.confirm; }));
      if (store('unsu_me') === t.dataset.confirm){ var rest = getList(); setMe(rest.length ? (rest.filter(function(x){ return !x.sample; })[0] || rest[0]).id : null); }
      confirmId = null; renderList(); toast('삭제했어요');
    }
  });

  /* =========================================================
     사주 결과 렌더링
     ========================================================= */
  var cur = null;
  var prevView = 'input';
  $('btnBackResult').onclick = function(){
    if (prevView === 'list') renderList(); else if (prevView === 'today') renderToday(); else if (prevView === 'gunghap') renderGunghap();
    show(prevView);
  };
  $('btnSaveResult').onclick = function(){ if (cur){ var id = saveEntry(cur.entry); if (id){ cur.entry.id = id; this.textContent = '저장됨'; } } };

  function tileHTML(stem, isStem, p){
    var el = isStem ? p.sEl : p.bEl;
    return '<div class="tile ' + EL_CLASS[el] + '"><span class="hj">' + (isStem ? p.sh : p.bh) + '</span><span class="kr">' + (isStem ? p.sk : p.bk) + ' · ' + MS.EL_K[el] + '</span></div>';
  }
  function colHTML(key, p, isDay){
    var head = '<div class="ph">' + POS_LABEL[key] + '<small>' + POS_MEANING[key] + '</small></div>';
    if (!p) return '<div class="pcol">' + head + '<div class="ten">·</div><div class="tile empty"><span class="hj">?</span></div><div class="tile empty"><span class="hj">?</span></div><div class="ten">시간 모름</div></div>';
    return '<div class="pcol' + (isDay ? ' is-day' : '') + '">' + head + '<div class="ten">' + p.tenStem + '</div>' + tileHTML(p.stem, true, p) + tileHTML(p.br, false, p) + '<div class="ten">' + p.tenBr + '</div></div>';
  }

  function openResult(entry, r, asTab){
    setTimeout(function(){ bond('saju'); }, 900);
    if (currentView !== 'result') prevView = currentView;
    cur = { entry:entry, r:r, asTab:!!asTab };
    $('resultSeg').hidden = !asTab; $('resultHead').hidden = !!asTab;
    var P = r.pillars, order = ['hour','day','month','year'];
    var dStem = P.day.stem, dEl = r.dEl, ig = ILGAN[dStem];
    var saved = getList().some(function(x){ return sameEntry(x, entry); });
    $('btnSaveResult').textContent = saved ? '저장됨' : '저장';
    $('resultTtl').textContent = entry.name + '님의 사주';
    var h = '';

    /* --- 포스터 --- */
    var yEl = P.year.sEl;
    var solarStr = r.solar.y + '.' + pad2(r.solar.m) + '.' + pad2(r.solar.d);
    var lunarStr = r.lunar ? r.lunar.y + '.' + pad2(r.lunar.m) + '.' + pad2(r.lunar.d) + (r.lunar.leap ? '(윤)' : '') : '';
    var timeStr = r.time ? pad2(r.time.h) + ':' + pad2(r.time.mi) : '시간 모름';
    var corrStr = r.time ? (r.corr.corrMin || r.corr.dst ? '보정 ' + pad2(r.corr.lmH) + ':' + pad2(r.corr.lmMi) + (r.corr.dst ? ' · 서머타임' : '') + (r.corr.zone === 8.5 ? ' · UTC+8:30' : '') : '보정 없음') : '';
    h += '<div class="poster"><div class="poster-frame">' +
      '<div class="poster-corner l">四柱八字<br>SAJU CHART</div><div class="poster-corner r">' + P.year.hanja + '<br>' + (entry.gender === 'M' ? '乾命 남' : '坤命 여') + '</div>' +
      '<div class="poster-side l">TWELVE · ANIMALS</div><div class="poster-side r">' + MS.BR_H[P.year.br] + ' · ' + r.animal + '</div>' +
      '<div class="poster-fig" id="posterFig">' + figSVG(r.animal, ANIMAL_EL[r.animal]) + '</div>' +
      '<div class="poster-name">' + esc(entry.name) + '</div>' +
      '<div class="poster-sub">' + P.year.name + '년생 · ' + r.color + ' ' + r.animal + '띠 · ' + P.day.name + '(' + P.day.hanja + ')일주</div>' +
      '<div class="poster-meta">양력 ' + solarStr + ' ' + timeStr + '<br>음력 ' + lunarStr + (corrStr ? ' · ' + corrStr : '') + '</div>' +
      '</div></div>';
    h += '<button class="btn-primary btn-block" id="btnImgRes" style="margin:-4px 0 4px">정리된 결과 이미지로 저장·공유</button>';

    /* --- 원국 --- */
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">사주 원국</h2><span class="sec-meta">' + (P.hour ? '8字' : '6字') + '</span></div>';
    h += '<div class="pillars">' + order.map(function(k){ return colHTML(k, P[k], k === 'day'); }).join('');
    h += '<div class="prow-label">지장간 支藏干</div>' + order.map(function(k){ return '<div class="pcell">' + (P[k] ? '<span class="jj">' + P[k].jijang + '</span>' : '—') + '</div>'; }).join('');
    h += '<div class="prow-label">12운성 十二運星</div>' + order.map(function(k){ return '<div class="pcell">' + (P[k] ? P[k].stage : '—') + '</div>'; }).join('');
    h += '</div><p class="table-note">가운데 일주의 윗글자(일간 <b style="color:#fff">' + P.day.sh + '</b>)가 나 자신이에요. 나머지 글자의 이름(비견·정재 등)은 일간과의 관계를 뜻해요.</p></div>';

    /* --- 오행 --- */
    var maxC = Math.max.apply(null, r.cnt);
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">오행 분포</h2><span class="sec-meta">FIVE ELEMENTS</span></div><div class="el-bars">';
    for (var e = 0; e < 5; e++){
      h += '<div class="el-bar ' + EL_CLASS[e] + '"><span class="nm"><b>' + MS.EL_H[e] + '</b>' + MS.EL_K[e] + '</span><span class="trk"><span class="fill" style="width:' + (r.cnt[e] / Math.max(maxC, 1) * 100) + '%"></span></span><span class="ct">' + r.cnt[e] + '</span></div>';
    }
    h += '</div>';
    var pct = Math.round(r.ratio * 100);
    h += '<div class="sub-block"><h4>일간의 힘 · ' + r.strength + ' (' + pct + '%)</h4><div class="meter"><span class="mk" style="left:' + pct + '%"></span></div><div class="meter-labels"><span>신약</span><span>중화</span><span>신강</span></div></div>';
    h += '<p class="body-text">' + STRENGTH_TEXT[r.strength] + '</p>';
    h += '<div class="kv"><div class="' + EL_CLASS[r.yong] + '"><span class="k">용신 · 나를 살리는 기운</span><span class="v"><b>' + MS.EL_H[r.yong] + '</b>' + MS.EL_K[r.yong] + '</span><span class="s">' + EL_TEXT[r.yong].color + ' · ' + EL_TEXT[r.yong].dir + ' · 숫자 ' + EL_TEXT[r.yong].num.join(', ') + '</span></div>' +
      '<div class="' + EL_CLASS[r.hee] + '"><span class="k">희신 · 용신을 돕는 기운</span><span class="v"><b>' + MS.EL_H[r.hee] + '</b>' + MS.EL_K[r.hee] + '</span><span class="s">' + EL_TEXT[r.hee].color + ' · ' + EL_TEXT[r.hee].dir + ' · 숫자 ' + EL_TEXT[r.hee].num.join(', ') + '</span></div></div>';
    var manyEl = r.cnt.indexOf(maxC), minC = Math.min.apply(null, r.cnt), fewEl = r.cnt.indexOf(minC);
    h += '<p class="body-text"><strong>' + EL_TEXT[manyEl].name + ' ' + maxC + '개</strong> — ' + EL_TEXT[manyEl].many + '</p>';
    h += '<p class="body-text"><strong>' + EL_TEXT[fewEl].name + ' ' + minC + '개</strong> — ' + EL_TEXT[fewEl].few + ' 추천 활동: ' + EL_TEXT[r.yong].act + '.</p>';
    h += '</div>';

    /* --- 일간 --- */
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">나를 나타내는 글자</h2><span class="sec-meta">DAY MASTER</span></div>' +
      '<div class="ilgan-head ' + EL_CLASS[dEl] + '"><div class="ilgan-mark">' + P.day.sh + '</div><div><div class="ilgan-t">' + ig.t + '</div><div class="ilgan-img">' + ig.img + '</div></div></div>' +
      '<div class="chip-row">' + ig.kw.map(function(k){ return '<span class="chip">' + k + '</span>'; }).join('') + '</div>' +
      '<p class="body-text">' + ig.d + '</p><div class="divider"></div>' +
      '<div class="sub-block"><h4>타고난 강점</h4><p class="body-text">' + ig.good + '</p></div>' +
      '<div class="sub-block"><h4>조심하면 좋은 점</h4><p class="body-text">' + ig.care + '</p></div>' +
      '<div class="sub-block"><h4>잘 맞는 분야</h4><p class="body-text">' + ig.fit + '</p></div>' +
      '<div class="sub-block"><h4>일지 · ' + P.day.bk + '(' + P.day.bh + ') ' + P.day.tenBr + ' · ' + P.day.stage + '</h4><p class="body-text">배우자 자리에 ' + TEN_DESC[P.day.tenBr] + '의 기운이 앉아 있고, 일간은 이 자리에서 ‘' + P.day.stage + '’ 상태예요. ' + STAGE_DESC[P.day.stage] + '.</p></div>' +
      '</div>';

    /* --- 십성 --- */
    var gCount = { '비겁':0,'식상':0,'재성':0,'관성':0,'인성':0 };
    order.forEach(function(k){ var p = P[k]; if (!p) return; if (k !== 'day') gCount[TEN_TO_GROUP[p.tenStem]]++; gCount[TEN_TO_GROUP[p.tenBr]]++; });
    var gKeys = Object.keys(gCount);
    var topG = gKeys.slice().sort(function(a,b){ return gCount[b] - gCount[a]; })[0];
    var zeroG = gKeys.filter(function(k){ return gCount[k] === 0; });
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">십성 구성</h2><span class="sec-meta">TEN GODS</span></div><div class="ten-rows">';
    gKeys.forEach(function(k){
      var dots = ''; for (var i = 0; i < 5; i++) dots += '<i class="' + (i < gCount[k] ? 'on' : '') + '"></i>';
      h += '<div class="ten-row"><span class="lb"><b>' + TEN_GROUP[k].n.split('(')[0] + '</b><small>' + TEN_GROUP[k].m.split('.')[0] + '</small></span><span class="dots">' + dots + '</span><span class="n">' + gCount[k] + '</span></div>';
    });
    h += '</div><p class="body-text"><strong>' + TEN_GROUP[topG].n + '이 가장 발달</strong> — ' + TEN_GROUP[topG].hi + '</p>';
    zeroG.forEach(function(k){ h += '<p class="body-text"><strong>' + TEN_GROUP[k].n + '이 없음</strong> — ' + TEN_GROUP[k].lo + '</p>'; });
    h += '</div>';

    /* --- 신살 · 공망 --- */
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">신살 · 공망</h2><span class="sec-meta">SPECIAL STARS</span></div><div class="ss-list">';
    if (!r.shinsal.length) h += '<p class="body-text">두드러진 신살이 없는 담백한 사주예요. 특별한 굴곡 없이 스스로의 노력으로 길을 만드는 타입입니다.</p>';
    r.shinsal.forEach(function(s){ h += '<div class="ss"><span class="chip">' + s.name + '</span><p>' + SHINSAL_TEXT[s.name] + ' <span class="helper">(' + s.at.map(function(a){ return POS_LABEL[a]; }).join('·') + ')</span></p></div>'; });
    var gongAt = order.filter(function(k){ return P[k] && k !== 'day' && r.gong.indexOf(P[k].br) > -1; });
    h += '<div class="ss"><span class="chip">공망</span><p>' + MS.BR_K[r.gong[0]] + MS.BR_K[r.gong[1]] + '(' + MS.BR_H[r.gong[0]] + MS.BR_H[r.gong[1]] + ') — 비어 있는 자리. ' + (gongAt.length ? gongAt.map(function(a){ return POS_LABEL[a]; }).join('·') + '에 걸려 있어 그 자리의 인연이 늦게 채워지는 편이에요.' : '원국에는 걸린 글자가 없어요.') + '</p></div>';
    h += '</div></div>';

    /* --- 대운 --- */
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">대운 흐름</h2><span class="sec-meta">대운수 ' + r.dNum + ' · ' + (r.forward ? '순행' : '역행') + '</span></div><div class="scroller" id="duScroll">';
    r.daeun.forEach(function(p){
      var now = r.curDaeun === p;
      h += '<div class="du' + (now ? ' now' : '') + '">' + (now ? '<span class="now-tag">NOW</span>' : '') + '<span class="age">' + p.age + '세</span><span class="g"><span class="' + EL_CLASS[p.sEl] + '">' + p.sh + '</span><span class="' + EL_CLASS[p.bEl] + '">' + p.bh + '</span></span><span class="t">' + p.tenStem + '<br>' + p.tenBr + '</span></div>';
    });
    h += '</div>';
    if (r.curDaeun) h += '<p class="body-text"><strong>지금은 ' + r.curDaeun.name + ' 대운 (' + r.curDaeun.age + '~' + (r.curDaeun.age + 9) + '세)</strong> — ' + TEN_DESC[r.curDaeun.tenStem] + '의 10년. ' + SEUN_TEXT[r.curDaeun.tenStem].split('. ')[0] + '.</p>';
    else h += '<p class="body-text">첫 대운(' + r.dNum + '세) 전의 시기예요. 부모님의 기운과 타고난 월주의 영향이 가장 큰 때입니다.</p>';
    h += '<p class="helper">나이는 세는 나이 기준, 10년마다 바뀌어요. 올해 ' + r.ageK + '세.</p></div>';

    /* --- 올해 / 이번 달 --- */
    var S = r.seun, M = r.wolun;
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">' + S.year + '년의 운</h2><span class="sec-meta">' + S.hanja + ' · 세운</span></div>' +
      '<div class="luck-card"><div class="luck-g"><span class="' + EL_CLASS[S.sEl] + '">' + S.sh + '</span><span class="' + EL_CLASS[S.bEl] + '">' + S.bh + '</span></div><div class="luck-txt"><h4>' + S.name + '년 · ' + S.tenStem + ' / ' + S.tenBr + '</h4><p>' + SEUN_TEXT[S.tenStem] + '</p><p class="helper">' + STAGE_DESC[S.stage] + ' (' + S.stage + ')</p></div></div>' +
      '<div class="divider"></div>' +
      '<div class="luck-card"><div class="luck-g"><span class="' + EL_CLASS[M.sEl] + '">' + M.sh + '</span><span class="' + EL_CLASS[M.bEl] + '">' + M.bh + '</span></div><div class="luck-txt"><h4>이번 달 · ' + M.name + '월 · ' + M.tenStem + '</h4><p>' + TEN_DESC[M.tenStem] + '의 기운이 들어오는 달이에요. ' + SEUN_TEXT[M.tenStem].split('. ').slice(-1)[0] + '</p></div></div>' +
      '</div>';

    /* --- 띠 --- */
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">' + r.color + ' ' + r.animal + '띠 이야기</h2><span class="sec-meta">' + P.year.hanja + '</span></div>' +
      '<div class="chip-row">' + ANIMAL_TRAITS[r.animal].map(function(t){ return '<span class="chip">' + t + '</span>'; }).join('') + '</div>' +
      '<p class="body-text">' + ANIMAL_BLURB[r.animal] + '</p></div>';

    /* --- 번호 --- */
    var iso = r.solar.y + '-' + pad2(r.solar.m) + '-' + pad2(r.solar.d);
    var tKey = r.time ? pad2(r.time.h) + pad2(r.time.mi) : 'unknown';
    var life = drawSixFromSeed(iso + '|' + tKey + '|life');
    var luck = todayLuck(entry, r), yongNums = luck.nums, lEl = luck.el;
    cur.life = life; cur.yongNums = yongNums;
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">행운의 번호</h2><span class="sec-meta">LOTTO 6/45</span></div>' +
      '<p class="helper">평생 번호는 사주 원국으로 한 번 정해지고, 오늘의 행운 번호는 오늘 ' + esc(entry.name) + '님에게 행운을 주는 ' + MS.EL_K[lEl] + '(' + MS.EL_H[lEl] + ') 기운의 숫자(' + EL_TEXT[lEl].num.join('·') + ')로 끝나는 번호 3개를 담아 매일 바뀌어요.</p>' +
      '<button class="btn-primary btn-block" id="btnDraw">행운의 번호 뽑기</button>' +
      '<div id="numWrap" hidden class="view" style="gap:18px">' +
      '<div class="num-set"><div class="lab">평생 행운 번호 <small>고정</small></div><div class="balls" id="ballsLife">' + life.map(function(n){ return '<div class="ball pre">' + n + '</div>'; }).join('') + '</div></div>' +
      '<div class="num-set"><div class="lab">오늘의 행운 번호 <small>' + todayStr() + ' · 행운 숫자 ' + EL_TEXT[lEl].num.join('·') + '</small></div><div class="balls" id="ballsYong">' + yongNums.map(function(o){ return '<div class="ball pre' + (o.y ? ' yong ' + EL_CLASS[lEl] : '') + '">' + o.n + '</div>'; }).join('') + '</div></div>' +
      '<div class="row"><button class="btn-ghost grow" id="btnCopyRes">결과 복사</button><button class="btn-soft grow" id="btnShareRes">공유하기</button></div>' +
      '<p class="disclaimer">재미로 즐기는 콘텐츠이며 실제 당첨을 보장하지 않습니다.</p></div></div>';

    h += '<p class="disclaimer">전통 명리 이론을 바탕으로 계산한 참고용 풀이예요. 절기가 바뀌는 시각 전후 10분 이내에 태어났다면 월주가 달라질 수 있어요.</p>';

    $('resultBody').innerHTML = h;
    show('result', asTab ? 'saju' : prevView === 'today' ? 'today' : prevView === 'gunghap' ? 'gunghap' : 'saju');
    drawOn($('posterFig'));
    var du = $('duScroll').querySelector('.now');
    if (du) $('duScroll').scrollLeft = du.offsetLeft - 60;
    if (!reduceMotion && window.gsap) gsap.from('#resultBody .el-bar .fill', { scaleX:0, duration:.9, ease:'power2.out', stagger:.06, delay:.2 });

    $('btnDraw').onclick = function(){
      $('numWrap').hidden = false; this.hidden = true;
      revealBalls($('ballsLife')); setTimeout(function(){ revealBalls($('ballsYong')); }, 450);
    };
    $('btnImgRes').onclick = function(){ shareResultImage(entry, r); };
    $('btnCopyRes').onclick = function(){ copyText(summaryText(), '결과를 복사했어요'); };
    $('btnShareRes').onclick = function(){
      var ig0 = ILGAN[P.day.stem];
      openShare({ sheetTitle:'사주 풀이 공유', title:entry.name + '님의 사주 · ' + P.day.name + '(' + P.day.hanja + ')일주', desc:ig0.t + ' — ' + ig0.img,
        fig:figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
        text:'[운수] ' + entry.name + '님의 사주\n' + P.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · ' + P.day.name + '(' + P.day.hanja + ')일주\n일간 ' + ig0.t + ' — ' + ig0.img,
        cta:'생년월일만 넣으면 내 여덟 글자도 풀어 줘요 →', link:linkFor('') });
    };
  }

  /* ---- 결과 이미지 카드 (1080×1350, 공유·저장용) ---- */
  var EL_HEX = ['#6fd88a','#ff8a73','#f0c35b','#e3e9f5','#6aa8ff'];
  function resultCardCanvas(entry, r, done){
    var P = r.pillars, c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    var g = c.getContext('2d'), F = '"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif', H = '"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif';
    var bg = g.createLinearGradient(0,0,0,1350); bg.addColorStop(0,'#070b24'); bg.addColorStop(.55,'#101650'); bg.addColorStop(1,'#2a1a6e');
    g.fillStyle = bg; g.fillRect(0,0,1080,1350);
    [[200,260,520,'rgba(76,128,255,.28)'],[900,420,480,'rgba(140,90,250,.30)'],[540,1250,560,'rgba(100,80,240,.25)']].forEach(function(o){
      var rg = g.createRadialGradient(o[0],o[1],0,o[0],o[1],o[2]); rg.addColorStop(0,o[3]); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0,0,1080,1350); });
    for (var i = 0; i < 70; i++){ g.fillStyle = 'rgba(230,240,255,' + (Math.random()*.6+.2) + ')'; g.beginPath(); g.arc(Math.random()*1080, Math.random()*1350, Math.random()*1.8+.5, 0, 6.283); g.fill(); }
    function rr(x,y,w,h,rad){ g.beginPath(); g.moveTo(x+rad,y); g.arcTo(x+w,y,x+w,y+h,rad); g.arcTo(x+w,y+h,x,y+h,rad); g.arcTo(x,y+h,x,y,rad); g.arcTo(x,y,x+w,y,rad); g.closePath(); }
    g.textAlign = 'center'; g.fillStyle = '#b9c8ff'; g.font = '500 34px ' + F; g.fillText('운수 運數  ·  나의 사주 리포트', 540, 96);
    g.fillStyle = '#fff'; g.font = '700 64px ' + F; g.fillText(entry.name + '님', 540, 650);
    g.fillStyle = '#c9d4ff'; g.font = '400 34px ' + F; g.fillText(P.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · ' + P.day.name + '(' + P.day.hanja + ')일주', 540, 706);
    /* 사주 네 기둥 */
    var keys = ['hour','day','month','year'], lab = {hour:'시주',day:'일주',month:'월주',year:'년주'};
    keys.forEach(function(k, i){
      var x = 120 + i*205, y = 750, p = P[k];
      rr(x, y, 185, 250, 26); g.fillStyle = k === 'day' ? 'rgba(124,86,246,.38)' : 'rgba(255,255,255,.07)'; g.fill();
      g.strokeStyle = k === 'day' ? 'rgba(190,170,255,.8)' : 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#9fb0e8'; g.font = '500 26px ' + F; g.fillText(lab[k], x+92, y+42);
      if (!p){ g.fillStyle = 'rgba(255,255,255,.4)'; g.font = '400 30px ' + F; g.fillText('모름', x+92, y+150); return; }
      g.font = '700 80px ' + H; g.fillStyle = EL_HEX[p.sEl]; g.fillText(p.sh, x+92, y+137);
      g.fillStyle = EL_HEX[p.bEl]; g.fillText(p.bh, x+92, y+226);
    });
    /* 오행 막대 */
    var mx = Math.max.apply(null, r.cnt.concat([1]));
    for (var e = 0; e < 5; e++){
      var y2 = 1050 + e*40;
      g.textAlign = 'left'; g.fillStyle = '#dfe6ff'; g.font = '500 28px ' + F; g.fillText(MS.EL_H[e] + ' ' + MS.EL_K[e], 130, y2+10);
      rr(270, y2-10, 560, 22, 11); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
      if (r.cnt[e]){ rr(270, y2-10, Math.max(22, 560*r.cnt[e]/mx), 22, 11); g.fillStyle = EL_HEX[e]; g.fill(); }
      g.fillStyle = '#fff'; g.fillText(String(r.cnt[e]), 860, y2+10);
    }
    g.textAlign = 'center'; g.fillStyle = '#c9d4ff'; g.font = '500 30px ' + F;
    g.fillText('일간 ' + P.day.sh + ' · ' + ILGAN[P.day.stem].t + '  |  용신 ' + MS.EL_H[r.yong] + MS.EL_K[r.yong], 540, 1280);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '400 26px ' + F; g.fillText(shortUrl(linkFor('')), 540, 1322);
    /* 동물 일러스트 */
    var svg = figSVG(r.animal, ANIMAL_EL[r.animal]).replace('<svg ', '<svg width="560" height="560" ');
    var im = new Image();
    im.onload = function(){ g.drawImage(im, 260, 120, 560, 560); done(c); };
    im.onerror = function(){ done(c); };
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function shareResultImage(entry, r){
    toast('이미지를 만드는 중이에요…');
    resultCardCanvas(entry, r, function(c){
      c.toBlob(function(blob){
        if (!blob){ toast('이미지를 만들지 못했어요'); return; }
        var file = null; try { file = new File([blob], 'unsu-saju.png', { type:'image/png' }); } catch(_){}
        if (file && navigator.canShare && navigator.canShare({ files:[file] })){
          navigator.share({ files:[file], title:'운수 · ' + entry.name + '님의 사주', text:'[운수] ' + entry.name + '님의 사주 리포트' }).catch(function(){});
        } else {
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'unsu-saju-' + entry.name + '.png';
          document.body.appendChild(a); a.click(); a.remove(); toast('이미지를 저장했어요');
        }
      }, 'image/png');
    });
  }
  function summaryText(){
    var e = cur.entry, r = cur.r, P = r.pillars;
    var g = ['hour','day','month','year'].map(function(k){ return P[k] ? P[k].hanja : '??'; }).join(' ');
    return '운수 — ' + e.name + '님의 사주\n' +
      '원국(시일월년): ' + g + '\n' +
      P.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · 일간 ' + ILGAN[P.day.stem].t + ' (' + ILGAN[P.day.stem].img + ')\n' +
      '오행 목' + r.cnt[0] + ' 화' + r.cnt[1] + ' 토' + r.cnt[2] + ' 금' + r.cnt[3] + ' 수' + r.cnt[4] + ' · ' + r.strength + ' · 용신 ' + MS.EL_K[r.yong] + '\n' +
      '평생 번호: ' + cur.life.join(', ') + '\n오늘의 행운 번호: ' + cur.yongNums.map(function(o){ return o.n; }).join(', ');
  }

  /* =========================================================
     별자리
     ========================================================= */
  var ZODIAC = [
    {name:'염소자리', en:'Capricorn', el:'earth', glyph:'♑', s:[12,22], e:[1,19]},
    {name:'물병자리', en:'Aquarius', el:'air', glyph:'♒', s:[1,20], e:[2,18]},
    {name:'물고기자리', en:'Pisces', el:'water', glyph:'♓', s:[2,19], e:[3,20]},
    {name:'양자리', en:'Aries', el:'fire', glyph:'♈', s:[3,21], e:[4,19]},
    {name:'황소자리', en:'Taurus', el:'earth', glyph:'♉', s:[4,20], e:[5,20]},
    {name:'쌍둥이자리', en:'Gemini', el:'air', glyph:'♊', s:[5,21], e:[6,21]},
    {name:'게자리', en:'Cancer', el:'water', glyph:'♋', s:[6,22], e:[7,22]},
    {name:'사자자리', en:'Leo', el:'fire', glyph:'♌', s:[7,23], e:[8,22]},
    {name:'처녀자리', en:'Virgo', el:'earth', glyph:'♍', s:[8,23], e:[9,22]},
    {name:'천칭자리', en:'Libra', el:'air', glyph:'♎', s:[9,23], e:[10,23]},
    {name:'전갈자리', en:'Scorpio', el:'water', glyph:'♏', s:[10,24], e:[11,22]},
    {name:'사수자리', en:'Sagittarius', el:'fire', glyph:'♐', s:[11,23], e:[12,21]}
  ];
  var ZORDER = ['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'];
  function zByName(n){ return ZODIAC.filter(function(z){ return z.name === n; })[0]; }
  function getZodiac(month, day){
    for (var i = 0; i < ZODIAC.length; i++){ var z = ZODIAC[i]; if ((month === z.s[0] && day >= z.s[1]) || (month === z.e[0] && day <= z.e[1])) return z; }
    return ZODIAC[0];
  }
  var EL_LABEL = { fire:'불', earth:'흙', air:'바람', water:'물' };
  var myZ = null;
  function renderZGrid(){
    $('zGrid').innerHTML = ZORDER.map(function(n){
      var z = zByName(n);
      return '<button class="zt' + (myZ === n ? ' me' : '') + '" data-z="' + n + '">' + figSVG(n, z.el, 'mini') + '<span class="zn">' + z.glyph + ' ' + n + '</span><span class="zd">' + z.s[0] + '.' + z.s[1] + '–' + z.e[0] + '.' + z.e[1] + '</span></button>';
    }).join('');
  }
  renderZGrid();
  $('btnZHomeBack').onclick = function(){ go('today'); };
  $('zGrid').addEventListener('click', function(e){ var b = e.target.closest('[data-z]'); if (b) openZodiac(zByName(b.dataset.z), null); });
  $('btnZFind').onclick = function(){
    var v = $('zBirth').value, b = parseBirth(v), hint = $('zHint');
    hint.className = 'field-hint';
    var dt = b && new Date(Date.UTC(b.y, b.m-1, b.d));
    if (!b || dt.getUTCMonth() !== b.m-1 || dt.getUTCDate() !== b.d || dt > new Date()){ hint.className = 'field-hint err'; hint.textContent = '양력 생년월일 8자리를 확인해 주세요'; return; }
    store('unsu_zbirth', v);
    var z = getZodiac(b.m, b.d); myZ = z.name; renderZGrid();
    openZodiac(z, b.y + '-' + pad2(b.m) + '-' + pad2(b.d));
  };
  (function(){ var v = store('unsu_zbirth'); if (v){ $('zBirth').value = v; var b = parseBirth(v); if (b){ myZ = getZodiac(b.m, b.d).name; renderZGrid(); } } })();

  function openZodiac(z, iso){
    setTimeout(function(){ bond('zodiac'); }, 900);
    var doy = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    var seed = iso ? iso + '|unknown|' + todayStr() : z.name + '|' + todayStr();
    var nums = drawSixFromSeed(seed);
    var h = '<div class="flow-header"><button class="icon-back" id="btnZBack" aria-label="뒤로">‹</button><span class="ttl">별자리 운세 · ' + todayStr() + '</span></div>';
    h += '<div class="poster"><div class="poster-frame">' +
      '<div class="poster-corner l">TWELVE<br>CONSTELLATION</div><div class="poster-corner r">' + z.glyph + '<br>' + EL_LABEL[z.el] + '의 별자리</div>' +
      '<div class="poster-side l">LIFE IS MOVEMENT</div><div class="poster-side r">STARS · ' + z.en.toUpperCase() + '</div>' +
      '<div class="poster-fig" id="zFig">' + figSVG(z.name, z.el) + '</div>' +
      '<div class="poster-name">' + z.en + ' <span style="font-weight:400">' + z.name + '</span></div>' +
      '<div class="poster-sub">' + z.s[0] + '월 ' + z.s[1] + '일 ~ ' + z.e[0] + '월 ' + z.e[1] + '일</div>' +
      '<div class="chip-row" style="justify-content:center;margin-top:10px">' + ZODIAC_TRAITS[z.name].map(function(t){ return '<span class="chip">' + t + '</span>'; }).join('') + '</div>' +
      '</div></div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">' + z.name + '의 성향</h2><span class="sec-meta">' + z.en + '</span></div><p class="body-text">' + ZODIAC_BLURB[z.name] + '</p>' +
      '<div class="divider"></div><div class="eyebrow"><span class="line"></span>오늘의 기운<span class="line right"></span></div>' +
      '<p class="body-text">' + FLAVOR[z.el] + '</p><p class="helper">' + DAILY_LINES[doy % DAILY_LINES.length] + ' (매일 바뀌어요)</p>' +
      '<button class="btn-primary btn-block" id="btnZDraw">오늘의 행운 번호 뽑기</button>' +
      '<div id="zNums" hidden class="view" style="gap:14px"><div class="balls" id="ballsZ">' + nums.map(function(n){ return '<div class="ball pre">' + n + '</div>'; }).join('') + '</div>' +
      '<div class="row"><button class="btn-ghost grow" id="btnZCopy">결과 복사</button><button class="btn-soft grow" id="btnZShare">공유하기</button></div>' +
      '<p class="disclaimer">재미로 즐기는 콘텐츠이며 실제 당첨을 보장하지 않습니다.</p></div></div>';
    $('zResult').innerHTML = h;
    $('zHome').hidden = true; $('zResult').hidden = false; window.scrollTo(0, 0);
    drawOn($('zFig'));
    $('btnZBack').onclick = function(){ $('zResult').hidden = true; $('zHome').hidden = false; };
    $('btnZDraw').onclick = function(){ $('zNums').hidden = false; this.hidden = true; revealBalls($('ballsZ')); };
    var txt = '운수 — ' + z.name + '(' + z.en + ') ' + todayStr() + '\n오늘의 행운 번호: ' + nums.join(', ');
    $('btnZCopy').onclick = function(){ copyText(txt, '결과를 복사했어요'); };
    $('btnZShare').onclick = function(){
      openShare({ sheetTitle:'별자리 운세 공유', title:'오늘의 ' + z.name + ' (' + z.en + ')', desc:'오늘의 행운 번호 ' + nums.join(' · '),
        fig:figSVG(z.name, z.el, 'mini'),
        text:'[운수] 오늘의 ' + z.name + '(' + z.en + ') 운세\n행운 번호 ' + nums.join(' · '),
        cta:'내 별자리 운세도 보기 →', link:linkFor('zodiac') });
    };
  }

  /* =========================================================
     내 번호 채우기
     ========================================================= */
  var selected = [], lastFill = [];
  var grid = $('numberGrid');
  for (var n = 1; n <= 45; n++){
    (function(num){
      var c = document.createElement('button'); c.type = 'button'; c.className = 'num-cell'; c.textContent = num;
      c.onclick = function(){
        var i = selected.indexOf(num);
        if (i > -1){ selected.splice(i, 1); c.classList.remove('selected'); }
        else { if (selected.length >= 6){ toast('6개까지 고를 수 있어요'); return; } selected.push(num); c.classList.add('selected'); }
        $('fillCount').textContent = selected.length;
      };
      grid.appendChild(c);
    })(n);
  }
  $('btnAutofill').onclick = function(){
    var pool = []; for (var i = 1; i <= 45; i++) if (selected.indexOf(i) === -1) pool.push(i);
    var res = selected.slice();
    while (res.length < 6){ var ix = Math.floor(Math.random()*pool.length); res.push(pool[ix]); pool.splice(ix, 1); }
    res.sort(function(a,b){ return a-b; }); lastFill = res;
    $('ballsFill').hidden = $('fillResultActions').hidden = $('fillDisclaimer').hidden = false;
    $('ballsFill').innerHTML = res.map(function(x){ return '<div class="ball pre ' + (selected.indexOf(x) > -1 ? 'picked' : 'auto') + '">' + x + '</div>'; }).join('');
    revealBalls($('ballsFill'));
    var rk = lottoRank(res);
    $('fillCompare').hidden = false;
    $('fillCompare').innerHTML = '제' + LOTTO_LATEST.no + '회 1등 번호로 맞춰 보면 <b>' + rk.hit + '개 일치' + (rk.bonus ? ' + 보너스' : '') + '</b>' + (rk.rank !== '낙첨' ? ' · ' + rk.rank + '!' : '');
  };
  $('btnResetGrid').onclick = function(){
    selected = []; $('fillCount').textContent = '0';
    grid.querySelectorAll('.num-cell').forEach(function(c){ c.classList.remove('selected'); });
    $('ballsFill').hidden = $('fillResultActions').hidden = $('fillDisclaimer').hidden = $('fillCompare').hidden = true; $('ballsFill').innerHTML = '';
  };
  $('btnCopyFill').onclick = function(){ copyText('운수 — 내 번호 채우기\n' + lastFill.join(', '), '번호를 복사했어요'); };

  /* =========================================================
     대표 사주 · 엽전 · 바텀시트 · 광고 목업
     ========================================================= */
  function getMe(){ var id = store('unsu_me'), l = getList(); return l.filter(function(x){ return x.id === id; })[0] || null; }
  function setMe(id){ store('unsu_me', id); }
  function updateSegCount(){ var n = getList().length; document.querySelectorAll('.seg-n').forEach(function(s){ s.textContent = n ? n : ''; }); }
  function entryISO(e, r){ return r.solar.y + '-' + pad2(r.solar.m) + '-' + pad2(r.solar.d); }
  function entryTKey(r){ return r.time ? pad2(r.time.h) + pad2(r.time.mi) : 'unknown'; }
  /* 하루 한 가지 '행운 기운' → 행운의 팁 숫자 · 오늘의 행운 번호 · 결과 화면이 모두 같은 값을 쓴다 */
  function todayLuck(entry, r){
    var f = DAILY.today(entry, r, new Date());
    var nums = drawYongNumbers(entryISO(entry, r) + '|' + entryTKey(r) + '|' + todayStr() + '|luck', f.luckyEl);
    return { f:f, el:f.luckyEl, nums:nums };
  }
  function ymd(d){ return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }
  var WD = ['일','월','화','수','목','금','토'];
  var SH_IC = {
    send:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
    link:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11.5 4.4"/><path d="M14 11a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7.1 7.1l1.3-1.3"/></svg>',
    heart:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/></svg>'
  };

  var COIN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var GH_COST = 30, AD_REWARD = 20, AD_LIMIT = 3;

  var SIGNUP_COINS = 1000;
  function isGuest(){ return !NS && !store('unsu_auth'); }
  function getCoins(){ var c = store('unsu_coin'); return typeof c === 'number' ? c : 0; }
  function renderCoin(bump){
    $('coinChip').classList.toggle('guest', isGuest());
    $('coinVal').textContent = isGuest() ? SIGNUP_COINS.toLocaleString() + '닢 받기' : getCoins();
    if (bump && !reduceMotion){ var c = $('coinChip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  function addCoins(n, why){
    if (isGuest()) return;   /* 로그인하지 않으면 엽전을 쌓지 않는다 */
    store('unsu_coin', Math.max(0, getCoins() + n));
    var log = store('unsu_coinlog'); if (!Array.isArray(log)) log = [];
    log.unshift({ t:Date.now(), n:n, why:why }); if (log.length > 30) log.length = 30;
    store('unsu_coinlog', log);
    renderCoin(true);
    if (n > 0) setTimeout(function(){ coinBurst(n, why); }, 250);
  }

  /* ---- 엽전 획득 연출: 금빛 엽전이 튀어 올라 상단 엽전 칸으로 날아간다 ---- */
  var COIN_FX_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="cfG" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#f0c35b"/><stop offset="1" stop-color="#a8721a"/></radialGradient></defs>' +
    '<circle cx="32" cy="32" r="30" fill="url(#cfG)" stroke="#8a5a12" stroke-width="2"/><circle cx="32" cy="32" r="24" fill="none" stroke="rgba(120,74,10,.55)" stroke-width="2"/>' +
    '<rect x="23" y="23" width="18" height="18" rx="2" fill="#1a1245" stroke="#8a5a12" stroke-width="2"/><path d="M14 20a22 22 0 0 1 14-9" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-linecap="round"/></svg>';
  function coinBurst(n, why){
    var big = n >= 100, chip = $('coinChip'), cr = chip && !chip.hidden ? chip.getBoundingClientRect() : { left:window.innerWidth - 120, top:24, width:90, height:36 };
    var tx = cr.left + cr.width / 2, ty = cr.top + cr.height / 2;
    var el = document.createElement('div'); el.className = 'cfx' + (big ? ' big' : ''); el.setAttribute('role', 'status');
    var label = '+' + n.toLocaleString() + ' 엽전';
    el.innerHTML = (big ? '<div class="cfx-glow"></div><div class="cfx-main">' + COIN_FX_SVG + '</div>' : '') +
      '<div class="cfx-txt"><b id="cfxNum">' + (reduceMotion ? label : '+0') + '</b><small>' + esc(why || '') + '</small></div>';
    document.body.appendChild(el);
    var life = big ? 2600 : 1500;
    if (reduceMotion){ setTimeout(function(){ el.remove(); }, big ? 1600 : 1200); return; }
    var W2 = window.innerWidth, H2 = window.innerHeight, ox = W2 / 2, oy = big ? H2 * .42 : H2 * .3;
    var main = el.querySelector('.cfx-main');
    if (main) main.animate([{ transform:'translateY(60px) scale(.2) rotateY(0deg)', opacity:0 }, { transform:'translateY(-14px) scale(1.15) rotateY(540deg)', opacity:1, offset:.6 }, { transform:'translateY(0) scale(1) rotateY(720deg)', opacity:1 }], { duration:900, easing:'cubic-bezier(.2,.9,.3,1.1)', fill:'forwards' });
    /* 숫자 올라가기 */
    var num = $('cfxNum'), t0 = performance.now(), dur = big ? 1100 : 600;
    (function tick(now){ var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); num.textContent = '+' + Math.round(n * e).toLocaleString() + ' 엽전'; if (k < 1 && el.isConnected) requestAnimationFrame(tick); })(t0);
    /* 튀어나온 엽전들이 엽전 칸으로 */
    var cnt = big ? 16 : 6;
    for (var i = 0; i < cnt; i++) (function(i){
      var c = document.createElement('div'); c.className = 'cfx-c'; c.innerHTML = COIN_FX_SVG; el.appendChild(c);
      var ang = (Math.PI * 2 * i) / cnt + Math.random() * .5, rad = (big ? 90 : 46) + Math.random() * (big ? 90 : 40);
      var mx = ox + Math.cos(ang) * rad, my = oy + Math.sin(ang) * rad - 30, sz = (big ? 26 : 22) + Math.random() * 8;
      c.style.width = c.style.height = sz + 'px';
      var d0 = 250 + i * (big ? 55 : 70);
      c.animate([
        { transform:'translate(' + (ox - sz / 2) + 'px,' + (oy - sz / 2) + 'px) scale(.3) rotate(0deg)', opacity:0 },
        { transform:'translate(' + (mx - sz / 2) + 'px,' + (my - sz / 2) + 'px) scale(1) rotate(' + (180 + Math.random() * 180) + 'deg)', opacity:1, offset:.35 },
        { transform:'translate(' + (tx - sz / 2) + 'px,' + (ty - sz / 2) + 'px) scale(.35) rotate(540deg)', opacity:.9 }
      ], { duration:900, delay:d0, easing:'cubic-bezier(.4,0,.2,1)', fill:'both' }).onfinish = function(){ c.remove(); if (chip && !chip.hidden){ chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); } };
    })(i);
    setTimeout(function(){ el.classList.add('out'); setTimeout(function(){ el.remove(); }, 350); }, life);
    if (big) el.onclick = function(){ el.remove(); };
  }
  function adCount(){ var a = store('unsu_ad'); return a && a.d === todayStr() ? a.n : 0; }
  function useAd(){ store('unsu_ad', { d:todayStr(), n:adCount() + 1 }); }

  /* ---- bottom sheet ---- */
  var sheetReturn = null;
  function openSheet(html){
    sheetReturn = document.activeElement;
    $('sheetBody').innerHTML = html;
    $('sheetWrap').hidden = false;
    document.body.style.overflow = 'hidden';
    $('sheet').scrollTop = 0; $('sheet').focus();
  }
  function closeSheet(){
    if ($('sheetWrap').hidden) return;
    $('sheetWrap').hidden = true; document.body.style.overflow = '';
    if (sheetReturn && sheetReturn.focus) sheetReturn.focus();
  }
  $('sheetBackdrop').onclick = closeSheet;
  $('sheet').addEventListener('click', function(e){ if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ closeSheet(); } });

  /* ---- 보상형 광고 목업: 끝까지 봐야 보상 ---- */
  var adTimer = 0, adDone = null, adFinished = false;
  function playAd(onReward){
    adDone = onReward; adFinished = false;
    var total = 5, left = total, ring = $('adRing');
    $('adOverlay').hidden = false; document.body.style.overflow = 'hidden';
    $('adClaim').disabled = true; $('adSec').textContent = left;
    $('adMsg').textContent = '끝까지 보면 보상을 받을 수 있어요';
    ring.style.transition = 'none'; ring.style.strokeDashoffset = '326.7';
    clearInterval(adTimer);
    adTimer = setInterval(function(){
      left--; $('adSec').textContent = Math.max(0, left);
      ring.style.transition = 'stroke-dashoffset 1s linear';
      ring.style.strokeDashoffset = String(326.7 * Math.max(0, left) / total);
      if (left <= 0){ clearInterval(adTimer); adFinished = true; $('adClaim').disabled = false; $('adMsg').textContent = '광고 시청 완료! 보상을 받아 가세요'; $('adSec').innerHTML = CHECK_SVG.replace('<svg', '<svg width="40" height="40"'); }
    }, 1000);
    $('adClaim').focus();
  }
  function closeAd(){ clearInterval(adTimer); $('adOverlay').hidden = true; document.body.style.overflow = ''; }
  $('adClose').onclick = function(){
    if (!adFinished){ closeAd(); toast('광고를 끝까지 보지 않아 보상이 지급되지 않았어요'); return; }
    closeAd();
  };
  $('adClaim').onclick = function(){ if (!adFinished) return; closeAd(); var f = adDone; adDone = null; if (f) f(); };

  $('coinChip').onclick = openCoinSheet;
  $('fsBtn').onclick = openFsSheet;
  function openCoinSheet(){
    if (isGuest()){ openLoginSheet('처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요. 엽전은 출석·광고로 더 모으고, 상세 궁합 같은 리포트를 여는 데 쓸 수 있어요.'); return; }
    var log = store('unsu_coinlog'); if (!Array.isArray(log)) log = [];
    var a = getAtt(), doneToday = !!a.days[todayStr()], left = 7 - (streakOf(a) % 7), used = adCount();
    var h = '<h3 id="sheetTitle">내 엽전 ' + getCoins() + '닢</h3>' +
      '<div class="eyebrow"><span class="line"></span>모으기<span class="line right"></span></div><div class="tip-list" style="margin:12px 0 18px">' +
      '<div class="earn-row"><div><div class="t">매일 출석 +10</div><div class="s">오늘의 운세를 열면 자동으로 출석돼요</div></div><span class="chip" style="color:' + (doneToday ? '#8fdcaa' : 'var(--text-helper)') + '">' + (doneToday ? '오늘 완료' : '대기') + '</span></div>' +
      '<div class="earn-row"><div><div class="t">7일 연속 보너스 +30</div><div class="s">' + (left === 7 ? '이번 주기 보너스를 받았어요' : '앞으로 ' + left + '일 더 출석하면 받아요') + '</div></div><button class="btn-ghost" id="csCal" style="padding:9px 14px;font-size:calc(12.5px*var(--fs))">캘린더</button></div>' +
      '<div class="earn-row"><div><div class="t">광고 보고 +' + AD_REWARD + '</div><div class="s">하루 ' + AD_LIMIT + '번 · 오늘 ' + used + '/' + AD_LIMIT + '</div></div><button class="btn-soft" id="csAd" style="padding:9px 14px;font-size:calc(12.5px*var(--fs))"' + (used >= AD_LIMIT ? ' disabled' : '') + '>' + (used >= AD_LIMIT ? '내일 다시' : '광고 보기') + '</button></div>' +
      '</div><div class="eyebrow"><span class="line"></span>쓰기<span class="line right"></span></div>' +
      '<button class="row-link" id="csGh" style="border-top:none;margin:4px 0 16px"><span class="ic" style="color:#f3dca0">' + COIN_SVG + '</span><span>상세 궁합 리포트 열기<br><span class="helper">' + GH_COST + '닢 · 한 번 열면 계속 볼 수 있어요</span></span><span class="chev">›</span></button>' +
      '<div class="eyebrow"><span class="line"></span>최근 내역<span class="line right"></span></div><div class="ledger">' +
      (log.length ? log.slice(0, 8).map(function(x){ var d = new Date(x.t); return '<div><span>' + (d.getMonth()+1) + '.' + d.getDate() + ' ' + esc(x.why) + '</span><b class="' + (x.n < 0 ? 'minus' : '') + '">' + (x.n > 0 ? '+' : '') + x.n + '</b></div>'; }).join('') : '<div><span>아직 내역이 없어요</span></div>') +
      '</div><button class="btn-primary btn-block" data-close>확인</button>';
    openSheet(h);
    $('csAd').onclick = function(){
      if (adCount() >= AD_LIMIT) return;
      closeSheet();
      playAd(function(){ useAd(); addCoins(AD_REWARD, '광고 보상'); toast('엽전 +' + AD_REWARD + '닢을 받았어요'); openCoinSheet(); });
    };
    $('csGh').onclick = function(){ closeSheet(); go('gunghap'); };
    $('csCal').onclick = function(){ var me = getMe(); if (!me) return; openAttSheet(me, compute(me)); };
  }

  /* =========================================================
     출석
     ========================================================= */
  function getAtt(){ var a = store('unsu_att'); return a && a.days ? a : { days:{} }; }
  function streakOf(a){ var d = new Date(), n = 0; while (a.days[ymd(d)]){ n++; d.setDate(d.getDate() - 1); } return n; }
  function attend(){
    var a = getAtt(), k = todayStr();
    if (a.days[k]) return { newly:false };
    a.days[k] = 1; store('unsu_att', a);
    var st = streakOf(a);
    addCoins(10, '출석 체크');
    var bonus = st > 0 && st % 7 === 0;
    if (bonus) addCoins(30, st + '일 연속 출석 보너스');
    return { newly:true, streak:st, bonus:bonus };
  }
  var calOffset = 0, justStamped = false;
  function calendarHTML(){
    var a = getAtt(), now = new Date(); now.setHours(0,0,0,0);
    var base = new Date(now.getFullYear(), now.getMonth() + calOffset, 1);
    var y = base.getFullYear(), m = base.getMonth();
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    var monthCnt = 0;
    var h = '<div class="cal-head"><button class="cal-nav-btn" id="calPrev" aria-label="이전 달"' + (calOffset <= -11 ? ' disabled' : '') + '>‹</button><b>' + y + '년 ' + (m+1) + '월</b><button class="cal-nav-btn" id="calNext" aria-label="다음 달"' + (calOffset >= 0 ? ' disabled' : '') + '>›</button></div>';
    h += '<div class="att-grid">' + WD.map(function(w){ return '<span class="wd">' + w + '</span>'; }).join('');
    for (var i = 0; i < first; i++) h += '<span></span>';
    for (var d = 1; d <= days; d++){
      var dt = new Date(y, m, d), k = ymd(dt), done = !!a.days[k], isT = dt.getTime() === now.getTime(), fut = dt > now;
      if (done) monthCnt++;
      var cls = 'att' + (fut ? ' future' : done ? ' done' : ' lock') + (isT ? ' is-today' : '') + (isT && justStamped ? ' stamp' : '');
      h += '<button class="' + cls + '" data-day="' + k + '"' + (fut ? ' disabled' : '') + ' aria-label="' + (m+1) + '월 ' + d + '일 ' + (done ? '출석함' : fut ? '' : '잠김') + '">' + d + '<span class="mk">' + (fut ? '' : done ? CHECK_SVG : LOCK_SVG) + '</span></button>';
    }
    h += '</div>';
    var st = streakOf(a), toBonus = 7 - (st % 7);
    h += '<div class="att-stats"><div><b>' + st + '일</b><span>연속 출석</span></div><div><b>' + monthCnt + '일</b><span>' + (m+1) + '월 출석</span></div><div><b>' + toBonus + '일</b><span>보너스까지</span></div></div>';
    return h;
  }
  function attStripHTML(stampToday){
    var a = getAtt(), st = streakOf(a), cells = '';
    for (var i = 6; i >= 0; i--){
      var d = new Date(); d.setDate(d.getDate() - i);
      var done = !!a.days[ymd(d)], isT = i === 0;
      cells += '<span class="as-d' + (done ? ' on' : '') + (isT ? ' t' : '') + (isT && stampToday ? ' stamp' : '') + '"><i>' + (done ? CHECK_SVG : '') + '</i>' + WD[d.getDay()] + '</span>';
    }
    var left = 7 - (st % 7);
    return '<button class="att-strip" id="btnAtt" aria-label="출석 캘린더 열기"><span class="as-txt"><b>출석 ' + st + '일째</b><small>' + (isGuest() ? '로그인하면 출석마다 엽전을 모아요' : left === 7 ? '오늘 보너스 +30닢 받았어요' : '연속 보너스까지 ' + left + '일') + '</small></span><span class="as-week">' + cells + '</span><span class="chev">›</span></button>';
  }
  function openAttSheet(me, r){
    calOffset = 0;
    openSheet('<h3 id="sheetTitle">운세 캘린더</h3><p class="helper" style="margin:-10px 0 16px">출석한 날의 운세는 언제든 다시 볼 수 있어요. 매일 +10닢, 7일 연속이면 +30닢.</p><div id="calWrap" class="view" style="gap:14px">' + calendarHTML() + '</div><button class="btn-primary btn-block" data-close style="margin-top:18px">확인</button>');
    justStamped = false;
    bindCalendar(me, r);
  }
  function bindCalendar(me, r){
    $('calPrev').onclick = function(){ calOffset--; justStamped = false; $('calWrap').innerHTML = calendarHTML(); bindCalendar(me, r); };
    $('calNext').onclick = function(){ calOffset++; justStamped = false; $('calWrap').innerHTML = calendarHTML(); bindCalendar(me, r); };
    $('calWrap').querySelectorAll('[data-day]').forEach(function(b){
      b.onclick = function(){
        if (b.classList.contains('lock')){ toast('출석하지 않은 날의 운세는 다시 볼 수 없어요'); return; }
        var p = b.dataset.day.split('-');
        var f = DAILY.today(me, r, new Date(+p[0], +p[1]-1, +p[2]));
        openSheet('<div class="today-ilj" style="text-align:left">' + f.pillars.day.hanja + '日 · ' + f.ten + '의 날</div><h3 id="sheetTitle" style="margin-top:6px">' + (+p[1]) + '월 ' + (+p[2]) + '일, ' + f.head + '</h3>' + scoreRowsHTML(f) + '<p class="body-text" style="margin:16px 0 22px">' + esc(me.name) + '님, ' + f.body + '</p><div class="row"><button class="btn-ghost grow" id="btnCalBack">캘린더로</button><button class="btn-primary grow" data-close>확인</button></div>');
        $('btnCalBack').onclick = function(){ var off = calOffset; openAttSheet(me, r); if (off){ calOffset = off; $('calWrap').innerHTML = calendarHTML(); bindCalendar(me, r); } };
      };
    });
  }
  function scoreRowsHTML(f){
    var cats = [['w','재물운'],['l','연애운'],['j','직업운']];
    return '<div class="view" style="gap:16px">' + cats.map(function(c){
      var v = f.scores[c[0]];
      return '<div class="score-row"><span class="cat">' + c[1] + '</span><span class="ln">' + f.lines[c[0]] + '</span><span class="sc">' + v + '<small>점</small></span><span class="score-bar"><i style="width:' + v + '%"></i></span></div>';
    }).join('') + '</div>';
  }

  /* =========================================================
     글자 크기 (보통 · 크게 · 아주 크게) — html[data-fs], 이 기기에만 저장
     ========================================================= */
  var FS_LABEL = ['보통', '크게', '아주 크게'];
  function getFs(){ try { var v = parseInt(localStorage.getItem('unsu_fs'), 10); return v >= 0 && v <= 2 ? v : 0; } catch(e){ return 0; } }
  function setFs(v){ try { localStorage.setItem('unsu_fs', String(v)); } catch(e){} document.documentElement.setAttribute('data-fs', String(v)); }
  document.documentElement.setAttribute('data-fs', String(getFs()));
  function fsSegHTML(){
    var cur = getFs();
    return '<div class="fs-seg" role="group" aria-label="글자 크기">' + FS_LABEL.map(function(l, i){
      return '<button type="button" data-fsv="' + i + '" aria-pressed="' + (cur === i) + '"><b style="font-size:' + [17, 21, 25][i] + 'px">가</b><span>' + l + '</span></button>';
    }).join('') + '</div>';
  }
  function bindFsSeg(root){
    root.querySelectorAll('[data-fsv]').forEach(function(b){
      b.onclick = function(){
        var v = +b.dataset.fsv; setFs(v);
        root.querySelectorAll('[data-fsv]').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
        toast('글자 크기를 ' + FS_LABEL[v] + '로 바꿨어요');
      };
    });
  }
  function openFsSheet(){
    openSheet('<h3 id="sheetTitle">글자 크기</h3><p class="body-text" style="margin:-6px 0 12px">눈이 편한 크기를 골라 주세요. 이 기기에 저장되고, 마이 &gt; 설정에서도 바꿀 수 있어요.</p>' +
      fsSegHTML() + '<p class="body-text" style="margin-top:14px">미리보기 · 오늘은 미뤄 둔 약속을 잡기 좋은 날이에요.</p>' +
      '<button class="btn-primary btn-block" data-close style="margin-top:16px">확인</button>');
    bindFsSeg($('sheetBody'));
  }

  /* =========================================================
     2027 정미년 신년운세 — 유료 상품 미리보기 (결제는 PG 연동 후 오픈)
     丁(천간 3) · 未(지지 7)과 내 일간의 십성으로 키워드를 만든다
     ========================================================= */
  var NY = { price:7900, early:5500, open:'12월 14일' };
  var NY_GROUP = [
    { kw:['독립', '경쟁', '내 사람'], line:'내 힘으로 판을 짜는 해예요. 함께 갈 사람과 겨룰 사람을 가려 보는 게 핵심이에요.' },
    { kw:['표현', '재능', '새 시도'], line:'하고 싶은 말과 재능이 밖으로 나오는 해예요. 미뤄 둔 시도를 꺼내기 좋아요.' },
    { kw:['재물', '기회', '움직임'], line:'돈과 기회가 움직이는 해예요. 들어오는 만큼 지키는 방법이 승부를 갈라요.' },
    { kw:['책임', '자리', '인정'], line:'맡는 일이 커지고 자리가 바뀌는 해예요. 부담이 결국 인정으로 돌아와요.' },
    { kw:['배움', '문서', '귀인'], line:'배우고 준비한 것이 문서와 자격으로 남는 해예요. 도와줄 사람이 가까이 있어요.' }
  ];
  var TEN_ORDER = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  function newYear(r){
    var dS = r.pillars.day.stem, sT = MS.tenGod(dS, 3), bT = MS.tenGod(dS, MS.BR_MAIN[7]);
    var g1 = NY_GROUP[Math.floor(TEN_ORDER.indexOf(sT) / 2)], g2 = NY_GROUP[Math.floor(TEN_ORDER.indexOf(bT) / 2)];
    var kw = g1 === g2 ? g1.kw.slice() : [g1.kw[0], g1.kw[1], g2.kw[0]];
    return { sT:sT, bT:bT, stage:MS.stage12(dS, 7), kw:kw, line:g1.line };
  }
  function nyCardHTML(me, r){
    var ny = newYear(r);
    return '<div class="ny-card"><div class="ny-eyebrow">2027 정미년 신년운세 · ' + NY.open + ' 오픈</div>' +
      '<h2 class="ny-title">' + esc(me.name) + '님의 2027년 키워드</h2>' +
      '<div class="ny-kw">' + ny.kw.map(function(k){ return '<span>#' + k + '</span>'; }).join('') + '</div>' +
      '<p class="body-text" style="margin:0">' + ny.line + '</p>' +
      '<button class="btn-primary btn-block" id="btnNY">12개월 운세 미리보기</button></div>';
  }
  /* 신년운세 구조 (확정)
     무료: 1장 총운·키워드 + 총점·분야별 점수 + 1~3월 흐름
     유료: 2~7장 — 월별 12개월 상세, 재물, 직업·학업, 연애·결혼, 건강·조심할 시기, 행운의 색·방향·숫자와 월별 행운 번호 */
  var NY_CHAPTERS = [
    { t:'월별 운세 1월~12월', pv:'1월은 작은 결정이 한 해의 방향을 정해요. 2월에는 오래 미룬 연락이 다시 이어지고' },
    { t:'재물운 · 돈이 들어오는 달', pv:'수입이 늘어나는 달과 지출을 줄여야 하는 달이 뚜렷하게 나뉘어요' },
    { t:'직업 · 학업운', pv:'올해 이직이나 새 도전을 하기 좋은 시기는 상반기 중에서도' },
    { t:'연애 · 결혼운', pv:'인연이 가까워지는 달에는 평소 가지 않던 자리에서 만남이' },
    { t:'건강운과 조심할 시기', pv:'특히 환절기가 겹치는 달에는 무리하지 말고 수면을' },
    { t:'2027 행운의 색 · 방향 · 숫자', pv:'월마다 달라지는 행운의 숫자와 함께 로또 번호도 한 달 단위로' }
  ];
  function nyScores(me, r){
    var rnd = mulberry32(seedHash(entryISO(me, r) + '|' + entryTKey(r) + '|ny2027'));
    var pick = function(lo, hi){ return lo + Math.floor(rnd() * (hi - lo + 1)); };
    var total = pick(68, 94), f = {};
    ['재물', '연애', '직업', '건강'].forEach(function(k){ f[k] = Math.max(55, Math.min(98, total + pick(-12, 10))); });
    var months = []; for (var i = 0; i < 12; i++) months.push(pick(48, 98));
    return { total:total, f:f, months:months };
  }
  function nyPurchaseSheet(me){
    if (isGuest()){
      openLoginSheet('결제는 로그인 후에 진행돼요. 처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢도 드려요. 결제한 리포트는 계정에 보관돼요.');
      return;
    }
    var asked = !!store('unsu_ny_alert');
    var cp = getCoupons().filter(function(c){ return c.t === 'ny1000'; })[0];
    openSheet('<h3 id="sheetTitle">결제 준비 중이에요</h3>' +
      '<p class="body-text">토스페이먼츠 결제 연동을 마무리하고 있어요. ' + NY.open + '에 열리면 기념가 ' + NY.early.toLocaleString() + '원으로 바로 결제할 수 있어요.</p>' +
      (cp ? '<div class="pet-ticket sm" style="margin-top:12px"><small>COUPON 적용 예정</small><b>' + esc(cp.name) + '</b><span>기념가 ' + NY.early.toLocaleString() + '원 → ' + (NY.early - cp.amt).toLocaleString() + '원</span></div>' : '') +
      '<button class="btn-primary btn-block" id="btnNYAlert2"' + (asked ? ' disabled' : '') + ' style="margin-top:12px">' + (asked ? '오픈 알림을 신청했어요' : '오픈 알림 받기') + '</button>' +
      '<button class="text-btn" data-close>닫기</button>');
    if (!asked) $('btnNYAlert2').onclick = function(){ store('unsu_ny_alert', todayStr()); this.disabled = true; this.textContent = '오픈 알림을 신청했어요'; toast('오픈하면 오늘 탭 맨 위에서 알려 드릴게요'); };
  }
  function openNYSheet(me, r){
    setTimeout(function(){ bond('ny'); }, 900);
    var ny = newYear(r), sc = nyScores(me, r), agree = false;
    var bars = '', FREE_M = 3;
    for (var i = 0; i < 12; i++){
      bars += i < FREE_M
        ? '<div class="nm on"><i style="height:' + sc.months[i] + '%"></i><span>' + (i + 1) + '월</span><b>' + sc.months[i] + '</b></div>'
        : '<div class="nm lock"><i style="height:38%"></i><span>' + (i + 1) + '월</span><b>' + LOCK_SVG + '</b></div>';
    }
    var fields = Object.keys(sc.f).map(function(k){ return '<div class="nf"><span>' + k + '</span><i><u style="width:' + sc.f[k] + '%"></u></i><b>' + sc.f[k] + '</b></div>'; }).join('');
    var chap = NY_CHAPTERS.map(function(c, i){ return '<li class="nc"><div class="nc-h"><span>' + (i + 2) + '장 · ' + c.t + '</span>' + LOCK_SVG + '</div><p class="ny-blur" aria-hidden="true">' + c.pv + '</p></li>'; }).join('');
    openSheet('<h3 id="sheetTitle">' + esc(me.name) + '님의 2027 신년운세</h3>' +
      '<p class="helper" style="margin:-4px 0 12px">' + r.pillars.day.name + '(' + r.pillars.day.hanja + ')일주 기준 · 만세력으로 계산</p>' +
      '<div class="ny-score"><div class="big"><b>' + sc.total + '</b><span>점</span><small>2027년 흐름</small></div><div class="nfs">' + fields + '</div></div>' +
      '<div class="ny-open"><b style="color:#f3dca0">1장 · 2027년 한 해의 흐름 (무료)</b><br>' +
      '2027년 정미년(丁未年)의 천간 丁은 ' + esc(me.name) + '님에게 <b>' + ny.sT + '</b>, 지지 未는 <b>' + ny.bT + '</b>의 기운이에요. ' +
      '12운성으로는 <b>' + ny.stage + '</b>의 자리에 서요. ' + ny.line + '</div>' +
      '<h4 class="ny-h">월별 흐름 <small>1~3월 무료 · 4~12월 잠김</small></h4><div class="ny-months">' + bars + '</div>' +
      '<p class="helper" style="text-align:center">가장 좋은 달과 조심할 달은 전체 리포트에서 알려 드려요</p>' +
      '<h4 class="ny-h">전체 리포트에서 열려요 <small>2~7장</small></h4><ul class="ny-chaps">' + chap + '</ul>' +
      '<div class="ny-buy"><div class="ny-price">출시 기념가 <s>' + NY.price.toLocaleString() + '원</s> <b>' + NY.early.toLocaleString() + '원</b></div>' +
      '<ul class="ny-inc"><li>' + OK_SVG + '12개월 월별 상세 풀이</li><li>' + OK_SVG + '재물·직업·연애·건강 분야별 풀이</li><li>' + OK_SVG + '월별 행운 숫자와 행운 번호</li><li>' + OK_SVG + '결과 이미지 카드로 저장·공유</li><li>' + OK_SVG + '계정에 보관, 언제든 다시 보기</li></ul>' +
      '<button type="button" class="unk-btn" id="nyAgree" aria-pressed="false"><span>디지털 콘텐츠라 열람 후에는 청약철회가 제한되는 것에 동의해요</span><span class="ck"></span></button>' +
      '<button class="btn-primary btn-block" id="btnNYBuy" style="margin-top:10px" disabled>' + NY.early.toLocaleString() + '원으로 전체 보기</button>' +
      '<p class="helper" style="text-align:center">' + (isGuest() ? '결제할 때만 로그인해요 · 처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢' : '로그인된 계정에 보관돼요') + '</p></div>' +
      '<button class="text-btn" data-close>나중에 볼게요</button>' +
      '<p class="legal-note">열기 전이라면 결제일로부터 7일 안에 환불할 수 있어요. <button class="text-btn" data-doc="refund" style="font-size:inherit;padding:0;text-decoration:underline">환불 정책 보기</button></p>');
    $('nyAgree').onclick = function(){ agree = !agree; this.setAttribute('aria-pressed', String(agree)); this.querySelector('.ck').innerHTML = agree ? OK_SVG : ''; $('btnNYBuy').disabled = !agree; };
    $('btnNYBuy').onclick = function(){ nyPurchaseSheet(me); };
  }

  /* =========================================================
     사업자 정보 · 약관 · 개인정보 · 환불 — PG 심사용 필수 노출 (내용은 출시 전 채움)
     ========================================================= */
  var BIZ = { name:'', owner:'', regNo:'', mailOrderNo:'', addr:'', email:'', tel:'' };
  function todo(v){ return v ? esc(v) : '<span class="todo">출시 전 입력</span>'; }
  function bizFootHTML(){
    return '<div class="biz-foot"><button data-doc="biz">사업자 정보</button><button data-doc="terms">이용약관</button>' +
      '<button data-doc="privacy"><b>개인정보처리방침</b></button><button data-doc="refund">환불 정책</button></div>';
  }
  var DOCS = {
    biz:function(){ return '<h3 id="sheetTitle">사업자 정보</h3><ul>' +
      '<li>상호: ' + todo(BIZ.name) + '</li><li>대표자: ' + todo(BIZ.owner) + '</li><li>사업자등록번호: ' + todo(BIZ.regNo) + '</li>' +
      '<li>통신판매업 신고번호: ' + todo(BIZ.mailOrderNo) + '</li><li>사업장 주소: ' + todo(BIZ.addr) + '</li>' +
      '<li>고객센터: ' + todo(BIZ.email) + ' · ' + todo(BIZ.tel) + '</li></ul>'; },
    terms:function(){ return '<h3 id="sheetTitle">이용약관</h3><p><span class="todo">출시 전 확정</span> 아래 목차로 작성해요.</p><ol>' +
      '<li>목적과 정의</li><li>서비스 내용 (사주·운세·궁합 콘텐츠, 유료 리포트)</li><li>회원가입과 탈퇴</li><li>유료 콘텐츠 구매와 이용 기간</li>' +
      '<li>청약철회와 환불</li><li>엽전(무료 적립 포인트)의 성격과 소멸</li><li>콘텐츠의 성격: 재미·참고용이며 의료·법률·투자 판단을 대신하지 않음</li><li>책임의 한계와 분쟁 해결</li></ol>'; },
    privacy:function(){ return '<h3 id="sheetTitle">개인정보처리방침</h3><p><span class="todo">출시 전 확정</span></p>' +
      '<h4>모으는 정보</h4><p>이름(별명 가능), 성별, 생년월일, 양력·음력, 태어난 시간. 궁합을 볼 때 입력한 상대방 정보. 로그인 시 카카오·Google 계정 식별값. 결제 시 결제 승인 정보(카드번호는 저장하지 않음).</p>' +
      '<h4>쓰는 곳</h4><p>사주 계산, 오늘의 운세, 궁합, 구매한 리포트 보관.</p>' +
      '<h4>보관 기간</h4><p>탈퇴하면 바로 파기. 결제 기록은 전자상거래법에 따라 5년 보관.</p>' +
      '<h4>처리 위탁</h4><p>호스팅(Vercel), 로그인·DB(Supabase), 결제(토스페이먼츠).</p>' +
      '<h4>상대방 정보</h4><p>궁합에 입력한 다른 사람의 정보는 내 저장 목록에서 언제든 지울 수 있어요.</p>'; },
    refund:function(){ return '<h3 id="sheetTitle">환불 정책</h3>' +
      '<p>유료 리포트는 결제 후 <b>열기 전</b>이라면 결제일로부터 7일 안에 전액 환불해요.</p>' +
      '<p>리포트를 연 뒤에는 디지털 콘텐츠 특성상 청약철회가 제한돼요(전자상거래법 제17조 제2항). 결제 화면에서 이 내용을 먼저 안내해요.</p>' +
      '<p>계산 오류처럼 콘텐츠에 문제가 있으면 열람 여부와 관계없이 환불해요.</p>' +
      '<p>엽전은 무료로 적립하는 포인트라 현금으로 바꾸거나 환불할 수 없어요.</p>'; }
  };
  function openDoc(k){ if (DOCS[k]) openSheet('<div class="doc-sheet">' + DOCS[k]() + '</div><button class="btn-primary btn-block" data-close style="margin-top:18px">확인</button>'); }
  document.addEventListener('click', function(e){ var t = e.target.closest && e.target.closest('[data-doc]'); if (t){ e.preventDefault(); openDoc(t.dataset.doc); } });

  /* =========================================================
     오늘 탭
     ========================================================= */
  var TIP_IC = {
    color:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.5 1.7-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/></svg>',
    item:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M3.5 13h17M12 9v11.5M12 9C10.5 5 6.5 5 7 7.5 7.4 9 12 9 12 9zm0 0c1.5-4 5.5-4 5-1.5C16.6 9 12 9 12 9z"/></svg>',
    food:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 21V3c-2.2 1.2-3.5 4-3.5 7.5 0 1.4.9 2.5 2.2 2.5H17"/></svg>',
    num:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M9 4L7 20M17 4l-2 16M4.5 9h15M3.5 15h15"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>'
  };

  /* =========================================================
     키우는 캐릭터 '운이' — 콘텐츠를 볼 때마다 교감이 오르고, 가득 차면 쿠폰
     · 콘텐츠마다 하루 1번만 오름 (도배 방지 → 2~3일에 한 번 가득 참)
     · 게이지는 줄지 않음 (안 들어와도 벌 없음)
     · 쿠폰은 로그인해야 받음 (가입 전환), 받으면 게이지 0 + 한 단계 성장
     ========================================================= */
  var PET_PTS = { today:{ n:10, label:'오늘의 운세', go:'today' }, saju:{ n:15, label:'사주 풀이', go:'saju' }, gunghap:{ n:15, label:'궁합', go:'gunghap' },
    zodiac:{ n:10, label:'별자리 운세', go:'zodiac' }, num:{ n:10, label:'행운 번호 추첨', go:'num' }, ny:{ n:15, label:'신년운세 미리보기', go:'ny' } };
  var PET_STAGE = ['새싹 별', '아기 별', '꼬마 별', '반짝 별', '보름달 별'];
  var COUPON_NY = { t:'ny1000', name:'신년운세 1,000원 할인', amt:1000, days:7 };
  function getPet(){ var p = store('unsu_pet'); return p && typeof p === 'object' ? p : { g:0, lv:1, day:'', done:{}, n:0 }; }
  function savePet(p){ store('unsu_pet', p); }
  function petMood(g){ return g >= 100 ? 'love' : g >= 70 ? 'happy' : g >= 30 ? 'calm' : 'sleepy'; }
  function petStage(lv){ return PET_STAGE[Math.min(lv, PET_STAGE.length) - 1]; }
  function petDone(p){ return p.day === todayStr() ? (p.done || {}) : {}; }
  function getCoupons(){ var c = store('unsu_coupons'); return Array.isArray(c) ? c.filter(function(x){ return !x.used && x.exp > Date.now(); }) : []; }
  var petUid = 0;
  function petSVG(mood, lv, cls){
    var u = mood + (++petUid);
    var eyes, mouth, extra = '', blush = mood === 'love' ? .7 : mood === 'happy' ? .45 : .28;
    if (mood === 'sleepy'){
      eyes = '<path d="M40 66q6 5 12 0M68 66q6 5 12 0" fill="none" stroke="#221a4a" stroke-width="3" stroke-linecap="round"/>';
      mouth = '<ellipse cx="60" cy="79" rx="2.4" ry="2" fill="#2b1d55"/>';
      extra = '<g class="pz" fill="#d8ecf8" font-family="sans-serif" font-weight="700"><text x="88" y="38" font-size="11">z</text><text x="97" y="27" font-size="8">z</text></g>';
    } else if (mood === 'love'){
      eyes = '<path d="M40 68q6 -8 12 0M68 68q6 -8 12 0" fill="none" stroke="#221a4a" stroke-width="3.2" stroke-linecap="round"/>';
      mouth = '<path d="M51 76q9 11 18 0z" fill="#3a1d5c"/><path d="M55.5 80.5q4.5 3.5 9 0q-4.5 -2 -9 0z" fill="#ff8fb1"/>';
      extra = '<g class="ph"><path d="M20 40c-3-5 4-8 6-3c2-5 9-2 6 3l-6 6z" fill="#ff8fb1"/><path d="M92 30c-2.4-4 3.2-6.4 4.8-2.4c1.6-4 7.2-1.6 4.8 2.4l-4.8 4.8z" fill="#ffb3c8"/><path d="M98 58c-2-3.4 2.7-5.4 4-2c1.4-3.4 6-1.4 4 2l-4 4z" fill="#ff8fb1"/></g>';
    } else {
      var r = mood === 'happy' ? 4.8 : 4;
      eyes = '<g class="pe"><circle cx="46" cy="67" r="' + r + '" fill="#221a4a"/><circle cx="74" cy="67" r="' + r + '" fill="#221a4a"/><circle cx="47.6" cy="65.3" r="1.6" fill="#fff"/><circle cx="75.6" cy="65.3" r="1.6" fill="#fff"/></g>';
      mouth = mood === 'happy' ? '<path d="M52 77q8 9 16 0z" fill="#3a1d5c"/>' : '<path d="M54 77q6 5 12 0" fill="none" stroke="#2b1d55" stroke-width="2.6" stroke-linecap="round"/>';
    }
    var acc = '';
    if (lv >= 4) acc += '<ellipse cx="60" cy="27" rx="22" ry="5" fill="none" stroke="#f3dca0" stroke-width="2" opacity=".75"/>';
    if (lv >= 5) acc += '<path d="M47 36l4-9 5 6 4-9 4 9 5-6 4 9z" fill="#f3dca0"/>';
    var antGlow = lv >= 2 ? '<circle cx="70" cy="18" r="9" fill="#f3dca0" opacity=".25"/>' : '';
    var cheekStar = lv >= 3 ? '<path d="M30 84l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4zM90 84l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" fill="#fff4cc"/>' : '';
    return '<svg class="pet-svg ' + (cls || '') + ' m-' + mood + '" viewBox="0 0 120 120" aria-hidden="true"><defs>' +
      '<radialGradient id="pb' + u + '" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#eef3ff"/><stop offset=".45" stop-color="#b9a8ff"/><stop offset="1" stop-color="#6a45f0"/></radialGradient>' +
      '<radialGradient id="pg' + u + '" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="#8f74ff" stop-opacity=".55"/><stop offset="1" stop-color="#8f74ff" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="60" cy="66" r="56" fill="url(#pg' + u + ')"/>' + acc +
      '<g class="pbody"><path d="M60 38c-6 0-8-8-2-16" fill="none" stroke="#c9b9ff" stroke-width="2.6" stroke-linecap="round"/>' + antGlow +
      '<path d="M70 10l2.4 5 5.4.8-3.9 3.8.9 5.4L70 22.5 65.2 25l.9-5.4-3.9-3.8 5.4-.8z" fill="#f3dca0"/>' +
      '<ellipse cx="45" cy="101" rx="9" ry="5" fill="#5b3be8"/><ellipse cx="75" cy="101" rx="9" ry="5" fill="#5b3be8"/>' +
      '<path d="M60 36c22 0 38 15 38 36c0 18-16 30-38 30S22 90 22 72c0-21 16-36 38-36z" fill="url(#pb' + u + ')"/>' +
      '<ellipse cx="45" cy="50" rx="11" ry="6" fill="#fff" opacity=".55" transform="rotate(-22 45 50)"/>' +
      '<ellipse cx="37" cy="79" rx="6.5" ry="4" fill="#ff8fb1" opacity="' + blush + '"/><ellipse cx="83" cy="79" rx="6.5" ry="4" fill="#ff8fb1" opacity="' + blush + '"/>' +
      cheekStar + eyes + mouth + '</g>' + extra + '</svg>';
  }
  var PET_SAY = {
    sleepy:['아직 잠이 덜 깼어요… 오늘 운세 같이 볼래요?', '같이 하나만 보면 눈이 번쩍 뜨일 거예요'],
    calm:['조금씩 친해지고 있어요', '오늘은 어떤 이야기를 볼까요?'],
    happy:['거의 다 왔어요! 하나만 더 같이 봐요', '두근두근, 선물을 준비하고 있어요'],
    love:['고마워요! 선물을 준비했어요', '우리 많이 친해졌죠? 쿠폰 받아 가세요']
  };
  function petCardHTML(){
    var p = getPet(), mood = petMood(p.g), done = petDone(p), today = 0;
    Object.keys(done).forEach(function(k){ today += PET_PTS[k] ? PET_PTS[k].n : 0; });
    var say = PET_SAY[mood][(new Date().getDate() + p.lv) % 2];
    var h = '<div class="card pet-card m-' + mood + '" id="petCard"><div class="pet-row">' +
      '<button type="button" class="pet-fig" id="petFig" aria-label="운이 쓰다듬기">' + petSVG(mood, p.lv) + '</button>' +
      '<div class="pet-info"><div class="pet-name">운이<small>Lv.' + p.lv + ' · ' + petStage(p.lv) + '</small></div>' +
      '<p class="pet-say">' + say + '</p>' +
      '<div class="pet-gauge" role="progressbar" aria-label="교감" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.g + '"><i style="width:' + p.g + '%"></i></div>' +
      '<div class="pet-meta"><span>교감 <b>' + p.g + '</b>/100</span><span>' + (today ? '오늘 +' + today : '오늘 아직 0') + '</span></div></div></div>';
    if (p.g >= 100){
      h += '<button class="btn-primary btn-block pet-claim" id="btnPetClaim">' + TICKET_SVG + '운이의 선물 받기</button>';
    } else {
      var todo = Object.keys(PET_PTS).filter(function(k){ return !done[k]; });
      if (todo.length) h += '<div class="pet-todo"><span class="helper">함께 보면 교감이 올라요</span><div class="pet-chips">' +
        todo.map(function(k){ return '<button type="button" data-pet="' + k + '">' + PET_PTS[k].label + ' <b>+' + PET_PTS[k].n + '</b></button>'; }).join('') + '</div></div>';
      else h += '<p class="helper" style="text-align:center">오늘 함께할 건 다 했어요. 내일 또 만나요!</p>';
    }
    return h + '</div>';
  }
  var TICKET_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-4z"/><path d="M14 6v12" stroke-dasharray="2 2"/></svg>';
  function bindPetCard(me, r){
    if (!$('petCard')) return;
    $('petFig').onclick = function(){
      var s = this.querySelector('svg'); s.classList.remove('poke'); void s.getBoundingClientRect(); s.classList.add('poke');
      var lines = PET_SAY[petMood(getPet().g)]; this.parentNode.querySelector('.pet-say').textContent = lines[Math.floor(Math.random() * lines.length)];
    };
    document.querySelectorAll('[data-pet]').forEach(function(b){ b.onclick = function(){
      var k = b.dataset.pet;
      if (k === 'today'){ bond('today'); return; }
      if (k === 'zodiac'){ $('btnQZ').click(); return; }
      if (k === 'ny'){ openNYSheet(me, r); return; }
      go(PET_PTS[k].go); window.scrollTo(0, 0);
    }; });
    if ($('btnPetClaim')) $('btnPetClaim').onclick = claimPet;
  }
  function refreshPetCard(){
    var c = $('petCard'); if (!c || currentView !== 'today') return;
    var w = document.createElement('div'); w.innerHTML = petCardHTML(); c.replaceWith(w.firstChild);
    var me = getMe(); if (me) bindPetCard(me, compute(me));
  }
  function bond(kind){
    var me = getMe(); if (!me || !PET_PTS[kind]) return;
    var p = getPet(), t = todayStr();
    if (p.day !== t){ p.day = t; p.done = {}; }
    if (p.done[kind] || p.g >= 100) return;
    var before = petMood(p.g);
    p.done[kind] = 1; p.g = Math.min(100, p.g + PET_PTS[kind].n); savePet(p);
    var mood = petMood(p.g);
    petPop(mood, p.lv, p.g >= 100 ? '교감이 가득 찼어요! 오늘 탭에서 선물을 받아요' : '+' + PET_PTS[kind].n + ' 교감 · ' + PET_PTS[kind].label, mood !== before);
    refreshPetCard();
  }
  /* 다이내믹 아일랜드처럼 위에서 내려오는 알림 */
  function petPop(mood, lv, text, changed){
    var old = document.querySelector('.pet-pop'); if (old) old.remove();
    var el = document.createElement('div'); el.className = 'pet-pop' + (changed ? ' changed' : ''); el.setAttribute('role', 'status');
    el.innerHTML = petSVG(mood, lv, 'mini') + '<span>' + text + '</span>';
    document.body.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('in'); });
    setTimeout(function(){ el.classList.remove('in'); setTimeout(function(){ el.remove(); }, 450); }, 2600);
  }
  function claimPet(){
    var p = getPet(); if (p.g < 100) return;
    if (isGuest()){ openLoginSheet('운이의 선물은 로그인하면 받을 수 있어요. 교감 게이지는 그대로 남아 있어요. 처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢도 드려요.'); return; }
    var hasNY = getCoupons().some(function(c){ return c.t === COUPON_NY.t; }), gift;
    if (!hasNY){
      var all = store('unsu_coupons'); all = Array.isArray(all) ? all : [];
      all.unshift({ id:'c' + Date.now().toString(36), t:COUPON_NY.t, name:COUPON_NY.name, amt:COUPON_NY.amt, exp:Date.now() + COUPON_NY.days * 864e5, used:false });
      store('unsu_coupons', all);
      gift = '<div class="pet-ticket"><small>COUPON</small><b>' + COUPON_NY.name + '</b><span>받은 날부터 ' + COUPON_NY.days + '일 동안 쓸 수 있어요 · 내 정보에서 확인</span></div>';
    } else {
      gift = '<div class="pet-ticket gold"><small>GIFT</small><b>엽전 100닢</b><span>할인 쿠폰은 한 장만 가질 수 있어서 엽전으로 드려요</span></div>';
    }
    p.g = 0; p.lv += 1; p.n = (p.n || 0) + 1; savePet(p);
    openSheet('<div class="pet-levelup">' + petSVG('love', p.lv, 'big') + '<h3 id="sheetTitle">운이가 ' + petStage(p.lv) + '(으)로 자랐어요</h3>' +
      '<p class="helper">Lv.' + p.lv + ' · 교감 게이지는 처음부터 다시 채워요</p>' + gift + '</div>' +
      '<button class="btn-primary btn-block" data-close>고마워, 운이야</button>');
    if (hasNY) setTimeout(function(){ addCoins(100, '운이의 선물'); }, 350);
    refreshPetCard(); if (currentView === 'today') renderToday();
  }
  function renderToday(){
    var body = $('todayBody'), me = getMe();
    if (!me){ renderWelcome(); return; }
    var r = compute(me);
    if (r.error){ body.innerHTML = '<div class="card"><p class="body-text">대표 사주를 계산할 수 없어요. 사주 목록에서 다른 사주를 대표로 설정해 주세요.</p></div>'; return; }
    var now = new Date();
    var att = attend(); justStamped = att.newly;
    if (att.newly && !isGuest()){ var wmsg = pendingWelcome ? '환영해요! 첫 출석 10닢을 받았어요' : att.bonus ? att.streak + '일 연속 출석! 엽전 +40' : '출석 완료 · 엽전 +10'; setTimeout(function(){ toast(wmsg); }, 600); }
    pendingWelcome = false;
    var f = todayLuck(me, r).f, P = f.pillars;
    var iso = entryISO(me, r), tKey = entryTKey(r);
    var luck = todayLuck(me, r), nums = luck.nums;
    var elc = EL_CLASS[f.luckyEl];
    var h = '';
    if (NS) h += demoBarHTML();
    h += attStripHTML(att.newly);
    h += '<div class="today-head"><div class="today-date">' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 ' + WD[now.getDay()] + '요일, 오늘은</div>' +
      '<h1 class="today-title">' + f.head + '</h1>' +
      '<div class="today-ilj">' + P.year.hanja + '年 ' + P.month.hanja + '月 ' + P.day.hanja + '日 · ' + f.ten + '의 날</div></div>';
    h += '<div class="today-fig" id="todayFig">' + figSVG(r.animal, f.auraEl) + '</div>';
    h += '<div class="quick-row"><button type="button" id="btnQZ">' + TIP_IC.star + '별자리 운세</button><button type="button" id="btnQNum">' + TIP_IC.star + '행운 번호</button><button type="button" id="btnQNY" class="new">' + TIP_IC.star + '2027 신년운세</button></div>';
    h += '<div class="card score-card">' + scoreRowsHTML(f) + '<div class="divider"></div>' +
      '<p class="body-text">' + esc(me.name) + '님, ' + f.body + '</p>' +
      '<button class="btn-soft btn-block" id="btnTodayShare">' + SH_IC.send + '오늘 운세 공유</button></div>';
    h += petCardHTML();
    h += '<div class="card ' + elc + '"><div class="lucky-title">오늘 ' + esc(me.name) + '님에게는<br><em>' + f.bless + '의 기운</em>이 행운을 가져와요.</div>' +
      '<p class="body-text">' + esc(me.name) + '님에게 필요한 ' + MS.EL_K[f.luckyEl] + '(' + MS.EL_H[f.luckyEl] + ') 기운을 가까이 두면 좋은 운은 높이고 흔들리는 운은 잡아 줘요. ' + EL_TEXT[f.luckyEl].act + '처럼 가벼운 행동으로 채워 보세요.</p>' +
      '<button class="row-link" id="btnTips"><span class="ic" style="color:var(--elc)">' + TIP_IC.star + '</span>행운의 팁<span class="chev">›</span></button></div>';
    var z = getZodiac(r.solar.m, r.solar.d);
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    h += '<div class="card"><div class="mini-z">' + figSVG(z.name, z.el, 'mini') + '<div class="view" style="gap:4px"><div class="sec-meta" style="text-align:left">TODAY · ' + z.en.toUpperCase() + '</div><div style="font-size:calc(16px*var(--fs));color:#fff;font-weight:500">' + z.glyph + ' ' + z.name + '</div><p class="helper">' + DAILY_LINES[doy % DAILY_LINES.length] + '</p></div></div>' +
      '<button class="row-link" id="btnTodayZ"><span class="ic">' + TIP_IC.star + '</span>내 별자리 운세 보기<span class="chev">›</span></button></div>';
    h += nyCardHTML(me, r);
    h += '<div class="ad-slot" aria-label="광고 영역 예시"><span class="ad-badge">AD</span><span class="ph"></span><div><b>네이티브 광고 영역</b><small>콘텐츠 카드와 같은 모양 · 오늘의 결론을 본 뒤 1개만 노출</small></div></div>';
    h += '<div class="card ' + elc + '"><div class="sec-head"><h2 class="sec-title">오늘의 행운 번호</h2><span class="sec-meta">행운 숫자 ' + f.tip.nums.join('·') + '</span></div>' +
      '<div class="balls">' + nums.map(function(o){ return '<div class="ball' + (o.y ? ' yong ' + elc : '') + '">' + o.n + '</div>'; }).join('') + '</div>' +
      '<p class="helper">빛나는 번호는 오늘의 행운 숫자 <b style="color:var(--elc)">' + f.tip.nums.join('·') + '</b>로 끝나요. 행운의 팁과 같은 ' + MS.EL_K[f.luckyEl] + '(' + MS.EL_H[f.luckyEl] + ') 기운에서 나온 숫자예요.</p>' +
      '<button class="btn-soft btn-block" id="btnGoNum" style="margin-top:12px">추첨기로 내 번호 더 뽑기 ›</button></div>';
    var stNow = streakOf(getAtt());
    if (!NS && !store('unsu_auth') && store('unsu_nudge') !== todayStr() && (stNow >= 3 || getCoins() >= 60 || getUnlocks().length))
      h += '<div class="nudge"><div><b>기록이 쌓이고 있어요</b><p>연속 ' + stNow + '일 출석 · 엽전 ' + getCoins() + '닢. 로그인하면 기기를 바꿔도 그대로 이어져요.</p></div><div class="acts"><button class="btn-primary" id="btnNudgeLogin">로그인</button><button class="btn-ghost" id="btnNudgeClose">닫기</button></div></div>';
    h += '<p class="disclaimer">오늘의 운세는 일진과 사주의 관계로 계산한 재미용 콘텐츠예요.</p>' + bizFootHTML();
    body.innerHTML = h;
    $('btnNY').onclick = function(){ openNYSheet(me, r); };
    $('btnGoNum').onclick = function(){ go('num'); window.scrollTo(0, 0); };
    renderCoin();
    drawOn($('todayFig'));
    $('btnAtt').onclick = function(){ openAttSheet(me, r); };
    bindDemoBar();
    bindPetCard(me, r);
    setTimeout(function(){ bond('today'); }, 1400);
    if ($('btnNudgeLogin')){
      $('btnNudgeLogin').onclick = function(){ openLoginSheet('연속 ' + streakOf(getAtt()) + '일 출석 기록과 엽전 ' + getCoins() + '닢이 지금은 이 기기에만 있어요.'); };
      $('btnNudgeClose').onclick = function(){ store('unsu_nudge', todayStr()); renderToday(); };
    }
    $('btnTodayShare').onclick = function(){
      var md = (now.getMonth()+1) + '월 ' + now.getDate() + '일';
      openShare({ sheetTitle:'오늘의 운세 공유', title:me.name + '님의 ' + md + ' 운세', desc:f.head + ' · 재물 ' + f.scores.w + ' · 연애 ' + f.scores.l + ' · 직업 ' + f.scores.j,
        fig:figSVG(r.animal, f.auraEl, 'mini'),
        text:'[운수] ' + me.name + '님의 ' + md + ' 운세\n“' + f.head + '”\n재물 ' + f.scores.w + ' · 연애 ' + f.scores.l + ' · 직업 ' + f.scores.j + '\n오늘의 행운 번호 ' + nums.map(function(o){ return o.n; }).join(' · '),
        cta:'너의 오늘 운세도 확인해 봐 →', link:linkFor('') });
    };
    $('btnTips').onclick = function(){
      openSheet('<h3 id="sheetTitle">' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 오늘의 행운 팁이에요</h3><div class="tip-list ' + elc + '">' +
        '<div class="tip"><span class="ic">' + TIP_IC.color + '</span><div><small>행운의 색상</small><b>' + f.tip.color + '</b></div></div>' +
        '<div class="tip"><span class="ic">' + TIP_IC.item + '</span><div><small>행운의 물건</small><b>' + f.tip.item + '</b></div></div>' +
        '<div class="tip"><span class="ic">' + TIP_IC.food + '</span><div><small>추천 음식</small><b>' + f.tip.food + '</b></div></div>' +
        '<div class="tip"><span class="ic">' + TIP_IC.num + '</span><div><small>행운의 숫자</small><b>' + f.tip.nums.join(', ') + '</b><small style="margin-top:3px">오늘의 행운 번호 ' + nums.map(function(o){ return o.y ? '<b style="font-size:calc(13px*var(--fs));color:var(--elc)">' + o.n + '</b>' : o.n; }).join(' · ') + '</small></div></div>' +
        '</div><button class="btn-primary btn-block" data-close>확인</button>');
    };
    $('btnTodayZ').onclick = $('btnQZ').onclick = function(){ myZ = z.name; renderZGrid(); openZodiac(z, iso); show('zodiac'); };
    $('btnQNum').onclick = function(){ go('num'); window.scrollTo(0, 0); };
    $('btnQNY').onclick = function(){ openNYSheet(me, r); };
  }

  /* =========================================================
     지난주 로또 1등 번호 (동행복권 발표 결과를 정적 데이터로 보관 — 매주 갱신 필요)
     ========================================================= */
  var LOTTO_LATEST = { no:1243, date:'2026-09-26', nums:[9,18,24,38,43,44], bonus:35,
    first:{ count:12, prize:2592525282 }, second:{ count:115, prize:45087397 } };
  /* 배포 주소에서는 /api/lotto(서버리스)로 최신 회차를 받아 덮어쓴다. 실패하면 위 정적 데이터 유지 */
  function validLotto(d){
    return d && d.no > 0 && Array.isArray(d.nums) && d.nums.length === 6 && d.nums.every(function(n){ return n >= 1 && n <= 45; }) &&
      d.bonus >= 1 && d.bonus <= 45 && /^\d{4}-\d{2}-\d{2}$/.test(d.date || '') && d.first && d.first.prize >= 0;
  }
  function useLotto(d, live){
    if (!validLotto(d) || d.no < LOTTO_LATEST.no) return false;
    LOTTO_LATEST = { no:+d.no, date:d.date, nums:d.nums.map(Number).sort(function(a, b){ return a - b; }), bonus:+d.bonus,
      first:{ count:+d.first.count || 0, prize:+d.first.prize || 0 },
      second:d.second && d.second.prize ? { count:+d.second.count || 0, prize:+d.second.prize } : null,
      sell:+d.sell || null, live:!!live };
    return true;
  }
  try { useLotto(JSON.parse(localStorage.getItem('unsu_lotto_cache') || 'null'), true); } catch(e){}
  function refreshLotto(){
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return;
    try { if (window.top !== window.self) return; } catch(e){ return; }
    fetch('/api/lotto', { headers:{ Accept:'application/json' } }).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      var before = LOTTO_LATEST.no + '|' + LOTTO_LATEST.live;
      if (!useLotto(d, true)) return;
      try { localStorage.setItem('unsu_lotto_cache', JSON.stringify(LOTTO_LATEST)); } catch(e){}
      if (before !== LOTTO_LATEST.no + '|' + LOTTO_LATEST.live && currentView === 'fill') renderNumToday();
    }).catch(function(){});
  }
  function krw(n){
    var eok = Math.floor(n / 1e8), man = Math.floor((n % 1e8) / 1e4);
    return (eok ? eok + '억 ' : '') + (man ? man.toLocaleString('ko-KR') + '만 ' : '') + '원';
  }
  function ltColor(n){ return n <= 10 ? 'lt-y' : n <= 20 ? 'lt-b' : n <= 30 ? 'lt-r' : n <= 40 ? 'lt-k' : 'lt-g'; }
  function lottoRank(nums){
    var L = LOTTO_LATEST, hit = nums.filter(function(n){ return L.nums.indexOf(n) > -1; }).length, bonus = nums.indexOf(L.bonus) > -1;
    var rank = hit === 6 ? '1등' : hit === 5 && bonus ? '2등' : hit === 5 ? '3등' : hit === 4 ? '4등' : hit === 3 ? '5등' : '낙첨';
    return { hit:hit, bonus:bonus, rank:rank };
  }
  function lottoCardHTML(life){
    var L = LOTTO_LATEST, p = L.date.split('-'), dd = new Date(+p[0], +p[1]-1, +p[2], 20, 35);
    var now = new Date(), days = (now - dd) / 864e5;
    var title = days >= 0 && days < 7 ? '지난주 1등 번호' : '최근 발표된 1등 번호';
    var next = new Date(dd); while (next <= now) next.setDate(next.getDate() + 7);
    var h = '<div class="card"><div class="sec-head"><h2 class="sec-title">' + title + '</h2><span class="sec-meta">제' + L.no + '회</span></div>' +
      '<p class="helper" style="margin-top:-8px">' + (+p[1]) + '월 ' + (+p[2]) + '일(토) 추첨 · 동행복권 발표 기준' + (L.live ? ' · <span class="lt-live">자동 갱신</span>' : '') + '</p>' +
      '<div class="balls lt-row">' + L.nums.map(function(n){ return '<div class="ball lt ' + ltColor(n) + '">' + n + '</div>'; }).join('') + '<span class="lt-plus">+</span><div class="ball lt ' + ltColor(L.bonus) + '">' + L.bonus + '</div></div>' +
      '<div class="lt-prize"><div><span>1등</span><b>' + krw(L.first.prize) + '</b><small>' + L.first.count + '게임 당첨</small></div>' +
        (L.second ? '<div><span>2등</span><b>' + krw(L.second.prize) + '</b><small>' + L.second.count + '게임 당첨</small></div>'
          : L.sell ? '<div><span>총 판매</span><b>' + Math.round(L.sell / 1e8).toLocaleString('ko-KR') + '억 원' + '</b><small>이번 회차</small></div>' : '') + '</div>';
    if (life){
      var rk = lottoRank(life);
      h += '<div class="divider"></div><div class="num-set"><div class="lab">내 평생 번호와 맞춰 보기 <small>' + rk.hit + '개 일치' + (rk.bonus ? ' + 보너스' : '') + '</small></div>' +
        '<div class="balls">' + life.map(function(n){ var on = L.nums.indexOf(n) > -1, bo = n === L.bonus; return '<div class="ball' + (on ? ' lt ' + ltColor(n) : bo ? ' lt-bo' : ' lt-miss') + '">' + n + '</div>'; }).join('') + '</div>' +
        '<p class="helper" style="text-align:center">' + (rk.rank === '낙첨' ? (rk.hit ? rk.hit + '개가 맞았어요. 이번 주엔 오늘의 행운 번호로 도전해 보세요.' : '이번엔 맞은 번호가 없어요. 운은 다음 주에 모아 둘게요.') : '<b style="color:#fff">' + rk.rank + ' 번호였어요!</b> 평생 번호의 힘이 통했네요.') + '</p></div>';
    } else {
      h += '<p class="helper">내 사주를 등록하면 평생 번호가 몇 개 맞았는지 매주 맞춰 볼 수 있어요.</p>';
    }
    h += '<p class="helper" style="text-align:center">다음 추첨 ' + (next.getMonth()+1) + '월 ' + next.getDate() + '일(토) 오후 8시 35분</p></div>';
    return h;
  }

  /* =========================================================
     행운 추첨기 (번호 탭) — 사주로 계산한 번호가 추첨기에서 뽑히는 연출
     ========================================================= */
  var machine = null;
  function machineCardHTML(canDraw){
    return '<div class="card machine-card">' +
      (canDraw ? '<div class="mc-seg" role="group" aria-label="번호 종류"><button type="button" data-mk="today" aria-pressed="true">오늘 번호</button><button type="button" data-mk="life" aria-pressed="false">평생 번호</button></div>' : '') +
      '<canvas id="mcCanvas" class="mc-canvas" role="img" aria-label="로또 추첨기 일러스트. 버튼을 누르면 내 사주로 계산한 번호 6개가 하나씩 나와요."></canvas>' +
      '<div class="balls mc-result" id="mcResult" aria-live="polite" hidden></div>' +
      '<button class="btn-primary btn-block" id="btnMcDraw">' + (canDraw ? '추첨 시작' : '내 사주 등록하고 뽑기') + '</button>' +
      '<p class="helper" style="text-align:center">번호는 사주로 계산해요. 추첨 연출은 재미 요소이고 당첨을 보장하지 않아요.</p></div>';
  }
  function mountMachine(sets){
    if (machine){ machine.destroy(); machine = null; }
    var cv = $('mcCanvas'); if (!cv || !window.LottoMachine) return;
    machine = LottoMachine.mount(cv, { reduceMotion:reduceMotion });
    var kind = 'today', box = $('mcResult'), btn = $('btnMcDraw');
    document.querySelectorAll('[data-mk]').forEach(function(b){
      b.onclick = function(){
        if (machine.isBusy()) return; kind = b.dataset.mk;
        document.querySelectorAll('[data-mk]').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); });
        machine.reset(); box.hidden = true; btn.textContent = '추첨 시작';
      };
    });
    btn.onclick = function(){
      if (!sets){ startOnboarding('new'); return; }
      if (machine.isBusy()) return;
      var nums = sets[kind].slice(); btn.disabled = true; btn.textContent = '추첨 중…'; box.hidden = true;
      machine.draw(nums, null, function(){
        box.innerHTML = nums.slice().sort(function(a, b){ return a - b; }).map(function(n){ return '<div class="ball lt ' + ltColor(n) + '">' + n + '</div>'; }).join('');
        box.hidden = false; btn.disabled = false; btn.textContent = '다시 뽑기';
        toast((kind === 'today' ? '오늘의' : '평생') + ' 행운 번호가 나왔어요');
        bond('num');
      });
    };
  }

  /* =========================================================
     번호 탭 상단: 내 번호
     ========================================================= */
  var extraLines = [], numTab = 'draw';
  function numHeadHTML(title, life){
    return '<div class="num-head"><h1 class="num-title">' + title + '</h1><button type="button" class="chip-btn" id="btnLatest">지난 1등 번호</button></div>' +
      '<div class="num-tabs" role="tablist" aria-label="번호 뽑는 방법">' +
      '<button type="button" role="tab" data-nt="draw" aria-selected="' + (numTab === 'draw') + '">행운 추첨기</button>' +
      '<button type="button" role="tab" data-nt="pick" aria-selected="' + (numTab === 'pick') + '">직접 골라 채우기</button></div>';
  }
  function bindNumTabs(life){
    function apply(){
      var d = $('numDraw'), pk = $('pickCard');
      if (d) d.hidden = numTab !== 'draw'; if (pk) pk.hidden = numTab !== 'pick';
      document.querySelectorAll('[data-nt]').forEach(function(b){ b.setAttribute('aria-selected', String(b.dataset.nt === numTab)); });
    }
    document.querySelectorAll('[data-nt]').forEach(function(b){ b.onclick = function(){ numTab = b.dataset.nt; apply(); }; });
    $('btnLatest').onclick = function(){ openSheet('<h3 id="sheetTitle">최근 발표된 1등 번호</h3>' + lottoCardHTML(life) + '<button class="btn-ghost btn-block" data-close style="margin-top:12px">닫기</button>'); };
    apply();
  }
  function renderNumToday(){
    var me = getMe(), box = $('numToday');
    if (!me){
      box.innerHTML = numHeadHTML('내 사주로 뽑는 행운 번호', null) + '<div id="numDraw">' + machineCardHTML(false) +
        '<div class="card gate"><div class="balls">' + [3,8,17,26,33,41].map(function(n){ return '<div class="ball" style="opacity:.35">?</div>'; }).join('') + '</div><p class="helper">내 사주를 등록하면 평생 번호와 매일 바뀌는 오늘의 행운 번호가 생겨요.</p><button class="btn-primary btn-block" id="btnNumOnb">내 사주 등록하고 번호 받기</button></div></div>';
      $('btnNumOnb').onclick = function(){ startOnboarding('new'); };
      mountMachine(null); bindNumTabs(null);
      return;
    }
    var r = compute(me); if (r.error){ box.innerHTML = ''; return; }
    var iso = entryISO(me, r), tKey = entryTKey(r);
    var life = drawSixFromSeed(iso + '|' + tKey + '|life');
    var luck = todayLuck(me, r), yong = luck.nums, lEl = luck.el;
    var extra = store('unsu_extra'); if (!extra || extra.d !== todayStr()) extra = { d:todayStr(), lines:[] };
    var h = numHeadHTML(esc(me.name) + '님의 행운 번호', life) + '<div id="numDraw">';
    h += machineCardHTML(true);
    h += '<div class="card"><div class="num-set"><div class="lab">평생 행운 번호 <small>사주 원국 · 고정</small></div><div class="balls">' + life.map(function(n){ return '<div class="ball">' + n + '</div>'; }).join('') + '</div></div>' +
      '<div class="num-set"><div class="lab">오늘의 행운 번호 <small>행운 숫자 ' + EL_TEXT[lEl].num.join('·') + '</small></div><div class="balls">' + yong.map(function(o){ return '<div class="ball' + (o.y ? ' yong ' + EL_CLASS[lEl] : '') + '">' + o.n + '</div>'; }).join('') + '</div></div>' +
      extra.lines.map(function(l, i){ return '<div class="num-set"><div class="lab">보너스 한 줄 ' + (i+1) + ' <small>광고 보상</small></div><div class="balls">' + l.map(function(n){ return '<div class="ball">' + n + '</div>'; }).join('') + '</div></div>'; }).join('') +
      '<div class="row"><button class="btn-soft grow" id="btnExtra"' + (extra.lines.length >= 3 ? ' disabled' : '') + '>' + (extra.lines.length >= 3 ? '오늘은 모두 받았어요' : '광고 보고 한 줄 더 뽑기') + '</button><button class="btn-ghost" id="btnNumCopy">공유</button></div>' +
      '<p class="disclaimer">재미로 즐기는 콘텐츠이며 실제 당첨을 보장하지 않습니다.</p></div></div>';
    box.innerHTML = h;
    bindNumTabs(life);
    mountMachine({ today:yong.map(function(o){ return o.n; }), life:life });
    $('btnExtra').onclick = function(){
      playAd(function(){
        var line = drawSixFromSeed(iso + '|' + tKey + '|' + todayStr() + '|extra' + extra.lines.length);
        extra.lines.push(line); store('unsu_extra', extra);
        renderNumToday(); toast('보너스 번호 한 줄을 받았어요');
      });
    };
    $('btnNumCopy').onclick = function(){
      openShare({ sheetTitle:'행운 번호 공유', title:me.name + '님의 오늘 행운 번호', desc:yong.map(function(o){ return o.n; }).join(' · ') + ' · 행운 숫자 ' + EL_TEXT[lEl].num.join('·'),
        fig:figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
        text:'[운수] ' + me.name + '님의 오늘 행운 번호\n' + yong.map(function(o){ return o.n; }).join(' · ') + '\n평생 번호 ' + life.join(' · ') + extra.lines.map(function(l, i){ return '\n보너스 ' + (i+1) + ' ' + l.join(' · '); }).join(''),
        cta:'내 사주로 뽑는 행운 번호 받기 →', link:linkFor('num') });
    };
  }

  /* =========================================================
     궁합
     ========================================================= */
  var gh = { a:null, b:null, edit:null, f:null, bCleared:false };
  function getUnlocks(){ var u = store('unsu_unlock'); return Array.isArray(u) ? u : []; }
  function ghKey(ea, eb){ return [ea.id, eb.id].sort().join('|'); }
  function slotHTML(e, which, label){
    var on = gh.edit === which ? ' editing' : '';
    if (!e) return '<button class="gh-slot empty' + on + '" data-slot="' + which + '" aria-expanded="' + (gh.edit === which) + '"><span class="gh-q">?</span><span class="nm">' + label + '</span><span class="sb">' + (gh.edit === which ? '아래에서 입력해요' : '눌러서 입력') + '</span></button>';
    var r = compute(e);
    return '<button class="gh-slot' + on + '" data-slot="' + which + '" aria-expanded="' + (gh.edit === which) + '">' + figSVG(r.animal, ANIMAL_EL[r.animal], 'mini') + '<span class="nm">' + esc(e.name) + '</span><span class="sb">' + r.pillars.day.name + '일주 · ' + r.animal + '띠</span><span class="chg">' + (gh.edit === which ? '입력 중' : '바꾸기') + '</span></button>';
  }
  function freshGhForm(which){
    var other = getList().filter(function(x){ return x.id === (which === 'a' ? gh.b : gh.a); })[0];
    return { name:'', gender:other ? (other.gender === 'F' ? 'M' : 'F') : 'F', cal:'solar', leap:false, birth:'', hour:'', minute:'0' };
  }
  function ghFormState(){
    var f = gh.f, b = parseBirth(f.birth);
    if (f.birth.length < 8) return { ok:false, cls:'', text:'숫자 8자리로 입력해 주세요 (예: 19950412)' };
    if (!b || b.y < 1900 || b.y > 2050) return { ok:false, cls:'err', text:'1900~2050년 사이의 날짜를 입력해 주세요' };
    var e = { name:f.name.trim() || '__auto', gender:f.gender, cal:f.cal, leap:f.cal === 'lunar' && f.leap, y:b.y, m:b.m, d:b.d,
      unknown:f.hour === '', hour:f.hour === '' ? null : +f.hour, minute:f.hour === '' ? null : +f.minute, corr:true };
    var r = compute(e);
    if (r.error) return { ok:false, cls:'err', text:r.error };
    if (new Date(r.solar.y, r.solar.m - 1, r.solar.d) > new Date()) return { ok:false, cls:'err', text:'오늘 이후의 날짜는 입력할 수 없어요' };
    if (e.name === '__auto') e.name = r.animal + '띠 ' + (e.gender === 'M' ? '남자' : '여자');
    var t = (f.cal === 'lunar' ? '양력 ' + r.solar.y + '.' + r.solar.m + '.' + r.solar.d : (r.lunar ? '음력 ' + r.lunar.m + '.' + r.lunar.d + (r.lunar.leap ? ' 윤' : '') : '')) +
      ' · ' + r.pillars.year.name + '년생 ' + r.animal + '띠 · ' + r.pillars.day.name + '일주' + (r.pillars.hour ? ' · ' + r.pillars.hour.bk + '시' : '');
    return { ok:true, cls:'ok', text:t, entry:e };
  }
  function ghEditorHTML(which){
    var f = gh.f, other = which === 'a' ? gh.b : gh.a;
    var cands = getList().filter(function(x){ return x.id !== other; });
    var who = which === 'a' ? (getMe() ? '첫 번째 사람' : '나') : '상대';
    var h = '<div class="ge" id="ghEditor"><div class="ge-head"><b>' + who + '의 사주</b>' + ((which === 'a' ? gh.a : gh.b) ? '<button class="ge-x" id="geClose" aria-label="입력 닫기">✕</button>' : '') + '</div>';
    h += '<button type="button" class="btn-soft btn-block" id="geList">저장 목록에서 가져오기' + (cands.length ? ' (' + cands.length + '명)' : '') + '</button><div class="ge-or"><span>또는 직접 입력</span></div>';
    var hours = '<option value="">태어난 시 · 모름</option>'; for (var i = 0; i < 24; i++) hours += '<option value="' + i + '"' + (f.hour === String(i) ? ' selected' : '') + '>' + pad2(i) + '시</option>';
    var mins = ''; for (var j = 0; j < 60; j++) mins += '<option value="' + j + '"' + (f.minute === String(j) ? ' selected' : '') + '>' + pad2(j) + '분</option>';
    h += '<div class="ge-form">' +
      '<input class="text-input" id="geName" maxlength="12" placeholder="' + (which === 'a' && !getMe() ? '이름 (예: 소율)' : '이름 (비우면 ‘말띠 여자’로 저장)') + '" autocomplete="off" value="' + esc(f.name) + '">' +
      '<div class="toggle-row">' +
        '<div class="pill" role="group" aria-label="성별"><button type="button" data-gg="F" aria-pressed="' + (f.gender === 'F') + '">여자</button><button type="button" data-gg="M" aria-pressed="' + (f.gender === 'M') + '">남자</button></div>' +
        '<div class="pill" role="group" aria-label="양력 음력"><button type="button" data-gc="solar" aria-pressed="' + (f.cal === 'solar') + '">양력</button><button type="button" data-gc="lunar" aria-pressed="' + (f.cal === 'lunar') + '">음력</button></div>' +
        '<div class="pill' + (f.cal === 'lunar' ? '' : ' is-disabled') + '" role="group" aria-label="평달 윤달"><button type="button" data-gl="0" aria-pressed="' + !f.leap + '"' + (f.cal === 'lunar' ? '' : ' disabled') + '>평달</button><button type="button" data-gl="1" aria-pressed="' + f.leap + '"' + (f.cal === 'lunar' ? '' : ' disabled') + '>윤달</button></div>' +
      '</div>' +
      '<input class="text-input mono" id="geBirth" inputmode="numeric" maxlength="8" placeholder="생년월일 8자리 · 19950412" autocomplete="off" value="' + f.birth + '">' +
      '<div class="ge-time"><select class="ge-select" id="geHour" aria-label="태어난 시">' + hours + '</select><select class="ge-select" id="geMin" aria-label="태어난 분"' + (f.hour === '' ? ' disabled' : '') + '>' + mins + '</select></div>' +
      '<div class="field-hint" id="geHint"></div>' +
      '<button class="btn-primary btn-block" id="geDone">' + (which === 'a' && !getMe() ? '내 사주로 저장' : '이 사람으로 궁합 보기') + '</button>' +
      '<p class="helper" style="text-align:center">입력한 사주는 저장 목록에 자동으로 저장돼요</p></div></div>';
    return h;
  }
  function bindGhEditor(which){
    var f = gh.f;
    var upd = function(){ var st = ghFormState(); var hint = $('geHint'); hint.className = 'field-hint ' + st.cls; hint.textContent = st.text; $('geDone').disabled = !st.ok; };
    $('geName').oninput = function(){ f.name = this.value; };
    $('geBirth').oninput = function(){ this.value = this.value.replace(/\D/g, '').slice(0, 8); f.birth = this.value; upd(); };
    $('geHour').onchange = function(){ f.hour = this.value; $('geMin').disabled = f.hour === ''; upd(); };
    $('geMin').onchange = function(){ f.minute = this.value; upd(); };
    var box = $('ghEditor');
    box.querySelectorAll('[data-gg]').forEach(function(b){ b.onclick = function(){ f.gender = b.dataset.gg; box.querySelectorAll('[data-gg]').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); }); }; });
    box.querySelectorAll('[data-gc],[data-gl]').forEach(function(b){ b.onclick = function(){ if (b.dataset.gc){ f.cal = b.dataset.gc; if (f.cal === 'solar') f.leap = false; } else f.leap = b.dataset.gl === '1'; renderGunghap(); }; });
    $('geList').onclick = function(){
      var other = which === 'a' ? gh.b : gh.a, cands = getList().filter(function(x){ return x.id !== other; });
      var hh = '<h3 id="sheetTitle">저장 목록에서 가져오기</h3>';
      if (!cands.length) hh += '<p class="body-text">저장된 사주가 아직 없어요. 아래에서 직접 입력하면 저장 목록에 자동으로 쌓여요.</p><button class="btn-ghost btn-block" data-close style="margin-top:12px">닫기</button>';
      else hh += '<div class="ge-list">' + cands.map(function(e){
        var r = compute(e); if (r.error) return '';
        return '<button type="button" class="ge-chip" data-spick="' + e.id + '">' + figSVG(r.animal, ANIMAL_EL[r.animal], 'mini') + '<span><b>' + esc(e.name) + '</b><small>' + r.pillars.day.name + '일주 · ' + r.animal + '띠 · ' + (e.gender === 'M' ? '남' : '여') + '</small></span></button>'; }).join('') + '</div>';
      openSheet(hh);
      $('sheetBody').querySelectorAll('[data-spick]').forEach(function(b){ b.onclick = function(){ gh[which] = b.dataset.spick; if (which === 'b') gh.bCleared = false; gh.edit = null; gh.f = null; closeSheet(); renderGunghap(); }; });
    };
    if ($('geClose')) $('geClose').onclick = function(){ gh.edit = null; gh.f = null; renderGunghap(); };
    $('geBirth').onkeydown = function(e){ if (e.key === 'Enter') $('geDone').click(); };
    $('geDone').onclick = function(){
      var st = ghFormState(); if (!st.ok){ upd(); return; }
      var e = st.entry, list = getList(), found = list.filter(function(x){ return sameEntry(x, e); })[0];
      if (!found){ e.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); e.saved = Date.now(); list.unshift(e); store('unsu_list', list); found = e; }
      var madeMe = false;
      if (which === 'a' && !getMe()){ setMe(found.id); welcomeCoins(); madeMe = true; }
      gh[which] = found.id; if (which === 'b') gh.bCleared = false;
      gh.edit = null; gh.f = null;
      updateSegCount(); updateTopbar();
      renderGunghap();
      toast(madeMe ? '내 사주로 저장했어요. 이제 상대를 입력해 주세요' : '‘' + found.name + '’님을 저장하고 궁합을 펼쳤어요');
      var t = $('ghBody').querySelector(madeMe ? '#ghEditor' : '.poster'); if (t) t.scrollIntoView({ block:'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    upd();
  }
  function renderGunghap(){
    var list = getList(), box = $('ghBody');
    var byId = function(id){ return list.filter(function(x){ return x.id === id; })[0] || null; };
    var A = byId(gh.a) || getMe() || null;
    if (A) gh.a = A.id;
    var B = byId(gh.b); if (B && A && B.id === A.id) B = null;
    if (!B && A && !gh.bCleared) B = list.filter(function(x){ return x.id !== A.id; })[0] || null;
    gh.b = B ? B.id : null;
    if (!gh.edit){ if (!A) gh.edit = 'a'; else if (!B) gh.edit = 'b'; }
    if (gh.edit && !gh.f) gh.f = freshGhForm(gh.edit);
    var h = '<div class="card gh-box"><div class="gh-pair">' + slotHTML(A, 'a', getMe() ? '첫 번째 사람' : '나') + '<div class="gh-amp">合</div>' + slotHTML(B, 'b', '상대') + '</div>';
    if (gh.edit) h += ghEditorHTML(gh.edit);
    if (gh.edit === 'b' && getMe() && !NS) h += '<button class="ge-invite" id="btnGhInv2">' + SH_IC.link + '<span>상대 생년월일을 모른다면<br><b>궁합 신청 링크 보내기</b></span><span class="chev">›</span></button>';
    else if (!getMe()) h += '<button class="text-btn" id="btnGhDemo" style="align-self:center">예시 두 사람으로 먼저 보기</button>';
    h += '</div>';
    var ra = A && compute(A), rb = B && compute(B);
    if (!A || !B || gh.edit || ra.error || rb.error){
      box.innerHTML = h; bindGh();
      if (gh.edit) bindGhEditor(gh.edit);
      return;
    }
    var m = DAILY.match(A, ra, B, rb);
    setTimeout(function(){ bond('gunghap'); }, 900);
    var nm = function(t){ return t.replace(/A/g, esc(A.name)).replace(/B/g, esc(B.name)); };
    h += '<div class="poster"><div class="poster-frame">' +
      '<div class="poster-corner l">宮合<br>MATCH</div><div class="poster-corner r">' + ra.pillars.day.hanja + ' × ' + rb.pillars.day.hanja + '</div>' +
      '<div class="gh-figs">' + figSVG(ra.animal, MS.EL_KEY[ra.pillars.day.sEl]) + '<span class="link"></span>' + figSVG(rb.animal, MS.EL_KEY[rb.pillars.day.sEl]) + '</div>' +
      '<div class="gh-score"><div class="num">' + m.score + '<small>점</small></div><div class="gr">' + m.grade + '</div><p class="poster-sub" style="max-width:20em">' + esc(A.name) + '님과 ' + esc(B.name) + '님은 ' + m.summary + '</p></div>' +
      '</div></div>';
    var comp = m.comp.length ? m.comp.map(function(c){ var giver = c.who === 'A' ? A : B, taker = c.to === 'A' ? A : B; return esc(giver.name) + '님이 ' + esc(taker.name) + '님에게 부족한 ' + MS.EL_K[c.el] + '(' + MS.EL_H[c.el] + ') 기운을 채워 줘요.'; }).join(' ') : '두 사람의 오행 구성이 비슷해 서로의 빈 곳을 채우기보다 같은 방향으로 함께 가는 관계예요.';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">궁합 요약</h2><span class="sec-meta">무료</span></div><div class="gh-badges">' +
      '<div class="gh-badge"><span class="chip">일간</span><p><strong style="color:#fff;font-weight:500">' + nm(m.stemTxt.t) + (m.stemHap ? ' (' + m.stemHap + ')' : '') + '</strong><br>' + ra.pillars.day.sk + MS.EL_K[ra.pillars.day.sEl] + ' × ' + rb.pillars.day.sk + MS.EL_K[rb.pillars.day.sEl] + '</p></div>' +
      '<div class="gh-badge"><span class="chip">일지</span><p>' + m.dTxt + '</p></div>' +
      '<div class="gh-badge"><span class="chip">오행</span><p>' + comp + '</p></div></div>' +
      '<button class="btn-soft btn-block" id="btnGhShare">' + SH_IC.send + '궁합 결과 공유하기</button></div>';
    if (getMe()) h += '<div class="card"><button class="row-link" id="btnGhInvite" style="border-top:none;padding-top:0"><span class="ic" style="color:var(--icon-accent)">' + SH_IC.heart + '</span><span>다른 친구에게 궁합 신청하기<br><span class="helper">링크를 받은 친구가 생년월일만 넣으면 나와의 궁합이 열려요</span></span><span class="chev">›</span></button></div>';
    var key = ghKey(A, B), open = getUnlocks().indexOf(key) > -1;
    if (!open){
      var coins = getCoins();
      h += '<div class="card locked"><div class="sec-head"><h2 class="sec-title">상세 궁합 리포트</h2><span class="sec-meta">잠김</span></div>' +
        '<ul class="lock-list">' + ['두 사람의 기질 비교','관계에서 빛나는 점','부딪히기 쉬운 점과 대화 팁','올해 두 사람의 흐름','함께하면 좋은 활동'].map(function(t){ return '<li>' + LOCK_SVG + t + '</li>'; }).join('') + '</ul>' +
        '<div class="locked-preview" aria-hidden="true"><div style="width:92%"></div><div style="width:78%"></div><div style="width:85%"></div></div>' +
        '<div class="lock-cta"><button class="btn-primary" id="btnGhCoin"' + (!isGuest() && coins < GH_COST ? ' disabled' : '') + '>' + (isGuest() ? '로그인하고 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢 받기' : COIN_SVG + '엽전 ' + GH_COST + '닢으로 열기 <span style="opacity:.75;font-size:calc(12.5px*var(--fs))">(보유 ' + coins + ')</span>') + '</button>' +
        '<button class="btn-soft" id="btnGhAd">광고 보고 바로 열기</button>' +
        '<p class="helper" style="text-align:center">' + (isGuest() ? '로그인은 이 리포트를 열 때만 필요해요. 광고를 보고 바로 열 수도 있어요.' : coins < GH_COST ? '엽전이 ' + (GH_COST - coins) + '닢 부족해요. 매일 출석하면 10닢씩 모여요.' : '한 번 열면 이 두 사람의 리포트는 계속 볼 수 있어요.') + '</p></div></div>';
    } else {
      var ia = ILGAN[ra.pillars.day.stem], ib = ILGAN[rb.pillars.day.stem];
      var extraClash = m.dRel === 'chung' ? ' 일지가 충을 이뤄 생활 리듬이 엇갈리기 쉬우니 함께하는 시간과 혼자 쉬는 시간을 분명히 나눠 두세요.' : m.dRel === 'wonjin' ? ' 일지가 원진이라 작은 말에 서운해지기 쉬워요. 서운함은 그날 바로 가볍게 말하는 게 좋아요.' : '';
      h += '<div class="card"><div class="sec-head"><h2 class="sec-title">상세 궁합 리포트</h2><span class="sec-meta">열림</span></div>' +
        '<div class="sub-block"><h4>두 사람의 기질</h4><div class="cmp">' +
          '<div class="' + EL_CLASS[ra.pillars.day.sEl] + '"><span class="who">' + esc(A.name) + '</span><span class="hj">' + ra.pillars.day.sh + '</span><span class="im">' + ia.t + '<br>' + ia.img + '</span></div>' +
          '<div class="' + EL_CLASS[rb.pillars.day.sEl] + '"><span class="who">' + esc(B.name) + '</span><span class="hj">' + rb.pillars.day.sh + '</span><span class="im">' + ib.t + '<br>' + ib.img + '</span></div></div></div>' +
        '<div class="sub-block"><h4>관계에서 빛나는 점</h4><p class="body-text">' + nm(m.stemTxt.glow) + '</p></div>' +
        '<div class="sub-block"><h4>부딪히기 쉬운 점</h4><p class="body-text">' + nm(m.stemTxt.clash) + extraClash + '</p></div>' +
        '<div class="sub-block"><h4>대화 팁</h4><p class="body-text">' + nm(m.stemTxt.tip) + '</p></div>' +
        '<div class="sub-block"><h4>' + ra.seun.year + '년 두 사람의 흐름</h4><p class="body-text"><strong>' + esc(A.name) + '</strong> — ' + ra.seun.tenStem + '의 해. ' + SEUN_TEXT[ra.seun.tenStem].split('. ')[0] + '.<br><strong>' + esc(B.name) + '</strong> — ' + rb.seun.tenStem + '의 해. ' + SEUN_TEXT[rb.seun.tenStem].split('. ')[0] + '.</p></div>' +
        '<div class="sub-block"><h4>함께하면 좋은 활동</h4><p class="body-text">' + EL_TEXT[ra.yong].act + (ra.yong !== rb.yong ? ', 그리고 ' + EL_TEXT[rb.yong].act : '') + '. 두 사람의 용신(' + MS.EL_K[ra.yong] + (ra.yong !== rb.yong ? '·' + MS.EL_K[rb.yong] : '') + ')을 채워 주는 시간이 돼요.</p></div></div>';
    }
    h += '<p class="disclaimer">궁합은 일간·일지·띠·오행 구성을 비교한 재미용 풀이예요.</p>';
    box.innerHTML = h;
    bindGh();
    var unlock = function(){ var u = getUnlocks(); if (u.indexOf(key) < 0){ u.push(key); store('unsu_unlock', u); } renderGunghap(); toast('상세 궁합 리포트를 열었어요'); };
    $('btnGhShare').onclick = function(){
      var me = getMe();
      openShare({ sheetTitle:'궁합 결과 공유', title:A.name + ' × ' + B.name + ' 궁합 ' + m.score + '점', desc:m.grade + ' · ' + m.summary,
        fig:figSVG(ra.animal, ANIMAL_EL[ra.animal], 'mini'),
        text:'[운수] ' + A.name + ' × ' + B.name + ' 궁합 ' + m.score + '점 · ' + m.grade + '\n“' + m.summary + '”',
        cta:me ? '나랑도 궁합 볼래? 생년월일만 넣으면 바로 나와 →' : '너희 궁합도 확인해 봐 →',
        inviteEntry:me || null, link:linkFor('gunghap') });
    };
    if ($('btnGhInvite')) $('btnGhInvite').onclick = openInvite;
    if (!open){
      $('btnGhCoin').onclick = function(){ if (isGuest()){ openLoginSheet('로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요. 상세 궁합은 ' + GH_COST + '닢으로 열 수 있어요.'); return; } if (getCoins() < GH_COST) return; addCoins(-GH_COST, '상세 궁합 (' + A.name + '·' + B.name + ')'); unlock(); };
      $('btnGhAd').onclick = function(){ playAd(unlock); };
    }
  }
  function bindGh(){
    $('ghBody').querySelectorAll('[data-slot]').forEach(function(btn){
      btn.onclick = function(){
        var which = btn.dataset.slot;
        gh.edit = gh.edit === which ? null : which; gh.f = null;
        renderGunghap();
        var ed = $('ghEditor'); if (ed){ ed.scrollIntoView({ block:'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); var n = $('geName'); if (n && !('ontouchstart' in window)) n.focus(); }
      };
    });
    if ($('btnGhInv2')) $('btnGhInv2').onclick = openInvite;
    if ($('btnGhDemo')) $('btnGhDemo').onclick = function(){ enterDemo('gunghap'); };
  }

  /* =========================================================
     상태 분기: 게스트(정보 없음) / 프로필(기기 저장) / 로그인(동기화 목업) / 예시 모드
     ========================================================= */
  var pendingWelcome = false;
  var PROV = { kakao:'카카오', google:'Google', apple:'Apple' };
  var OK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var SHIELD_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/></svg>';

  function updateTopbar(){
    var me = getMe(), auth = store('unsu_auth');
    $('startChip').hidden = !!me;
    $('coinChip').hidden = !me;
    $('avatarBtn').hidden = !me;
    if (me) $('avatarTxt').textContent = me.name.charAt(0);
    $('syncDot').hidden = !(auth && !NS);
    renderCoin();
  }
  $('startChip').onclick = function(){ startOnboarding('new'); };
  $('avatarBtn').onclick = function(){ openMy(); };

  /* ---- 예시 모드 (별도 저장 공간) ---- */
  function demoBarHTML(){ return '<div class="demo-bar"><span><b>예시 모드</b> · 김운수님의 하루를 둘러보는 중</span><button id="btnDemoExit">내 사주로 시작</button></div>'; }
  function bindDemoBar(){ if ($('btnDemoExit')) $('btnDemoExit').onclick = function(){ startOnboarding('new'); }; }
  function enterDemo(target){
    store('unsu_mode', 'demo'); NS = 'demo:'; clearData();
    var t = Date.now().toString(36);
    var A = { id:'da' + t, sample:true, name:'김운수', gender:'F', cal:'solar', leap:false, y:1995, m:4, d:12, unknown:false, hour:9, minute:30, corr:true, saved:Date.now() };
    var B = { id:'db' + t, sample:true, name:'이별빛', gender:'M', cal:'solar', leap:false, y:1993, m:11, d:3, unknown:false, hour:21, minute:10, corr:true, saved:Date.now() };
    store('unsu_list', [A, B]); setMe(A.id);
    var att = { days:{} }, log = [{ t:Date.now() - 7*864e5, n:30, why:'가입 환영 선물' }], coins = 30;
    for (var i = 6; i >= 1; i--){ var d = new Date(); d.setDate(d.getDate() - i); att.days[ymd(d)] = 1; coins += 10; log.unshift({ t:d.getTime(), n:10, why:'출석 체크' }); }
    store('unsu_att', att); store('unsu_coin', coins); store('unsu_coinlog', log); store('unsu_welcomed', 1);
    closeSheet(); updateSegCount(); updateTopbar();
    go(target || 'today');
    setTimeout(function(){ toast('예시 모드예요. 7일째 출석하는 김운수님의 화면이에요'); }, 900);
  }
  function exitDemo(silent){
    clearData(); store('unsu_mode', null); NS = '';
    updateSegCount(); updateTopbar();
    if (!silent){ go('today'); toast('예시 모드를 끝냈어요'); }
  }

  /* ---- 사주 탭에서 저장했는데 대표가 없을 때 ---- */
  function askIsMe(entry){
    openSheet('<h3 id="sheetTitle">‘' + esc(entry.name) + '’님이 본인인가요?</h3>' +
      '<p class="body-text" style="margin-bottom:20px">본인 사주로 설정하면 매일 오늘의 운세, 출석 캘린더, 엽전 모으기가 시작돼요. 다른 사람이라면 목록에만 저장해 둘게요.</p>' +
      '<div class="view" style="gap:8px"><button class="btn-primary" id="btnIsMe">네, 제 사주예요</button><button class="btn-ghost" data-close>아니요, 다른 사람이에요</button></div>');
    $('btnIsMe').onclick = function(){
      setMe(entry.id); closeSheet(); welcomeCoins(); updateTopbar();
      toast('내 사주로 설정했어요. 오늘 탭에서 운세를 확인해 보세요');
    };
  }
  function welcomeCoins(){ if (!store('unsu_welcomed')){ store('unsu_welcomed', 1); pendingWelcome = true; } }
  function prepOtherForm(){
    $('btnReset').onclick();
    show('input');
    $('fName').placeholder = '상대의 이름';
    toast('상대의 생년월일을 입력하고 ‘저장’을 눌러 주세요');
  }

  /* =========================================================
     게스트 홈 (내 정보가 없을 때의 첫 화면)
     ========================================================= */
  var FEAT_IC = {
    today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/></svg>',
    saju:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M8 4v16M12 4v16M16 4v16M3.5 12h17"/></svg>',
    gh:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>'
  };
  function renderWelcome(){
    var now = new Date(), pd = PUBLIC_DAY.today(now), P = pd.pillars;
    var an = MS.BR_ANIMAL[P.year.br];
    var acc = store('unsu_account');
    var h = INVITE ? inviteHeroHTML() : '<div class="wel-hero">' +
      '<div class="today-date">' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 ' + WD[now.getDay()] + '요일 · ' + P.day.hanja + '日</div>' +
      '<h1 class="hero-title">내 사주로 여는 오늘의 운세</h1>' +
      '<div class="wel-fig" id="welFig">' + figSVG(an, MS.EL_KEY[P.day.sEl]) + '</div>' +
      '<p class="helper" style="max-width:24em">생년월일만 알려 주면 만세력으로 여덟 글자를 풀고, 매일 오늘의 운세와 행운 번호를 챙겨 드려요.</p>' +
      '<div class="wel-cta"><button class="btn-primary btn-block" id="btnWelStart">내 사주 입력하고 시작하기</button><button class="text-btn" id="btnWelDemo">예시로 먼저 둘러보기</button></div></div>';
    if (acc && acc.snapshot && acc.snapshot.unsu_me){
      var rl = acc.snapshot.unsu_att && acc.snapshot.unsu_att.days ? Object.keys(acc.snapshot.unsu_att.days).length : 0;
      h += '<div class="card return-card"><div><div style="font-size:calc(15px*var(--fs));color:#fff;font-weight:600">다시 오셨네요, ' + esc(acc.nick) + '님</div><p class="helper">' + PROV[acc.provider] + ' 계정에 출석 ' + rl + '일 · 엽전 ' + (acc.snapshot.unsu_coin || 0) + '닢이 보관돼 있어요.</p></div><button class="btn-soft" id="btnWelReturn" style="padding:10px 14px;font-size:calc(13px*var(--fs))">로그인</button></div>';
    }
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">오늘의 기운</h2><span class="sec-meta">' + P.day.hanja + '日</span></div>' +
      '<div class="day-msg"><div class="luck-g"><span class="' + EL_CLASS[P.day.sEl] + '">' + P.day.sh + '</span><span class="' + EL_CLASS[P.day.bEl] + '">' + P.day.bh + '</span></div><p class="body-text">오늘은 ' + P.day.name + '일이에요. ' + pd.msg + '</p></div></div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">오늘의 띠별 운세</h2><span class="sec-meta">12 ANIMALS</span></div><div class="ddi-list">' +
      pd.rows.map(function(row){
        var dots = ''; for (var i = 1; i <= 5; i++) dots += '<i class="' + (i <= row.score ? 'on' : '') + '"></i>';
        return '<div class="ddi">' + figSVG(row.animal, ANIMAL_EL[row.animal], 'mini') + '<span class="an">' + row.animal + '띠</span><span class="ln">' + row.line + '</span><span class="dots5" aria-label="5점 중 ' + row.score + '점">' + dots + '</span></div>';
      }).join('') + '</div>' +
      '<button class="row-link" id="btnWelMore"><span class="ic">' + FEAT_IC.saju + '</span><span>띠는 태어난 해 한 글자만 봐요.<br><span class="helper">여덟 글자로 정확하게 보기</span></span><span class="chev">›</span></button></div>';
    h += '<div class="feat">' +
      '<button id="ftToday"><span class="ic">' + FEAT_IC.today + '</span><b>오늘의 운세</b><small>재물·연애·직업 점수와 출석 캘린더</small></button>' +
      '<button id="ftSaju"><span class="ic">' + FEAT_IC.saju + '</span><b>만세력 풀이</b><small>원국·대운·세운까지 로그인 없이</small></button>' +
      '<button id="ftGh"><span class="ic">' + FEAT_IC.gh + '</span><b>궁합</b><small>두 사람의 일간·일지·오행 비교</small></button>' +
      '<button id="ftZ"><span class="ic">' + FEAT_IC.star + '</span><b>별자리 운세</b><small>12성좌 오늘의 기운과 번호</small></button></div>';
    h += '<div class="ad-slot" aria-label="광고 영역 예시"><span class="ad-badge">AD</span><span class="ph"></span><div><b>네이티브 광고 영역</b><small>게스트 홈 · 콘텐츠 사이 1개</small></div></div>';
    h += '<p class="disclaimer">운세는 전통 명리 이론을 바탕으로 한 재미용 콘텐츠예요.</p>' + bizFootHTML();
    $('todayBody').innerHTML = h;
    drawOn($('welFig'));
    updateTopbar();
    $('btnWelMore').onclick = $('ftToday').onclick = function(){ startOnboarding('new'); };
    if ($('btnWelStart')) $('btnWelStart').onclick = function(){ startOnboarding('new'); };
    if ($('btnWelDemo')) $('btnWelDemo').onclick = function(){ enterDemo('today'); };
    if ($('btnInvStart')) $('btnInvStart').onclick = function(){ startOnboarding('new'); };
    if ($('btnInvSkip')) $('btnInvSkip').onclick = function(){ clearInvite(); renderWelcome(); window.scrollTo(0, 0); };
    $('ftSaju').onclick = function(){ show('input'); };
    $('ftGh').onclick = function(){ go('gunghap'); };
    $('ftZ').onclick = function(){ $('zResult').hidden = true; $('zHome').hidden = false; show('zodiac'); };
    if ($('btnWelReturn')) $('btnWelReturn').onclick = function(){ openLoginSheet('이전에 쓰던 계정으로 로그인하면 기록을 그대로 불러와요.'); };
  }

  /* =========================================================
     온보딩: 이름 → 생년월일 → 태어난 시간 → 성별 → 확인
     ========================================================= */
  var ob = null;
  function startOnboarding(mode){
    if (NS) exitDemo(true);
    var me = getMe();
    ob = { mode:mode || 'new', step:0, back4:false, name:'', cal:'solar', leap:false, birth:'', unknown:false, h:null, m:null, gender:null };
    if (ob.mode === 'edit' && me){
      ob.name = me.name; ob.cal = me.cal; ob.leap = !!me.leap; ob.birth = me.y + pad2(me.m) + pad2(me.d);
      ob.unknown = !!me.unknown; ob.h = me.unknown ? null : me.hour; ob.m = me.unknown ? null : me.minute; ob.gender = me.gender; ob.step = 4; ob.editId = me.id;
    }
    closeSheet(); show('onboard'); renderOb();
  }
  function obEntry(){
    var b = parseBirth(ob.birth);
    return { name:ob.name.trim(), gender:ob.gender, cal:ob.cal, leap:ob.cal === 'lunar' && ob.leap, y:b.y, m:b.m, d:b.d,
      unknown:ob.unknown, hour:ob.unknown ? null : ob.h, minute:ob.unknown ? null : ob.m, corr:true };
  }
  function obBirthState(){
    var v = ob.birth, b = parseBirth(v);
    if (v.length < 8) return { ok:false, cls:'', text:'숫자 8자리로 입력해 주세요 (예: 19950412)' };
    if (!b || b.y < 1900 || b.y > 2050) return { ok:false, cls:'err', text:'1900~2050년 사이의 날짜를 입력해 주세요' };
    var s;
    if (ob.cal === 'solar'){
      var dt = new Date(Date.UTC(b.y, b.m-1, b.d));
      if (dt.getUTCMonth() !== b.m-1 || dt.getUTCDate() !== b.d) return { ok:false, cls:'err', text:'달력에 없는 날짜예요' };
      s = b;
    } else {
      s = MS.lunarToSolar(b.y, b.m, b.d, ob.leap);
      if (!s) return { ok:false, cls:'err', text:ob.leap ? b.y + '년에는 윤' + b.m + '월이 없어요. 평달을 선택해 주세요' : '음력 달력에 없는 날짜예요' };
    }
    if (new Date(s.y, s.m-1, s.d) > new Date()) return { ok:false, cls:'err', text:'오늘 이후의 날짜는 입력할 수 없어요' };
    var l = MS.solarToLunar(s.y, s.m, s.d);
    var yb = MS.calc({ y:s.y, m:s.m, d:s.d, cal:'solar', unknownTime:true, gender:'M' });
    var tail = yb.error ? '' : ' · ' + yb.pillars.year.name + '년생 ' + yb.color + ' ' + yb.animal + '띠';
    return { ok:true, cls:'ok', text: ob.cal === 'solar' ? '양력 ' + s.y + '.' + s.m + '.' + s.d + (l ? ' (음력 ' + l.m + '.' + l.d + (l.leap ? ' 윤' : '') + ')' : '') + tail
      : '음력 ' + (ob.leap ? '윤' : '') + b.m + '.' + b.d + ' → 양력 ' + s.y + '.' + s.m + '.' + s.d + tail, solar:s };
  }
  function obValid(){
    switch (ob.step){
      case 0: return ob.name.trim().length > 0;
      case 1: return obBirthState().ok;
      case 2: return ob.unknown || (ob.h !== null && ob.m !== null);
      case 3: return !!ob.gender;
      default: return true;
    }
  }
  /* 시진은 엔진의 실제 보정값(진태양시·표준시 변경·서머타임)으로 표시 */
  function obSijin(){
    if (ob.unknown || ob.h === null || ob.m === null || !obBirthState().ok) return null;
    var e = obEntry(); e.gender = e.gender || 'F';
    var r = compute(e); if (r.error || !r.pillars.hour) return null;
    return { lm: pad2(r.corr.lmH) + ':' + pad2(r.corr.lmMi), name: r.pillars.hour.bk + '시', hj: r.pillars.hour.bh + '時' };
  }
  function obTimeText(){
    if (ob.unknown) return '모름 (시주 없이 6글자로 풀이)';
    if (ob.h === null) return '';
    if (ob.m === null) return pad2(ob.h) + '시 · 분을 골라 주세요';
    var sj = obSijin();
    return pad2(ob.h) + ':' + pad2(ob.m) + (sj ? ' → 진태양시 ' + sj.lm + ' · ' + sj.name + '(' + sj.hj + ')' : '');
  }
  function renderOb(){
    var st = ob.step, body = $('obBody');
    var prog = st >= 4 ? 100 : (st / 4) * 100 + 8;
    var q = '', sub = '', inner = '', next = '다음';
    if (st === 0){
      q = '뭐라고 불러 드릴까요?'; sub = '풀이와 오늘의 운세에서 부를 이름이에요. 별명도 괜찮아요.';
      inner = '<input class="ob-input" id="obName" maxlength="12" placeholder="이름 또는 별명" autocomplete="off" value="' + esc(ob.name) + '">';
    } else if (st === 1){
      q = esc(ob.name) + '님의<br>생년월일을 알려 주세요'; sub = '음력 생일이라면 음력을 고르고, 윤달 여부도 확인해 주세요.';
      inner = '<div class="toggle-row" style="grid-template-columns:1fr 1fr">' +
        '<div class="pill" role="group" aria-label="양력 음력"><button type="button" data-oc="solar" aria-pressed="' + (ob.cal === 'solar') + '">양력</button><button type="button" data-oc="lunar" aria-pressed="' + (ob.cal === 'lunar') + '">음력</button></div>' +
        '<div class="pill' + (ob.cal === 'lunar' ? '' : ' is-disabled') + '" role="group" aria-label="평달 윤달"><button type="button" data-ol="0" aria-pressed="' + !ob.leap + '"' + (ob.cal === 'lunar' ? '' : ' disabled') + '>평달</button><button type="button" data-ol="1" aria-pressed="' + ob.leap + '"' + (ob.cal === 'lunar' ? '' : ' disabled') + '>윤달</button></div></div>' +
        '<input class="ob-input" id="obBirth" inputmode="numeric" maxlength="8" placeholder="19950412" autocomplete="off" value="' + ob.birth + '">' +
        '<div class="field-hint" id="obBirthHint"></div>';
    } else if (st === 2){
      q = '태어난 시간을<br>알고 있나요?'; sub = '시간까지 알면 시주(時柱)가 더해져 풀이가 더 정확해져요.';
      var hg = '<option value="">시</option>'; for (var i = 0; i < 24; i++) hg += '<option value="' + i + '"' + (ob.h === i ? ' selected' : '') + '>' + pad2(i) + '시</option>';
      var mg = '<option value="">분</option>'; for (var j = 0; j < 60; j++) mg += '<option value="' + j + '"' + (ob.m === j ? ' selected' : '') + '>' + pad2(j) + '분</option>';
      inner = '<button type="button" class="unk-btn" id="obUnk" aria-pressed="' + ob.unknown + '"><span>태어난 시간을 몰라요</span><span class="ck">' + (ob.unknown ? OK_SVG : '') + '</span></button>' +
        '<div class="dd-group' + (ob.unknown ? ' dim' : '') + '" style="margin-top:6px"><select class="sel sel-lg" id="obH" aria-label="태어난 시"' + (ob.unknown ? ' disabled' : '') + '>' + hg + '</select><select class="sel sel-lg" id="obM" aria-label="태어난 분"' + (ob.unknown ? ' disabled' : '') + '>' + mg + '</select></div>' +
        '<div class="field-hint ok">' + obTimeText() + '</div>';
    } else if (st === 3){
      q = '성별을 선택해 주세요'; sub = '대운이 흐르는 방향(순행·역행)을 정하는 데 쓰여요.';
      inner = '<div class="opt-cards">' +
        '<button type="button" class="opt-card" data-og="F" aria-pressed="' + (ob.gender === 'F') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/></svg>여자</button>' +
        '<button type="button" class="opt-card" data-og="M" aria-pressed="' + (ob.gender === 'M') + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="10" cy="14" r="5"/><path d="M13.5 10.5L20 4M15 4h5v5"/></svg>남자</button></div>';
    } else {
      var e = obEntry(), r = compute(e), bs = obBirthState();
      q = ob.mode === 'edit' ? '내 정보를 확인해 주세요' : '이 정보로<br>사주를 펼칠게요';
      next = ob.mode === 'edit' ? '수정 완료' : '이 정보로 시작하기';
      inner = '<div class="card cf-card">' + (r.error ? '' : figSVG(r.animal, MS.EL_KEY[r.pillars.day.sEl]) +
        '<div class="poster-name">' + esc(e.name) + '</div><div class="poster-sub">' + r.pillars.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · <span style="font-family:var(--font-hanja);color:#fff">' + r.pillars.day.hanja + '</span>일주</div>') +
        '<div class="cf-rows">' +
        '<div class="cf-row"><span class="k">이름</span><span class="v">' + esc(e.name) + '</span><button data-ej="0">수정</button></div>' +
        '<div class="cf-row"><span class="k">생년월일</span><span class="v">' + (e.cal === 'lunar' ? '음력 ' + (e.leap ? '윤달 ' : '') : '양력 ') + e.y + '.' + pad2(e.m) + '.' + pad2(e.d) + '<small>' + (r.error ? '' : e.cal === 'lunar' ? '양력 ' + r.solar.y + '.' + pad2(r.solar.m) + '.' + pad2(r.solar.d) : (r.lunar ? '음력 ' + r.lunar.y + '.' + pad2(r.lunar.m) + '.' + pad2(r.lunar.d) + (r.lunar.leap ? ' (윤달)' : '') : '')) + '</small></span><button data-ej="1">수정</button></div>' +
        '<div class="cf-row"><span class="k">태어난 시간</span><span class="v">' + (e.unknown ? '모름' : pad2(e.hour) + ':' + pad2(e.minute)) + '<small>' + (e.unknown ? '시주 없이 6글자로 풀이' : (r.error || !r.pillars.hour ? '' : '진태양시 ' + pad2(r.corr.lmH) + ':' + pad2(r.corr.lmMi) + ' · ' + r.pillars.hour.bk + '시(' + r.pillars.hour.bh + '時)')) + '</small></span><button data-ej="2">수정</button></div>' +
        '<div class="cf-row"><span class="k">성별</span><span class="v">' + (e.gender === 'M' ? '남자' : '여자') + '</span><button data-ej="3">수정</button></div>' +
        '</div></div>' +
        '<p class="privacy">' + SHIELD_SVG + '<span>입력한 정보는 이 기기의 브라우저에만 저장돼요. 로그인하면 계정에 안전하게 보관할 수 있어요.</span></p>';
    }
    body.innerHTML = '<div class="ob-top"><button id="obBack" aria-label="이전">‹</button><div class="ob-prog" role="progressbar" aria-valuenow="' + Math.round(prog) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + prog + '%"></i></div><button class="x" id="obClose" aria-label="닫기">✕</button></div>' +
      (st < 4 ? '<div class="ob-step">STEP ' + (st + 1) + ' / 4</div>' : '<div class="ob-step">CONFIRM</div>') +
      '<h1 class="ob-q">' + q + '</h1>' + (sub ? '<p class="helper" style="margin-top:-8px">' + sub + '</p>' : '') +
      '<div class="ob-body">' + inner + '</div>' +
      '<div class="ob-cta"><button class="btn-primary btn-block" id="obNext"' + (obValid() ? '' : ' disabled') + '>' + next + '</button>' + (st === 4 && ob.mode !== 'edit' ? '<button type="button" class="btn-ghost btn-block" id="obSave" style="margin-top:8px">' + esc(ob.name) + '님 정보 저장하기</button>' : '') + '</div>';
    bindOb();
  }
  function refreshNext(){ $('obNext').disabled = !obValid(); }
  function obGoNext(){
    if (!obValid()) return;
    if (ob.step < 4){ ob.step = ob.back4 ? 4 : ob.step + 1; ob.back4 = false; renderOb(); window.scrollTo(0, 0); }
    else finishOb();
  }
  function bindOb(){
    var st = ob.step;
    $('obBack').onclick = function(){ if (ob.back4){ ob.back4 = false; ob.step = 4; renderOb(); return; } if (st === 0 || (ob.mode === 'edit' && st === 4)) return closeOb(); ob.step--; renderOb(); };
    $('obClose').onclick = closeOb;
    $('obNext').onclick = obGoNext;
    if (st === 0){
      var n = $('obName'); n.focus();
      n.oninput = function(){ ob.name = n.value; refreshNext(); };
      n.onkeydown = function(e){ if (e.key === 'Enter') obGoNext(); };
    } else if (st === 1){
      var bi = $('obBirth'), hint = $('obBirthHint');
      var upd = function(){ var s = obBirthState(); hint.className = 'field-hint ' + s.cls; hint.textContent = s.text; refreshNext(); };
      bi.oninput = function(){ bi.value = bi.value.replace(/\D/g, '').slice(0, 8); ob.birth = bi.value; upd(); };
      bi.onkeydown = function(e){ if (e.key === 'Enter') obGoNext(); };
      $('obBody').querySelectorAll('[data-oc]').forEach(function(b){ b.onclick = function(){ ob.cal = b.dataset.oc; if (ob.cal === 'solar') ob.leap = false; renderOb(); }; });
      $('obBody').querySelectorAll('[data-ol]').forEach(function(b){ b.onclick = function(){ ob.leap = b.dataset.ol === '1'; renderOb(); }; });
      upd(); if (!ob.birth) bi.focus();
    } else if (st === 2){
      $('obUnk').onclick = function(){ ob.unknown = !ob.unknown; renderOb(); };
      $('obH').onchange = function(){ ob.h = this.value === '' ? null : +this.value; if (ob.h !== null && ob.m === null) ob.m = 0; renderOb(); };
      $('obM').onchange = function(){ ob.m = this.value === '' ? null : +this.value; renderOb(); };
    } else if (st === 3){
      $('obBody').querySelectorAll('[data-og]').forEach(function(b){ b.onclick = function(){ ob.gender = b.dataset.og; renderOb(); setTimeout(obGoNext, 280); }; });
    } else {
      if ($('obSave')) $('obSave').onclick = function(){ finishOb(true); };
      $('obBody').querySelectorAll('[data-ej]').forEach(function(b){ b.onclick = function(){ ob.step = +b.dataset.ej; ob.back4 = true; renderOb(); }; });
    }
  }
  function closeOb(){ var mode = ob && ob.mode; ob = null; if (mode === 'edit') openMy(); else go('today'); }
  function finishOb(saveOnly){
    var e = obEntry(), r = compute(e);
    if (r.error){ toast(r.error); ob.step = 1; renderOb(); return; }
    if (ob.mode === 'edit'){
      var id = ob.editId;
      store('unsu_list', getList().map(function(x){ return x.id === id ? Object.assign({}, x, e, { id:id, sample:false }) : x; }));
      ob = null; toast('내 정보를 수정했어요'); openMy(); return;
    }
    e.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); e.saved = Date.now();
    var list = getList(); list.unshift(e); store('unsu_list', list); setMe(e.id);
    welcomeCoins(); updateSegCount(); ob = null;
    if (saveOnly){ toast(e.name + '님 정보를 저장했어요'); go('today'); return; }
    showGen(r, function(){ if (!(INVITE && acceptInviteForMe())) go('today'); });
  }
  function showGen(r, cb){
    var P = r.pillars, g = ['hour','day','month','year'].map(function(k){ return P[k] ? P[k].hanja : '　　'; }).join(' ');
    var steps = ['절기·음력 맞추는 중', '여덟 글자 세우는 중', '오행의 균형 헤아리는 중', '용신 찾는 중'];
    var mx = Math.max.apply(null, r.cnt.concat([1])), bars = '';
    for (var e = 0; e < 5; e++) bars += '<div class="gb ' + EL_CLASS[e] + '"><span>' + MS.EL_H[e] + '</span><i><u data-w="' + Math.max(8, Math.round(r.cnt[e] / mx * 100)) + '"></u></i></div>';
    var el = document.createElement('div'); el.className = 'gen'; el.setAttribute('role', 'status');
    el.innerHTML = '<div class="gen-fig">' + figSVG(r.animal, MS.EL_KEY[P.day.sEl]) + '<span class="gen-ring"></span></div><div class="hj">' + g + '</div>' +
      '<b id="genStep">' + steps[0] + '</b><div class="gen-bars">' + bars + '</div>' +
      '<div class="gen-prog"><i id="genProg"></i></div><p id="genPct">0%</p>';
    document.body.appendChild(el);
    var s = el.querySelector('svg'); s.classList.add('fig'); if (!reduceMotion) s.classList.add('draw');
    if (reduceMotion){ el.querySelectorAll('u').forEach(function(u){ u.style.width = u.dataset.w + '%'; }); setTimeout(function(){ el.remove(); cb(); }, 500); return; }
    var T = 3200, t0 = Date.now();
    setTimeout(function(){ el.querySelectorAll('u').forEach(function(u, i){ setTimeout(function(){ u.style.width = u.dataset.w + '%'; }, i * 380); }); }, 900);
    (function tick(){
      var k = Math.min(1, (Date.now() - t0) / T);
      $('genProg').style.width = (k * 100) + '%'; $('genPct').textContent = Math.round(k * 100) + '%';
      $('genStep').textContent = steps[Math.min(3, Math.floor(k * 4))];
      if (k < 1) requestAnimationFrame(tick);
      else { el.classList.add('flash'); setTimeout(function(){ el.remove(); cb(); }, 650); }
    })();
  }

  /* =========================================================
     내 정보 (마이)
     ========================================================= */
  var myConfirm = null;
  function openMy(){ myConfirm = null; renderMy(); show('my'); }
  $('btnMyBack').onclick = function(){ go('today'); };
  function renderMy(){
    var me = getMe(); if (!me){ go('today'); return; }
    var r = compute(me), auth = store('unsu_auth'), att = getAtt();
    var h = NS ? demoBarHTML() : '';
    h += '<div class="card"><div class="my-prof">' + (r.error ? '' : figSVG(r.animal, ANIMAL_EL[r.animal], 'mini')) +
      '<div><div class="nm">' + esc(me.name) + '<span class="chip" style="font-size:calc(11px*var(--fs));padding:2px 8px">' + (me.gender === 'M' ? '남' : '여') + '</span>' + (NS ? '<span class="chip" style="font-size:calc(11px*var(--fs));padding:2px 8px">예시</span>' : '') + '</div>' +
      '<div class="sb">' + (r.error ? '' : r.pillars.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · ' + r.pillars.day.name + '(' + r.pillars.day.hanja + ')일주') + '<br>' + fmtEntryDate(me) + '</div></div></div>' +
      '<div class="row"><button class="btn-ghost grow" id="btnMyEdit">정보 수정</button><button class="btn-soft grow" id="btnMySaju">내 사주 풀이</button></div></div>';
    h += '<div class="stat4">' +
      '<button id="stCoin"><b>' + getCoins() + '</b><span>엽전</span></button>' +
      '<button id="stAtt"><b>' + streakOf(att) + '일</b><span>연속 출석</span></button>' +
      '<button id="stList"><b>' + getList().length + '명</b><span>저장한 사주</span></button>' +
      '<button id="stGh"><b>' + getUnlocks().length + '개</b><span>궁합 리포트</span></button></div>';
    var cps = getCoupons(), pt = getPet();
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">쿠폰함</h2><span class="sec-meta">' + cps.length + '장</span></div>' +
      (cps.length ? cps.map(function(c){ var d = new Date(c.exp); return '<div class="pet-ticket sm"><small>COUPON</small><b>' + esc(c.name) + '</b><span>' + (d.getMonth()+1) + '월 ' + d.getDate() + '일까지 · 신년운세 결제 때 자동 적용</span></div>'; }).join('')
        : '<div class="pet-mini-row">' + petSVG(petMood(pt.g), pt.lv, 'mini') + '<p class="helper">운이와 교감 ' + pt.g + '/100 · 가득 차면 신년운세 할인 쿠폰을 받아요</p></div>') + '</div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">계정</h2></div>';
    if (NS){
      h += '<p class="body-text">예시 모드에서는 로그인할 수 없어요. 내 사주로 시작하면 기록을 계정에 보관할 수 있어요.</p><button class="btn-primary btn-block" id="btnMyStart">내 사주로 시작하기</button>';
    } else if (!auth){
      h += '<div class="acc-state"><span class="badge guest">게스트</span><span class="helper">지금은 이 기기의 브라우저에만 저장돼 있어요</span></div>' +
        '<ul class="benefits"><li>' + OK_SVG + '기기를 바꾸거나 앱을 지워도 출석·엽전이 그대로예요</li><li>' + OK_SVG + '저장한 사주와 열어 본 궁합 리포트가 보관돼요</li><li>' + OK_SVG + '가족·친구의 사주를 여러 기기에서 볼 수 있어요</li></ul>' +
        '<button class="btn-social k" data-login="kakao">카카오로 계속하기</button><button class="btn-social g" data-login="google">Google로 계속하기</button>' +
        '<p class="mock-note">포트폴리오 목업이에요 · 실제 계정과 연결되지 않고 이 브라우저 안에서만 흉내 내요</p>';
    } else {
      var acc = store('unsu_account'), at = acc && acc.at ? new Date(acc.at) : new Date();
      h += '<div class="acc-state"><span class="badge member">로그인됨</span><span class="helper">' + PROV[auth.provider] + ' 계정 · ' + esc(auth.nick) + '</span></div>' +
        '<p class="helper">마지막 동기화 ' + (at.getMonth()+1) + '.' + at.getDate() + ' ' + pad2(at.getHours()) + ':' + pad2(at.getMinutes()) + ' · 출석과 엽전이 계정에 보관되고 있어요.</p>';
      if (myConfirm === 'logout') h += '<div class="inline-confirm">로그아웃하면 이 기기에서 내 정보가 지워져요. 같은 계정으로 다시 로그인하면 그대로 돌아와요.<div class="row"><button class="btn-ghost grow" data-mc="cancel">취소</button><button class="btn-ghost btn-danger grow" id="btnLogoutOk">로그아웃</button></div></div>';
      else h += '<button class="btn-ghost btn-block" id="btnLogout">로그아웃</button>';
    }
    h += '</div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">글자 크기</h2></div>' + fsSegHTML() + '</div>';
    h += '<div class="card"><div class="set-list">' +
      (NS ? '' : '<button class="set-row" id="setInvite"><span>친구에게 궁합 신청하기</span><span class="s">초대 링크 보내기 ›</span></button>') +
      '<button class="set-row" id="setMe"><span>대표 사주 바꾸기</span><span class="s">저장 목록에서 별 누르기 ›</span></button>' +
      (NS ? '<button class="set-row" id="setDemo"><span>예시 모드 끝내기</span><span class="s">첫 화면으로 ›</span></button>' : '') +
      '<button class="set-row danger" id="setReset"><span>이 기기의 데이터 초기화</span><span class="s">›</span></button>' +
      (myConfirm === 'reset' ? '<div class="inline-confirm">이 기기에 저장된 사주, 출석, 엽전이 모두 지워져요.' + (auth ? ' 계정에 보관된 기록은 남아 있어요.' : ' 로그인하지 않았다면 되돌릴 수 없어요.') + '<div class="row"><button class="btn-ghost grow" data-mc="cancel">취소</button><button class="btn-ghost btn-danger grow" id="btnResetOk">초기화</button></div></div>' : '') +
      '<div class="set-row" style="cursor:default"><span>앱 정보</span><span class="s">운수 v1.0 · 재미로 즐기는 콘텐츠</span></div>' +
      '</div></div>' + bizFootHTML();
    $('myBody').innerHTML = h;
    bindFsSeg($('myBody'));
    bindDemoBar();
    $('btnMyEdit').onclick = function(){ if (NS){ toast('예시 모드에서는 수정할 수 없어요'); return; } startOnboarding('edit'); };
    $('btnMySaju').onclick = function(){ openMine(); };
    $('stCoin').onclick = openCoinSheet;
    $('stAtt').onclick = function(){ if (!r.error) openAttSheet(me, r); };
    $('stList').onclick = function(){ renderList(); show('list'); };
    $('stGh').onclick = function(){ go('gunghap'); };
    $('setMe').onclick = function(){ renderList(); show('list'); };
    if ($('setInvite')) $('setInvite').onclick = openInvite;
    if ($('setDemo')) $('setDemo').onclick = function(){ exitDemo(); };
    $('setReset').onclick = function(){ myConfirm = myConfirm === 'reset' ? null : 'reset'; renderMy(); };
    if ($('btnResetOk')) $('btnResetOk').onclick = function(){
      if (NS){ exitDemo(); return; }
      clearData(); store('unsu_auth', null); updateSegCount(); updateTopbar(); go('today'); toast('이 기기의 데이터를 모두 지웠어요');
    };
    if ($('btnMyStart')) $('btnMyStart').onclick = function(){ startOnboarding('new'); };
    if ($('btnLogout')) $('btnLogout').onclick = function(){ myConfirm = 'logout'; renderMy(); };
    if ($('btnLogoutOk')) $('btnLogoutOk').onclick = doLogout;
    $('myBody').querySelectorAll('[data-mc]').forEach(function(b){ b.onclick = function(){ myConfirm = null; renderMy(); }; });
    $('myBody').querySelectorAll('[data-login]').forEach(function(b){ b.onclick = function(){ doLogin(b.dataset.login, b); }; });
  }

  /* =========================================================
     로그인 · 로그아웃 (동기화 목업: 계정 스냅샷을 브라우저에 보관)
     ========================================================= */
  function snapshot(){ var o = {}; DATA_KEYS.forEach(function(k){ o[k] = store(k); }); return o; }
  var syncT = 0;
  function writeAccount(){ var a = store('unsu_auth'); if (!a || NS) return; store('unsu_account', { provider:a.provider, nick:a.nick, snapshot:snapshot(), at:Date.now() }); }
  syncHook = function(){ clearTimeout(syncT); syncT = setTimeout(writeAccount, 60); };
  function openLoginSheet(reason){
    if (NS){ toast('예시 모드에서는 로그인할 수 없어요'); return; }
    openSheet('<h3 id="sheetTitle">로그인하고 기록 지키기</h3>' + (reason ? '<p class="body-text" style="margin:-6px 0 14px">' + reason + '</p>' : '') +
      '<ul class="benefits"><li>' + OK_SVG + '<b>처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢</b>을 바로 드려요</li><li>' + OK_SVG + '기기를 바꿔도 출석·엽전이 그대로예요</li><li>' + OK_SVG + '저장한 사주와 궁합 리포트가 계정에 보관돼요</li></ul>' +
      '<div class="view" style="gap:8px;margin-top:18px"><button class="btn-social k" data-login="kakao">카카오로 계속하기</button><button class="btn-social g" data-login="google">Google로 계속하기</button>' +
      '<button class="text-btn" data-close>나중에 할게요</button><p class="mock-note">포트폴리오 목업이에요 · 실제 계정과 연결되지 않아요</p></div>');
    $('sheetBody').querySelectorAll('[data-login]').forEach(function(b){ b.onclick = function(){ doLogin(b.dataset.login, b); }; });
  }
  function doLogin(provider, btn){
    if (NS){ toast('예시 모드에서는 로그인할 수 없어요'); return; }
    if (btn){ btn.disabled = true; btn.textContent = '연결 중…'; }
    setTimeout(function(){
      var acc = store('unsu_account'), restored = false;
      if (acc && acc.provider === provider && acc.snapshot && acc.snapshot.unsu_me && !getMe()){
        DATA_KEYS.forEach(function(k){ var v = acc.snapshot[k]; if (v !== null && v !== undefined) store(k, v); });
        restored = true;
      }
      var me = getMe();
      store('unsu_auth', { provider:provider, nick:me ? me.name : (acc && acc.nick) || '운수 사용자', at:Date.now() });
      var gift = !store('unsu_gift');
      if (gift){ store('unsu_gift', 1); addCoins(SIGNUP_COINS, '가입 환영 선물'); }
      writeAccount(); closeSheet(); updateSegCount(); updateTopbar();
      toast(gift ? PROV[provider] + ' 계정으로 로그인했어요 · 가입 선물 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 받았어요' : restored ? '다시 오셨네요! 계정의 기록을 불러왔어요' : PROV[provider] + ' 계정으로 로그인했어요 · 기록이 동기화돼요');
      if (currentView === 'my') renderMy(); else go('today');
    }, 900);
  }
  function doLogout(){
    writeAccount();
    store('unsu_auth', null); clearData();
    updateSegCount(); updateTopbar(); go('today');
    toast('로그아웃했어요. 같은 계정으로 로그인하면 기록이 돌아와요');
  }

  /* =========================================================
     시작: 이전 버전 예시 데이터 정리 → 첫 방문 인트로 → 오늘
     ========================================================= */
  (function migrate(){
    if (NS) return;
    var l = getList();
    if (!l.some(function(x){ return x.sample; })) return;
    var real = l.filter(function(x){ return !x.sample; });
    if (!real.length){ clearData(); return; }
    store('unsu_list', real);
    if (!real.some(function(x){ return x.id === store('unsu_me'); })) setMe(null);
  })();
  updateSegCount();
  updateTopbar();
  renderToday();
  (function intro(){
    if (store('unsu_intro')) return;
    store('unsu_intro', 1);
    var el = $('intro'); el.hidden = false;
    var done = function(){ if (el.hidden) return; el.classList.add('out'); setTimeout(function(){ el.hidden = true; }, 500); };
    el.onclick = done;
    setTimeout(done, reduceMotion ? 600 : 2400);
  })();

  /* =========================================================
     공유 · 초대 링크
     - Claude 아티팩트 안: 공개 아티팩트 링크(+ #토큰)로 공유
     - 직접 배포한 주소: 그 주소(+ ?i=초대코드)로 공유
     ========================================================= */
  var APP_URL = 'https://claude.ai/artifact/NNHb2ZK2F9wc6rpagwoEhm';
  function inFrame(){ try { return window.top !== window.self; } catch(e){ return true; } }
  function isHosted(){ return /^https?:$/.test(location.protocol) && !inFrame(); }
  function shareBase(){ return isHosted() ? location.origin + location.pathname : APP_URL; }
  function linkFor(anchor){ return shareBase() + (anchor ? '#' + anchor : ''); }
  function b64u(str){ return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64u(s){ s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  function encodeInvite(e, withTime){
    return b64u(['1', e.name.replace(/\|/g, ' ').slice(0, 12), e.gender, e.cal === 'lunar' ? 'l' : 's', e.leap ? '1' : '0',
      '' + e.y + pad2(e.m) + pad2(e.d), (withTime && !e.unknown) ? pad2(e.hour) + pad2(e.minute) : ''].join('|'));
  }
  function decodeInvite(code){
    var p = unb64u(code).split('|'); if (p[0] !== '1' || p.length < 7 || !/^\d{8}$/.test(p[5])) return null;
    var t = /^\d{4}$/.test(p[6]) ? p[6] : '';
    var e = { name:(p[1] || '친구').slice(0, 12), gender:p[2] === 'M' ? 'M' : 'F', cal:p[3] === 'l' ? 'lunar' : 'solar', leap:p[4] === '1',
      y:+p[5].slice(0, 4), m:+p[5].slice(4, 6), d:+p[5].slice(6, 8), unknown:!t, hour:t ? +t.slice(0, 2) : null, minute:t ? +t.slice(2, 4) : null, corr:true };
    return compute(e).error ? null : e;
  }
  function inviteLink(e, withTime){ var c = encodeInvite(e, withTime); return isHosted() ? shareBase() + '?i=' + c : APP_URL + '#i.' + c; }
  function shortUrl(u){ u = u.replace(/^https?:\/\//, ''); return u.length > 42 ? u.slice(0, 30) + '…' + u.slice(-8) : u; }


  var shareState = null;
  function currentLink(){ var o = shareState; return o.inviteEntry ? inviteLink(o.inviteEntry, o.withTime) : o.link; }
  function fullMsg(){ return shareState.text + '\n\n' + shareState.cta + '\n' + currentLink(); }
  function openShare(o){ shareState = o; o.withTime = true; renderShareSheet(); }
  function renderShareSheet(){
    var o = shareState, link = currentLink();
    var h = '<h3 id="sheetTitle">' + o.sheetTitle + '</h3>' +
      '<div class="share-card">' + (o.fig ? '<span class="sc-fig">' + o.fig + '</span>' : '') +
      '<div class="sc-txt"><span class="sc-brand">운수 運數</span><b>' + esc(o.title) + '</b><p>' + esc(o.desc) + '</p><span class="sc-url">' + SH_IC.link + esc(shortUrl(link)) + '</span></div></div>';
    if (o.inviteEntry){
      h += '<button type="button" class="unk-btn" id="shTime" aria-pressed="' + !o.withTime + '"' + (o.inviteEntry.unknown ? ' hidden' : '') + '><span>태어난 시간은 빼고 보내기</span><span class="ck">' + (!o.withTime ? OK_SVG : '') + '</span></button>' +
        '<p class="privacy" style="margin-top:10px">' + SHIELD_SVG + '<span>이 링크에는 궁합 계산을 위해 ' + esc(o.inviteEntry.name) + '님의 이름·생년월일' + (o.withTime && !o.inviteEntry.unknown ? '·태어난 시간' : '') + '이 담겨요. 믿을 수 있는 사람에게만 보내 주세요.</span></p>';
    }
    h += '<div class="share-actions">' +
      '<button class="btn-primary" id="shNative">' + SH_IC.send + '카톡·메시지로 보내기</button>' +
      '<div class="row"><button class="btn-soft grow" id="shLink">' + SH_IC.link + '링크 복사</button><button class="btn-ghost grow" id="shMsg">메시지와 함께 복사</button></div></div>' +
      '<details class="sh-qr" id="shQrBox"><summary>QR 코드로 열기 <span class="helper">PC에서 휴대폰으로 넘길 때</span></summary><div id="shQr"></div></details>';
    if (!isHosted()) h += '<p class="mock-note" style="margin-top:12px">지금은 Claude 공유 링크로 연결돼요. 직접 배포한 주소에서 열면 그 주소로 공유돼요.</p>';
    openSheet(h);
    $('shNative').onclick = function(){
      var data = { title:o.title, text:o.text + '\n\n' + o.cta, url:currentLink() };
      if (navigator.share){
        navigator.share(data).then(function(){ closeSheet(); toast('공유했어요'); }).catch(function(err){
          if (err && err.name === 'AbortError') return;
          copyText(fullMsg(), '공유 창을 열 수 없어 메시지와 링크를 복사했어요. 카톡에 붙여넣어 주세요');
        });
      } else copyText(fullMsg(), '메시지와 링크를 복사했어요. 카톡에 붙여넣어 주세요');
    };
    $('shLink').onclick = function(){ copyText(currentLink(), '링크를 복사했어요'); };
    $('shMsg').onclick = function(){ copyText(fullMsg(), '메시지와 링크를 복사했어요'); };
    if ($('shTime')) $('shTime').onclick = function(){ o.withTime = !o.withTime; var open = $('shQrBox').open; renderShareSheet(); if (open){ $('shQrBox').open = true; drawQr(); } };
    $('shQrBox').addEventListener('toggle', function(){ if (this.open) drawQr(); });
  }
  function drawQr(){
    var box = $('shQr'); if (!box) return;
    box.innerHTML = '';
    if (!window.QRCode){ box.innerHTML = '<p class="helper">QR 코드를 불러오지 못했어요. 링크 복사를 이용해 주세요.</p>'; return; }
    try { new QRCode(box, { text:currentLink(), width:156, height:156, colorDark:'#05060f', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M }); }
    catch(e){ box.innerHTML = '<p class="helper">QR 코드를 만들 수 없어요. 링크 복사를 이용해 주세요.</p>'; }
  }
  function openInvite(){
    var me = getMe(); if (!me){ startOnboarding('new'); return; }
    var r = compute(me);
    openShare({ sheetTitle:'친구에게 궁합 신청하기', title:me.name + '님의 궁합 신청', desc:'생년월일만 입력하면 두 사람의 궁합이 바로 나와요',
      fig:r.error ? '' : figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
      text:'[운수] ' + me.name + '님이 궁합 신청을 보냈어요\n생년월일만 입력하면 우리 둘의 궁합 점수와 풀이가 바로 나와요. 가입은 필요 없어요.',
      cta:'궁합 보러 가기 →', inviteEntry:me });
  }

  /* ---- 초대 링크로 들어온 경우 ---- */
  var INVITE = null;
  function clearInvite(){ INVITE = null; store('unsu_invite', null); }
  function acceptInviteForMe(){
    var inv = INVITE, me = getMe(); if (!inv || !me) return false;
    if (inv.y === me.y && inv.m === me.m && inv.d === me.d && inv.name === me.name){ clearInvite(); toast('내가 보낸 초대 링크예요. 친구에게 보내 주세요'); return false; }
    var list = getList(), found = list.filter(function(x){ return sameEntry(x, inv); })[0];
    if (!found){
      found = Object.assign({}, inv, { id:'s' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), saved:Date.now(), invited:true });
      list.unshift(found); store('unsu_list', list);
    }
    gh.a = me.id; gh.b = found.id;
    clearInvite(); updateSegCount();
    var giftList = store('unsu_invgift'); if (!Array.isArray(giftList)) giftList = [];
    var key = inv.name + inv.y + inv.m + inv.d;
    if (giftList.indexOf(key) < 0){ giftList.push(key); store('unsu_invgift', giftList); addCoins(20, '초대 수락 선물'); }
    go('gunghap');
    setTimeout(function(){ toast(inv.name + '님과의 궁합을 열었어요 · 초대 선물 엽전 20닢'); }, 400);
    return true;
  }
  function inviteHeroHTML(){
    var inv = INVITE, ri = compute(inv);
    return '<div class="card invite-card">' +
      '<span class="inv-badge">' + SH_IC.heart + '궁합 신청이 도착했어요</span>' +
      '<div class="inv-pair"><div class="inv-p">' + figSVG(ri.animal, MS.EL_KEY[ri.pillars.day.sEl]) + '<b>' + esc(inv.name) + '</b><small>' + ri.pillars.year.name + '년생 ' + ri.animal + '띠</small></div>' +
      '<span class="gh-amp">合</span><div class="inv-p"><span class="inv-q">?</span><b>나</b><small>생년월일 입력</small></div></div>' +
      '<h1 class="hero-title">' + esc(inv.name) + '님의 궁합 신청</h1>' +
      '<p class="helper">내 생년월일만 알려 주면 두 사람의 궁합 점수와 풀이가 바로 나와요. 가입 없이 30초면 끝나요.</p>' +
      '<div class="wel-cta"><button class="btn-primary btn-block" id="btnInvStart">내 생년월일 입력하기</button><button class="text-btn" id="btnInvSkip">초대는 나중에 볼게요</button></div></div>';
  }

  refreshLotto();

  (function readInvite(){
    var code = null;
    try { code = new URLSearchParams(location.search).get('i'); } catch(e){}
    var hs = (location.hash || '').replace('#', '');
    if (!code && hs.indexOf('i.') === 0) code = hs.slice(2);
    if (code){
      var e = null; try { e = decodeInvite(code); } catch(err){}
      if (e){ INVITE = e; store('unsu_invite', e); }
      try { history.replaceState(null, '', location.pathname); } catch(err){}
    } else {
      var saved = store('unsu_invite'); if (saved && saved.y) INVITE = saved;
    }
    if (!INVITE) return;
    var intro = $('intro'); if (!intro.hidden){ intro.hidden = true; }
    store('unsu_intro', 1);
    if (NS) exitDemo(true);
    if (getMe()) acceptInviteForMe(); else go('today');
  })();

  /* deep link: #list / #saju / #zodiac / #gunghap / #num (초대 토큰 #i.… 은 위에서 처리) */
  var hash = INVITE ? '' : (location.hash || '').replace('#', '');
  if (hash === 'list'){ renderList(); show('list'); } else if (hash === 'saju') show('input'); else if (hash === 'zodiac') show('zodiac'); else if (hash === 'gunghap') go('gunghap'); else if (hash === 'num') go('num');
})();
