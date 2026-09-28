(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id){ return document.getElementById(id); }
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function todayStr(){ var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  /* 저장소: 예시 모드는 'demo:' 네임스페이스로 분리, 계정/모드 키는 전역 */
  var MEM = {}, NS = '', syncHook = null;
  var GLOBAL_KEYS = { unsu_mode:1, unsu_auth:1, unsu_account:1, unsu_intro:1, unsu_invite:1 };
  var DATA_KEYS = ['unsu_list','unsu_me','unsu_coin','unsu_coinlog','unsu_att','unsu_ad','unsu_unlock','unsu_extra','unsu_draft','unsu_zbirth','unsu_seeded','unsu_welcomed','unsu_nudge','unsu_invgift'];
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
  var OS = 5; /* 1/5 해상도로 그린 뒤 업스케일 → 부드러운 블러 */
  var PLUMES = [
    { c:[102,58,243],  x:.12, w:.46, h:.62, sp:.00021, ph:0.0 },
    { c:[61,214,190],  x:.50, w:.42, h:.54, sp:.00027, ph:1.7 },
    { c:[120,236,160], x:.88, w:.40, h:.48, sp:.00019, ph:3.1 },
    { c:[214,92,214],  x:.32, w:.34, h:.44, sp:.00033, ph:4.4 },
    { c:[88,140,255],  x:.70, w:.40, h:.66, sp:.00024, ph:5.6 }
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
  /* 모바일(좁은 화면)에서는 오로라를 더 높고 진하게 */
  function narrowBoost(){ return W < 600 ? 1.25 : 1; }
  function drawOff(t){
    var w = off.width, h = off.height, boost = narrowBoost();
    ox.globalCompositeOperation = 'source-over';
    ox.clearRect(0, 0, w, h);
    ox.globalCompositeOperation = 'lighter';
    PLUMES.forEach(function(p, pi){
      var cxp = (p.x + Math.sin(t*p.sp + p.ph)*.08) * w;
      var pw = p.w * w * (W < 600 ? 1.3 : 1);
      var hh = Math.min(.92, p.h * boost);
      var top = h * (1 - hh * (.8 + .2*Math.sin(t*p.sp*1.7 + p.ph)));
      var g = ox.createLinearGradient(0, h, 0, top);
      g.addColorStop(0, 'rgba(' + p.c + ',.5)');
      g.addColorStop(.4, 'rgba(' + p.c + ',.24)');
      g.addColorStop(1, 'rgba(' + p.c + ',0)');
      ox.fillStyle = g;
      ox.beginPath();
      ox.moveTo(cxp - pw/2, h);
      var steps = 18;
      for (var i = 0; i <= steps; i++){
        var u = i / steps, x = cxp - pw/2 + u*pw, env = Math.pow(Math.sin(u*Math.PI), .8);
        var y = h - (h - top) * env * (.78 + .22*Math.sin(t*.0011 + u*7 + pi*2));
        ox.lineTo(x, y);
      }
      ox.lineTo(cxp + pw/2, h);
      ox.closePath(); ox.fill();
      /* 커튼 결 (세로 빛줄기) */
      for (var k = 0; k < 10; k++){
        var rx = cxp - pw/2 + ((k + .5)/10)*pw + Math.sin(t*.0008 + k + pi)*4;
        var rh = (h - top) * (.45 + .55*Math.abs(Math.sin(t*.0013 + k*1.7 + pi)));
        var rg = ox.createLinearGradient(0, h, 0, h - rh);
        rg.addColorStop(0, 'rgba(' + p.c + ',.3)'); rg.addColorStop(1, 'rgba(' + p.c + ',0)');
        ox.fillStyle = rg;
        ox.fillRect(rx, h - rh, 1.3, rh);
      }
    });
  }
  function frame(t){
    cx.globalCompositeOperation = 'source-over';
    cx.fillStyle = '#05060f'; cx.fillRect(0, 0, W, H);
    /* aurora */
    drawOff(t);
    cx.globalCompositeOperation = 'lighter';
    cx.imageSmoothingEnabled = true;
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
  var currentTab = 'today', currentView = 'today', lastSajuView = 'input';
  function show(view, tab){
    Object.keys(VIEWS).forEach(function(k){ VIEWS[k].hidden = k !== view; });
    currentView = view; currentTab = tab !== undefined ? tab : TAB_OF[view];
    document.body.classList.toggle('focus', view === 'onboard');
    if (typeof updateTopbar === 'function') updateTopbar();
    if (view === 'input' || view === 'list' || view === 'result') lastSajuView = view;
    document.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === currentTab); b.setAttribute('aria-current', b.dataset.tab === currentTab ? 'page' : 'false'); });
    document.querySelectorAll('.seg button').forEach(function(b){ b.setAttribute('aria-selected', String(b.dataset.sub === view)); });
    window.scrollTo(0, 0);
  }
  function go(t){
    if (t === 'today'){ renderToday(); show('today'); }
    else if (t === 'saju'){
      var v = currentTab === 'saju' ? 'input' : lastSajuView;
      if (v === 'list') renderList();
      show(v);
    }
    else if (t === 'gunghap'){ renderGunghap(); show('gunghap'); }
    else if (t === 'num'){ renderNumToday(); show('fill'); }
  }
  document.querySelector('.tabbar').addEventListener('click', function(e){ var b = e.target.closest('.tab'); if (b) go(b.dataset.tab); });
  document.querySelectorAll('.seg button').forEach(function(b){ b.addEventListener('click', function(){ if (b.dataset.sub === 'list') renderList(); show(b.dataset.sub); }); });

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
    var hv = $('ddHourVal'), mv = $('ddMinVal');
    hv.textContent = tsel.h === null ? '시 선택' : pad2(tsel.h) + '시'; hv.classList.toggle('placeholder', tsel.h === null);
    mv.textContent = tsel.m === null ? '분 선택' : pad2(tsel.m) + '분'; mv.classList.toggle('placeholder', tsel.m === null);
    $('hourPanel').querySelectorAll('.dd-opt').forEach(function(b){ b.setAttribute('aria-selected', String(+b.dataset.v === tsel.h)); });
    $('minPanel').querySelectorAll('.dd-opt').forEach(function(b){ b.setAttribute('aria-selected', String(+b.dataset.v === tsel.m)); });
  }
  (function buildDD(){
    var hp = '', mp = '';
    for (var i = 0; i < 24; i++) hp += '<button type="button" class="dd-opt" role="option" data-v="' + i + '">' + pad2(i) + '시</button>';
    for (var j = 0; j < 60; j++) mp += '<button type="button" class="dd-opt" role="option" data-v="' + j + '">' + pad2(j) + '</button>';
    $('hourPanel').innerHTML = hp; $('minPanel').innerHTML = mp;
  })();
  function closeDD(){ ['hourPanel','minPanel'].forEach(function(id){ $(id).hidden = true; }); $('ddHour').setAttribute('aria-expanded','false'); $('ddMin').setAttribute('aria-expanded','false'); }
  function toggleDD(which){
    var panel = $(which === 'h' ? 'hourPanel' : 'minPanel'), btn = $(which === 'h' ? 'ddHour' : 'ddMin');
    var open = panel.hidden; closeDD();
    if (open){
      panel.hidden = false; btn.setAttribute('aria-expanded','true');
      var sel = panel.querySelector('[aria-selected="true"]') || panel.querySelector(which === 'h' ? '[data-v="9"]' : '[data-v="0"]');
      if (sel) panel.scrollTop = sel.offsetTop - panel.clientHeight/2 + sel.offsetHeight/2;
    }
  }
  $('ddHour').onclick = function(){ toggleDD('h'); };
  $('ddMin').onclick = function(){ toggleDD('m'); };
  $('hourPanel').addEventListener('click', function(e){ var b = e.target.closest('.dd-opt'); if (!b) return; tsel.h = +b.dataset.v; closeDD(); if (tsel.m === null) toggleDD('m'); renderDDVals(); updateTimeHint(); saveDraft(); });
  $('minPanel').addEventListener('click', function(e){ var b = e.target.closest('.dd-opt'); if (!b) return; tsel.m = +b.dataset.v; closeDD(); renderDDVals(); updateTimeHint(); saveDraft(); });
  document.addEventListener('click', function(e){ if (!e.target.closest('.dd-group') && !e.target.closest('.dd-panel')) closeDD(); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeDD(); });
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
      wrap.innerHTML = '<div class="card empty-state">' + figSVG('토끼','wood') + '<div style="font-size:15px;color:#fff">아직 저장된 사주가 없어요</div><p class="helper">가족, 친구의 사주를 저장해 두면 언제든 다시 꺼내 볼 수 있어요.</p><button class="btn-primary" id="btnGoInput">사주 입력하기</button></div>';
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

  function openResult(entry, r){
    if (currentView !== 'result') prevView = currentView;
    cur = { entry:entry, r:r };
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
    show('result', prevView === 'today' ? 'today' : prevView === 'gunghap' ? 'gunghap' : 'saju');
    drawOn($('posterFig'));
    var du = $('duScroll').querySelector('.now');
    if (du) $('duScroll').scrollLeft = du.offsetLeft - 60;
    if (!reduceMotion && window.gsap) gsap.from('#resultBody .el-bar .fill', { scaleX:0, duration:.9, ease:'power2.out', stagger:.06, delay:.2 });

    $('btnDraw').onclick = function(){
      $('numWrap').hidden = false; this.hidden = true;
      revealBalls($('ballsLife')); setTimeout(function(){ revealBalls($('ballsYong')); }, 450);
    };
    $('btnCopyRes').onclick = function(){ copyText(summaryText(), '결과를 복사했어요'); };
    $('btnShareRes').onclick = function(){
      var ig0 = ILGAN[P.day.stem];
      openShare({ sheetTitle:'사주 풀이 공유', title:entry.name + '님의 사주 · ' + P.day.name + '(' + P.day.hanja + ')일주', desc:ig0.t + ' — ' + ig0.img,
        fig:figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
        text:'[운수] ' + entry.name + '님의 사주\n' + P.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · ' + P.day.name + '(' + P.day.hanja + ')일주\n일간 ' + ig0.t + ' — ' + ig0.img,
        cta:'생년월일만 넣으면 내 여덟 글자도 풀어 줘요 →', link:linkFor('') });
    };
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

  var COIN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var GH_COST = 30, AD_REWARD = 20, AD_LIMIT = 3;

  function getCoins(){ var c = store('unsu_coin'); return typeof c === 'number' ? c : 0; }
  function renderCoin(bump){
    $('coinVal').textContent = getCoins();
    if (bump && !reduceMotion){ var c = $('coinChip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  function addCoins(n, why){
    store('unsu_coin', Math.max(0, getCoins() + n));
    var log = store('unsu_coinlog'); if (!Array.isArray(log)) log = [];
    log.unshift({ t:Date.now(), n:n, why:why }); if (log.length > 30) log.length = 30;
    store('unsu_coinlog', log);
    renderCoin(true);
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

  $('coinChip').onclick = function(){
    var log = store('unsu_coinlog'); if (!Array.isArray(log)) log = [];
    var h = '<h3 id="sheetTitle">내 엽전 ' + getCoins() + '닢</h3>' +
      '<div class="tip-list">' +
      '<div class="earn-row"><div><div class="t">매일 출석</div><div class="s">오늘의 운세를 열면 자동으로 출석돼요</div></div><b style="color:#f3dca0">+10</b></div>' +
      '<div class="earn-row"><div><div class="t">7일 연속 출석 보너스</div><div class="s">7일마다 한 번씩</div></div><b style="color:#f3dca0">+30</b></div>' +
      '<div class="earn-row"><div><div class="t">광고 보고 받기</div><div class="s">하루 ' + AD_LIMIT + '번 · 오늘 ' + adCount() + '번 사용</div></div><b style="color:#f3dca0">+' + AD_REWARD + '</b></div>' +
      '<div class="earn-row"><div><div class="t">상세 궁합 리포트 열기</div><div class="s">한 번 열면 계속 볼 수 있어요</div></div><b style="color:#ffb4a8">−' + GH_COST + '</b></div>' +
      '</div><div class="eyebrow"><span class="line"></span>최근 내역<span class="line right"></span></div><div class="ledger">' +
      (log.length ? log.slice(0, 8).map(function(x){ var d = new Date(x.t); return '<div><span>' + (d.getMonth()+1) + '.' + d.getDate() + ' ' + esc(x.why) + '</span><b class="' + (x.n < 0 ? 'minus' : '') + '">' + (x.n > 0 ? '+' : '') + x.n + '</b></div>'; }).join('') : '<div><span>아직 내역이 없어요</span></div>') +
      '</div><button class="btn-primary btn-block" data-close>확인</button>';
    openSheet(h);
  };

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
  function bindCalendar(me, r){
    $('calPrev').onclick = function(){ calOffset--; justStamped = false; $('calWrap').innerHTML = calendarHTML(); bindCalendar(me, r); };
    $('calNext').onclick = function(){ calOffset++; justStamped = false; $('calWrap').innerHTML = calendarHTML(); bindCalendar(me, r); };
    $('calWrap').querySelectorAll('[data-day]').forEach(function(b){
      b.onclick = function(){
        if (b.classList.contains('lock')){ toast('출석하지 않은 날의 운세는 다시 볼 수 없어요'); return; }
        var p = b.dataset.day.split('-');
        var f = DAILY.today(me, r, new Date(+p[0], +p[1]-1, +p[2]));
        openSheet('<div class="today-ilj" style="text-align:left">' + f.pillars.day.hanja + '日 · ' + f.ten + '의 날</div><h3 id="sheetTitle" style="margin-top:6px">' + (+p[1]) + '월 ' + (+p[2]) + '일, ' + f.head + '</h3>' + scoreRowsHTML(f) + '<p class="body-text" style="margin:16px 0 22px">' + esc(me.name) + '님, ' + f.body + '</p><button class="btn-primary btn-block" data-close>확인</button>');
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
     오늘 탭
     ========================================================= */
  var TIP_IC = {
    color:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1-1.6-1-2.6 0-.9.7-1.5 1.7-1.5H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="14.5" cy="7" r="1"/></svg>',
    item:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="9" width="17" height="11.5" rx="1.5"/><path d="M3.5 13h17M12 9v11.5M12 9C10.5 5 6.5 5 7 7.5 7.4 9 12 9 12 9zm0 0c1.5-4 5.5-4 5-1.5C16.6 9 12 9 12 9z"/></svg>',
    food:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v5M9 3v5M17 21V3c-2.2 1.2-3.5 4-3.5 7.5 0 1.4.9 2.5 2.2 2.5H17"/></svg>',
    num:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M9 4L7 20M17 4l-2 16M4.5 9h15M3.5 15h15"/></svg>',
    star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>'
  };

  function renderToday(){
    var body = $('todayBody'), me = getMe();
    if (!me){ renderWelcome(); return; }
    var r = compute(me);
    if (r.error){ body.innerHTML = '<div class="card"><p class="body-text">대표 사주를 계산할 수 없어요. 사주 목록에서 다른 사주를 대표로 설정해 주세요.</p></div>'; return; }
    var now = new Date();
    var att = attend(); justStamped = att.newly;
    if (att.newly){ var wmsg = pendingWelcome ? '환영해요! 환영 선물 30닢 + 첫 출석 10닢을 받았어요' : att.bonus ? att.streak + '일 연속 출석! 엽전 +40' : '출석 완료 · 엽전 +10'; setTimeout(function(){ toast(wmsg); }, 600); }
    pendingWelcome = false;
    var f = todayLuck(me, r).f, P = f.pillars;
    var iso = entryISO(me, r), tKey = entryTKey(r);
    var luck = todayLuck(me, r), nums = luck.nums;
    var elc = EL_CLASS[f.luckyEl];
    var h = '';
    if (NS) h += demoBarHTML();
    h += '<div class="today-head"><div class="today-date">' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 ' + WD[now.getDay()] + '요일, 오늘은</div>' +
      '<h1 class="today-title">' + f.head + '</h1>' +
      '<div class="today-ilj">' + P.year.hanja + '年 ' + P.month.hanja + '月 ' + P.day.hanja + '日 · ' + f.ten + '의 날</div></div>';
    h += '<div class="today-fig" id="todayFig">' + figSVG(r.animal, f.auraEl) + '</div>';
    h += '<div class="card score-card">' + scoreRowsHTML(f) + '<div class="divider"></div>' +
      '<p class="body-text">' + esc(me.name) + '님, ' + f.body + '</p>' +
      '<div class="row"><button class="btn-ghost grow" id="btnTodaySaju">내 사주 풀이 보기</button><button class="btn-soft grow" id="btnTodayShare">오늘 운세 공유</button></div></div>';
    h += '<div class="card ' + elc + '"><div class="lucky-title">오늘 ' + esc(me.name) + '님에게는<br><em>' + f.bless + '의 기운</em>이 행운을 가져와요.</div>' +
      '<p class="body-text">' + esc(me.name) + '님에게 필요한 ' + MS.EL_K[f.luckyEl] + '(' + MS.EL_H[f.luckyEl] + ') 기운을 가까이 두면 좋은 운은 높이고 흔들리는 운은 잡아 줘요. ' + EL_TEXT[f.luckyEl].act + '처럼 가벼운 행동으로 채워 보세요.</p>' +
      '<button class="row-link" id="btnTips"><span class="ic" style="color:var(--elc)">' + TIP_IC.star + '</span>행운의 팁<span class="chev">›</span></button></div>';
    h += '<div class="ad-slot" aria-label="광고 영역 예시"><span class="ad-badge">AD</span><span class="ph"></span><div><b>네이티브 광고 영역</b><small>콘텐츠 카드와 같은 모양 · 오늘의 결론을 본 뒤 1개만 노출</small></div></div>';
    h += '<div class="card ' + elc + '"><div class="sec-head"><h2 class="sec-title">오늘의 행운 번호</h2><span class="sec-meta">행운 숫자 ' + f.tip.nums.join('·') + '</span></div>' +
      '<div class="balls">' + nums.map(function(o){ return '<div class="ball' + (o.y ? ' yong ' + elc : '') + '">' + o.n + '</div>'; }).join('') + '</div>' +
      '<p class="helper">빛나는 번호는 오늘의 행운 숫자 <b style="color:var(--elc)">' + f.tip.nums.join('·') + '</b>로 끝나요. 행운의 팁과 같은 ' + MS.EL_K[f.luckyEl] + '(' + MS.EL_H[f.luckyEl] + ') 기운에서 나온 숫자예요.</p></div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">운세 캘린더</h2><span class="sec-meta">ATTENDANCE</span></div><p class="helper" style="margin-top:-8px">출석한 날의 운세는 언제든 다시 볼 수 있어요.</p><div id="calWrap" class="view" style="gap:14px">' + calendarHTML() + '</div></div>';
    var stNow = streakOf(getAtt());
    if (!NS && !store('unsu_auth') && store('unsu_nudge') !== todayStr() && (stNow >= 3 || getCoins() >= 60 || getUnlocks().length))
      h += '<div class="nudge"><div><b>기록이 쌓이고 있어요</b><p>연속 ' + stNow + '일 출석 · 엽전 ' + getCoins() + '닢. 로그인하면 기기를 바꿔도 그대로 이어져요.</p></div><div class="acts"><button class="btn-primary" id="btnNudgeLogin">로그인</button><button class="btn-ghost" id="btnNudgeClose">닫기</button></div></div>';
    var used = adCount();
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">엽전 모으기</h2><span class="sec-meta">보유 ' + getCoins() + '닢</span></div>' +
      '<div class="earn-row"><div><div class="t">오늘 출석</div><div class="s">매일 +10 · 7일 연속이면 +30 보너스</div></div><span class="chip" style="color:#8fdcaa">완료</span></div>' +
      '<div class="earn-row"><div><div class="t">광고 보고 엽전 받기</div><div class="s">+' + AD_REWARD + ' · 오늘 ' + used + '/' + AD_LIMIT + '</div></div><button class="btn-soft" id="btnAdCoin" style="padding:10px 16px;font-size:13px"' + (used >= AD_LIMIT ? ' disabled' : '') + '>' + (used >= AD_LIMIT ? '내일 다시' : '광고 보기') + '</button></div>' +
      '<button class="row-link" id="btnGoGh"><span class="ic" style="color:#f3dca0">' + COIN_SVG + '</span>엽전 ' + GH_COST + '닢으로 상세 궁합 열기<span class="chev">›</span></button></div>';
    var z = getZodiac(r.solar.m, r.solar.d);
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    h += '<div class="card"><div class="mini-z">' + figSVG(z.name, z.el, 'mini') + '<div class="view" style="gap:4px"><div class="sec-meta" style="text-align:left">TODAY · ' + z.en.toUpperCase() + '</div><div style="font-size:16px;color:#fff;font-weight:500">' + z.glyph + ' ' + z.name + '</div><p class="helper">' + DAILY_LINES[doy % DAILY_LINES.length] + '</p></div></div>' +
      '<button class="row-link" id="btnTodayZ"><span class="ic">' + TIP_IC.star + '</span>별자리 운세 보기<span class="chev">›</span></button></div>';
    h += '<p class="disclaimer">오늘의 운세는 일진과 사주의 관계로 계산한 재미용 콘텐츠예요.</p>';
    body.innerHTML = h;
    renderCoin();
    drawOn($('todayFig'));
    bindCalendar(me, r);
    bindDemoBar();
    if ($('btnNudgeLogin')){
      $('btnNudgeLogin').onclick = function(){ openLoginSheet('연속 ' + streakOf(getAtt()) + '일 출석 기록과 엽전 ' + getCoins() + '닢이 지금은 이 기기에만 있어요.'); };
      $('btnNudgeClose').onclick = function(){ store('unsu_nudge', todayStr()); renderToday(); };
    }
    $('btnTodaySaju').onclick = function(){ openResult(me, r); };
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
        '<div class="tip"><span class="ic">' + TIP_IC.num + '</span><div><small>행운의 숫자</small><b>' + f.tip.nums.join(', ') + '</b><small style="margin-top:3px">오늘의 행운 번호 ' + nums.map(function(o){ return o.y ? '<b style="font-size:13px;color:var(--elc)">' + o.n + '</b>' : o.n; }).join(' · ') + '</small></div></div>' +
        '</div><button class="btn-primary btn-block" data-close>확인</button>');
    };
    $('btnAdCoin').onclick = function(){
      if (adCount() >= AD_LIMIT) return;
      playAd(function(){ useAd(); addCoins(AD_REWARD, '광고 보상'); toast('엽전 +' + AD_REWARD + '닢을 받았어요'); renderToday(); });
    };
    $('btnGoGh').onclick = function(){ go('gunghap'); };
    $('btnTodayZ').onclick = function(){ myZ = z.name; renderZGrid(); openZodiac(z, iso); show('zodiac'); };
  }

  /* =========================================================
     지난주 로또 1등 번호 (동행복권 발표 결과를 정적 데이터로 보관 — 매주 갱신 필요)
     ========================================================= */
  var LOTTO_LATEST = { no:1243, date:'2026-09-26', nums:[9,18,24,38,43,44], bonus:35,
    first:{ count:12, prize:2592525282 }, second:{ count:115, prize:45087397 } };
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
      '<p class="helper" style="margin-top:-8px">' + (+p[1]) + '월 ' + (+p[2]) + '일(토) 추첨 · 동행복권 발표 기준</p>' +
      '<div class="balls lt-row">' + L.nums.map(function(n){ return '<div class="ball lt ' + ltColor(n) + '">' + n + '</div>'; }).join('') + '<span class="lt-plus">+</span><div class="ball lt ' + ltColor(L.bonus) + '">' + L.bonus + '</div></div>' +
      '<div class="lt-prize"><div><span>1등</span><b>' + krw(L.first.prize) + '</b><small>' + L.first.count + '게임 당첨</small></div><div><span>2등</span><b>' + krw(L.second.prize) + '</b><small>' + L.second.count + '게임 당첨</small></div></div>';
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
     번호 탭 상단: 내 번호
     ========================================================= */
  var extraLines = [];
  function renderNumToday(){
    var me = getMe(), box = $('numToday');
    if (!me){
      box.innerHTML = '<div class="hero-copy" style="padding-inline:2px"><div class="eyebrow">LOTTO 6/45</div><h1 class="hero-title">내 사주로 뽑는<br>행운 번호</h1></div>' +
        '<div class="card gate"><div class="balls">' + [3,8,17,26,33,41].map(function(n){ return '<div class="ball" style="opacity:.35">?</div>'; }).join('') + '</div><p class="helper">내 사주를 등록하면 평생 번호와 매일 바뀌는 오늘의 행운 번호가 생겨요.</p><button class="btn-primary btn-block" id="btnNumOnb">내 사주 등록하고 번호 받기</button></div>' + lottoCardHTML(null) +
        '<div class="sec-head" style="padding-inline:2px;margin-top:6px"><h2 class="sec-title">직접 골라 채우기</h2><span class="sec-meta">MY PICK</span></div>';
      $('btnNumOnb').onclick = function(){ startOnboarding('new'); };
      return;
    }
    var r = compute(me); if (r.error){ box.innerHTML = ''; return; }
    var iso = entryISO(me, r), tKey = entryTKey(r);
    var life = drawSixFromSeed(iso + '|' + tKey + '|life');
    var luck = todayLuck(me, r), yong = luck.nums, lEl = luck.el;
    var extra = store('unsu_extra'); if (!extra || extra.d !== todayStr()) extra = { d:todayStr(), lines:[] };
    var h = '<div class="hero-copy" style="padding-inline:2px"><div class="eyebrow">LOTTO 6/45</div><h1 class="hero-title">' + esc(me.name) + '님의<br>행운 번호</h1></div>';
    h += '<div class="card"><div class="num-set"><div class="lab">평생 행운 번호 <small>사주 원국 · 고정</small></div><div class="balls">' + life.map(function(n){ return '<div class="ball">' + n + '</div>'; }).join('') + '</div></div>' +
      '<div class="num-set"><div class="lab">오늘의 행운 번호 <small>행운 숫자 ' + EL_TEXT[lEl].num.join('·') + '</small></div><div class="balls">' + yong.map(function(o){ return '<div class="ball' + (o.y ? ' yong ' + EL_CLASS[lEl] : '') + '">' + o.n + '</div>'; }).join('') + '</div></div>' +
      extra.lines.map(function(l, i){ return '<div class="num-set"><div class="lab">보너스 한 줄 ' + (i+1) + ' <small>광고 보상</small></div><div class="balls">' + l.map(function(n){ return '<div class="ball">' + n + '</div>'; }).join('') + '</div></div>'; }).join('') +
      '<div class="row"><button class="btn-soft grow" id="btnExtra"' + (extra.lines.length >= 3 ? ' disabled' : '') + '>' + (extra.lines.length >= 3 ? '오늘은 모두 받았어요' : '광고 보고 한 줄 더 뽑기') + '</button><button class="btn-ghost" id="btnNumCopy">공유</button></div>' +
      '<p class="disclaimer">재미로 즐기는 콘텐츠이며 실제 당첨을 보장하지 않습니다.</p></div>';
    h += lottoCardHTML(life);
    h += '<div class="sec-head" style="padding-inline:2px;margin-top:6px"><h2 class="sec-title">직접 골라 채우기</h2><span class="sec-meta">MY PICK</span></div>';
    box.innerHTML = h;
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
  var gh = { a:null, b:null };
  function getUnlocks(){ var u = store('unsu_unlock'); return Array.isArray(u) ? u : []; }
  function ghKey(ea, eb){ return [ea.id, eb.id].sort().join('|'); }
  function slotHTML(e, which){
    if (!e) return '<button class="gh-slot" data-slot="' + which + '"><span class="nm">선택하기</span><span class="sb">저장된 사주에서 고르기</span></button>';
    var r = compute(e);
    return '<button class="gh-slot" data-slot="' + which + '">' + figSVG(r.animal, ANIMAL_EL[r.animal], 'mini') + '<span class="nm">' + esc(e.name) + '</span><span class="sb">' + r.pillars.day.name + '일주 · ' + r.animal + '띠</span><span class="chg">바꾸기</span></button>';
  }
  function renderGunghap(){
    var list = getList(), box = $('ghBody');
    if (list.length < 2){
      if (!getMe()){
        box.innerHTML = '<div class="card gate">' + figSVG('쌍둥이자리', 'air') + '<h2 class="sec-title">내 사주부터 등록해 주세요</h2><p class="helper">궁합은 내 사주와 상대의 사주를 나란히 놓고 봐요. 등록은 30초면 끝나요.</p><button class="btn-primary btn-block" id="btnGhOnb">내 사주 등록하기</button><button class="text-btn" id="btnGhDemo">예시 두 사람으로 먼저 보기</button></div>';
        $('btnGhOnb').onclick = function(){ startOnboarding('new'); };
        $('btnGhDemo').onclick = function(){ enterDemo('gunghap'); };
      } else {
        box.innerHTML = '<div class="card gate">' + figSVG('쌍둥이자리', 'air') + '<h2 class="sec-title">궁합을 볼 상대를 추가해 주세요</h2><p class="helper">연인, 친구, 가족, 동료 누구든 괜찮아요. 상대의 생년월일을 입력하고 저장하면 바로 궁합이 열려요.</p><button class="btn-primary btn-block" id="btnGhInput">상대 사주 입력하기</button><button class="btn-soft btn-block" id="btnGhInv">' + SH_IC.link + '친구에게 궁합 신청 링크 보내기</button></div>';
        $('btnGhInput').onclick = function(){ prepOtherForm(); };
        $('btnGhInv').onclick = openInvite;
      }
      return;
    }
    var byId = function(id){ return list.filter(function(x){ return x.id === id; })[0] || null; };
    var A = byId(gh.a) || getMe() || list[0];
    var B = byId(gh.b); if (!B || B.id === A.id) B = list.filter(function(x){ return x.id !== A.id; })[0];
    gh.a = A.id; gh.b = B.id;
    var ra = compute(A), rb = compute(B);
    var h = '<div class="card"><div class="gh-pair">' + slotHTML(A, 'a') + '<div class="gh-amp">合</div>' + slotHTML(B, 'b') + '</div></div>';
    if (ra.error || rb.error){ box.innerHTML = h; bindGh(); return; }
    var m = DAILY.match(A, ra, B, rb);
    var nm = function(t){ return t.replace(/A/g, esc(A.name)).replace(/B/g, esc(B.name)); };
    h += '<div class="poster"><div class="poster-frame">' +
      '<div class="poster-corner l">宮合<br>MATCH</div><div class="poster-corner r">' + ra.pillars.day.hanja + ' × ' + rb.pillars.day.hanja + '</div>' +
      '<div class="gh-figs">' + figSVG(ra.animal, MS.EL_KEY[ra.pillars.day.sEl]) + '<span class="link"></span>' + figSVG(rb.animal, MS.EL_KEY[rb.pillars.day.sEl]) + '</div>' +
      '<div class="gh-score"><div class="num">' + m.score + '<small>점</small></div><div class="gr">' + m.grade + '</div><p class="poster-sub" style="max-width:20em">' + esc(A.name) + '님과 ' + esc(B.name) + '님은 ' + m.summary + '</p></div>' +
      '</div></div>';
    var comp = m.comp.length ? m.comp.map(function(c){ var giver = c.who === 'A' ? A : B, taker = c.to === 'A' ? A : B; return esc(giver.name) + '님이 ' + esc(taker.name) + '님에게 부족한 ' + MS.EL_K[c.el] + '(' + MS.EL_H[c.el] + ') 기운을 채워 줘요.'; }).join(' ') : '두 사람의 오행 구성이 비슷해 서로의 빈 곳을 채우기보다 같은 방향으로 함께 가는 관계예요.';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">궁합 요약</h2><span class="sec-meta">FREE</span></div><div class="gh-badges">' +
      '<div class="gh-badge"><span class="chip">일간</span><p><strong style="color:#fff;font-weight:500">' + nm(m.stemTxt.t) + (m.stemHap ? ' (' + m.stemHap + ')' : '') + '</strong><br>' + ra.pillars.day.sk + MS.EL_K[ra.pillars.day.sEl] + ' × ' + rb.pillars.day.sk + MS.EL_K[rb.pillars.day.sEl] + '</p></div>' +
      '<div class="gh-badge"><span class="chip">일지</span><p>' + m.dTxt + '</p></div>' +
      '<div class="gh-badge"><span class="chip">오행</span><p>' + comp + '</p></div></div>' +
      '<button class="btn-soft btn-block" id="btnGhShare">' + SH_IC.send + '궁합 결과 공유하기</button></div>';
    if (getMe()) h += '<div class="card"><button class="row-link" id="btnGhInvite" style="border-top:none;padding-top:0"><span class="ic" style="color:var(--icon-accent)">' + SH_IC.heart + '</span><span>다른 친구에게 궁합 신청하기<br><span class="helper">링크를 받은 친구가 생년월일만 넣으면 나와의 궁합이 열려요</span></span><span class="chev">›</span></button></div>';
    var key = ghKey(A, B), open = getUnlocks().indexOf(key) > -1;
    if (!open){
      var coins = getCoins();
      h += '<div class="card locked"><div class="sec-head"><h2 class="sec-title">상세 궁합 리포트</h2><span class="sec-meta">LOCKED</span></div>' +
        '<ul class="lock-list">' + ['두 사람의 기질 비교','관계에서 빛나는 점','부딪히기 쉬운 점과 대화 팁','올해 두 사람의 흐름','함께하면 좋은 활동'].map(function(t){ return '<li>' + LOCK_SVG + t + '</li>'; }).join('') + '</ul>' +
        '<div class="locked-preview" aria-hidden="true"><div style="width:92%"></div><div style="width:78%"></div><div style="width:85%"></div></div>' +
        '<div class="lock-cta"><button class="btn-primary" id="btnGhCoin"' + (coins < GH_COST ? ' disabled' : '') + '>' + COIN_SVG + '엽전 ' + GH_COST + '닢으로 열기 <span style="opacity:.75;font-size:12.5px">(보유 ' + coins + ')</span></button>' +
        '<button class="btn-soft" id="btnGhAd">광고 보고 바로 열기</button>' +
        '<p class="helper" style="text-align:center">' + (coins < GH_COST ? '엽전이 ' + (GH_COST - coins) + '닢 부족해요. 매일 출석하면 10닢씩 모여요.' : '한 번 열면 이 두 사람의 리포트는 계속 볼 수 있어요.') + '</p></div></div>';
    } else {
      var ia = ILGAN[ra.pillars.day.stem], ib = ILGAN[rb.pillars.day.stem];
      var extraClash = m.dRel === 'chung' ? ' 일지가 충을 이뤄 생활 리듬이 엇갈리기 쉬우니 함께하는 시간과 혼자 쉬는 시간을 분명히 나눠 두세요.' : m.dRel === 'wonjin' ? ' 일지가 원진이라 작은 말에 서운해지기 쉬워요. 서운함은 그날 바로 가볍게 말하는 게 좋아요.' : '';
      h += '<div class="card"><div class="sec-head"><h2 class="sec-title">상세 궁합 리포트</h2><span class="sec-meta">UNLOCKED</span></div>' +
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
      $('btnGhCoin').onclick = function(){ if (getCoins() < GH_COST) return; addCoins(-GH_COST, '상세 궁합 (' + A.name + '·' + B.name + ')'); unlock(); };
      $('btnGhAd').onclick = function(){ playAd(unlock); };
    }
  }
  function bindGh(){
    $('ghBody').querySelectorAll('[data-slot]').forEach(function(btn){
      btn.onclick = function(){
        var which = btn.dataset.slot, other = which === 'a' ? gh.b : gh.a, curId = gh[which];
        var list = getList().filter(function(x){ return x.id !== other; });
        openSheet('<h3 id="sheetTitle">' + (which === 'a' ? '첫 번째' : '두 번째') + ' 사람 고르기</h3><div class="pick-list">' + list.map(function(e){
          var r = compute(e); if (r.error) return '';
          return '<button class="pick" data-pick="' + e.id + '" aria-pressed="' + (e.id === curId) + '">' + figSVG(r.animal, ANIMAL_EL[r.animal], 'mini') + '<span><span class="nm">' + esc(e.name) + '</span><br><span class="sb">' + fmtEntryDate(e) + '</span></span><span class="sb">' + r.pillars.day.name + '</span></button>';
        }).join('') + '</div><button class="btn-ghost btn-block" id="btnPickNew">새 사주 입력하기</button>');
        $('sheetBody').querySelectorAll('[data-pick]').forEach(function(p){ p.onclick = function(){ gh[which] = p.dataset.pick; closeSheet(); renderGunghap(); }; });
        $('btnPickNew').onclick = function(){ closeSheet(); show('input'); };
      };
    });
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
  function welcomeCoins(){ if (!store('unsu_welcomed')){ store('unsu_welcomed', 1); addCoins(30, '가입 환영 선물'); pendingWelcome = true; } }
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
      '<h1 class="hero-title">내 사주로 여는<br>오늘의 운세</h1>' +
      '<div class="wel-fig" id="welFig">' + figSVG(an, MS.EL_KEY[P.day.sEl]) + '</div>' +
      '<p class="helper" style="max-width:24em">생년월일만 알려 주면 만세력으로 여덟 글자를 풀고, 매일 오늘의 운세와 행운 번호를 챙겨 드려요.</p>' +
      '<div class="wel-cta"><button class="btn-primary btn-block" id="btnWelStart">내 사주 입력하고 시작하기</button><button class="text-btn" id="btnWelDemo">예시로 먼저 둘러보기</button></div></div>';
    if (acc && acc.snapshot && acc.snapshot.unsu_me){
      var rl = acc.snapshot.unsu_att && acc.snapshot.unsu_att.days ? Object.keys(acc.snapshot.unsu_att.days).length : 0;
      h += '<div class="card return-card"><div><div style="font-size:15px;color:#fff;font-weight:600">다시 오셨네요, ' + esc(acc.nick) + '님</div><p class="helper">' + PROV[acc.provider] + ' 계정에 출석 ' + rl + '일 · 엽전 ' + (acc.snapshot.unsu_coin || 0) + '닢이 보관돼 있어요.</p></div><button class="btn-soft" id="btnWelReturn" style="padding:10px 14px;font-size:13px">로그인</button></div>';
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
    h += '<p class="disclaimer">운세는 전통 명리 이론을 바탕으로 한 재미용 콘텐츠예요.</p>';
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
      var hg = ''; for (var i = 0; i < 24; i++) hg += '<button type="button" class="hc" data-oh="' + i + '" aria-pressed="' + (ob.h === i) + '">' + pad2(i) + '시</button>';
      var mg = ''; for (var j = 0; j < 60; j++) mg += '<button type="button" class="hc" data-om="' + j + '" aria-pressed="' + (ob.m === j) + '">' + pad2(j) + '</button>';
      inner = '<button type="button" class="unk-btn" id="obUnk" aria-pressed="' + ob.unknown + '"><span>태어난 시간을 몰라요</span><span class="ck">' + (ob.unknown ? OK_SVG : '') + '</span></button>' +
        '<div class="' + (ob.unknown ? 'dim' : '') + '"><div class="lbl" style="font-size:12px;color:var(--text-muted);margin:4px 0 8px">시</div><div class="hour-grid">' + hg + '</div>' +
        (ob.h !== null ? '<div class="lbl" style="font-size:12px;color:var(--text-muted);margin:14px 0 8px">분</div><div class="min-grid" id="obMinGrid">' + mg + '</div>' : '') + '</div>' +
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
      '<div class="ob-cta"><button class="btn-primary btn-block" id="obNext"' + (obValid() ? '' : ' disabled') + '>' + next + '</button></div>';
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
      $('obBody').querySelectorAll('[data-oh]').forEach(function(b){ b.onclick = function(){ ob.h = +b.dataset.oh; renderOb(); var g = $('obMinGrid'); if (g){ g.scrollIntoView({ block:'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); } }; });
      $('obBody').querySelectorAll('[data-om]').forEach(function(b){ b.onclick = function(){ ob.m = +b.dataset.om; renderOb(); }; });
      var sel = $('obBody').querySelector('[data-om][aria-pressed="true"]'); if (sel) $('obMinGrid').scrollTop = sel.offsetTop - 60;
    } else if (st === 3){
      $('obBody').querySelectorAll('[data-og]').forEach(function(b){ b.onclick = function(){ ob.gender = b.dataset.og; renderOb(); setTimeout(obGoNext, 280); }; });
    } else {
      $('obBody').querySelectorAll('[data-ej]').forEach(function(b){ b.onclick = function(){ ob.step = +b.dataset.ej; ob.back4 = true; renderOb(); }; });
    }
  }
  function closeOb(){ var mode = ob && ob.mode; ob = null; if (mode === 'edit') openMy(); else go('today'); }
  function finishOb(){
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
    showGen(r, function(){ if (!(INVITE && acceptInviteForMe())) go('today'); });
  }
  function showGen(r, cb){
    var P = r.pillars, g = ['hour','day','month','year'].map(function(k){ return P[k] ? P[k].hanja : '　　'; }).join(' ');
    var el = document.createElement('div'); el.className = 'gen'; el.setAttribute('role', 'status');
    el.innerHTML = figSVG(r.animal, MS.EL_KEY[P.day.sEl]) + '<div class="hj">' + g + '</div><b>여덟 글자를 펼치는 중이에요</b><p>절기와 음력, 태어난 시간을 맞춰 보고 있어요</p>';
    document.body.appendChild(el);
    var s = el.querySelector('svg'); s.classList.add('fig'); if (!reduceMotion) s.classList.add('draw');
    setTimeout(function(){ el.remove(); cb(); }, reduceMotion ? 400 : 2000);
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
      '<div><div class="nm">' + esc(me.name) + '<span class="chip" style="font-size:11px;padding:2px 8px">' + (me.gender === 'M' ? '남' : '여') + '</span>' + (NS ? '<span class="chip" style="font-size:11px;padding:2px 8px">예시</span>' : '') + '</div>' +
      '<div class="sb">' + (r.error ? '' : r.pillars.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · ' + r.pillars.day.name + '(' + r.pillars.day.hanja + ')일주') + '<br>' + fmtEntryDate(me) + '</div></div></div>' +
      '<div class="row"><button class="btn-ghost grow" id="btnMyEdit">정보 수정</button><button class="btn-soft grow" id="btnMySaju">내 사주 풀이</button></div></div>';
    h += '<div class="stat4">' +
      '<button id="stCoin"><b>' + getCoins() + '</b><span>엽전</span></button>' +
      '<button id="stAtt"><b>' + streakOf(att) + '일</b><span>연속 출석</span></button>' +
      '<button id="stList"><b>' + getList().length + '명</b><span>저장한 사주</span></button>' +
      '<button id="stGh"><b>' + getUnlocks().length + '개</b><span>궁합 리포트</span></button></div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">계정</h2><span class="sec-meta">ACCOUNT</span></div>';
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
    h += '<div class="card"><div class="set-list">' +
      (NS ? '' : '<button class="set-row" id="setInvite"><span>친구에게 궁합 신청하기</span><span class="s">초대 링크 보내기 ›</span></button>') +
      '<button class="set-row" id="setMe"><span>대표 사주 바꾸기</span><span class="s">저장 목록에서 별 누르기 ›</span></button>' +
      (NS ? '<button class="set-row" id="setDemo"><span>예시 모드 끝내기</span><span class="s">첫 화면으로 ›</span></button>' : '') +
      '<button class="set-row danger" id="setReset"><span>이 기기의 데이터 초기화</span><span class="s">›</span></button>' +
      (myConfirm === 'reset' ? '<div class="inline-confirm">이 기기에 저장된 사주, 출석, 엽전이 모두 지워져요.' + (auth ? ' 계정에 보관된 기록은 남아 있어요.' : ' 로그인하지 않았다면 되돌릴 수 없어요.') + '<div class="row"><button class="btn-ghost grow" data-mc="cancel">취소</button><button class="btn-ghost btn-danger grow" id="btnResetOk">초기화</button></div></div>' : '') +
      '<div class="set-row" style="cursor:default"><span>앱 정보</span><span class="s">운수 v1.0 · 재미로 즐기는 콘텐츠</span></div>' +
      '</div></div>';
    $('myBody').innerHTML = h;
    bindDemoBar();
    $('btnMyEdit').onclick = function(){ if (NS){ toast('예시 모드에서는 수정할 수 없어요'); return; } startOnboarding('edit'); };
    $('btnMySaju').onclick = function(){ if (!r.error) openResult(me, r); };
    $('stCoin').onclick = function(){ $('coinChip').onclick(); };
    $('stAtt').onclick = function(){ go('today'); };
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
      '<ul class="benefits"><li>' + OK_SVG + '기기를 바꿔도 출석·엽전이 그대로예요</li><li>' + OK_SVG + '저장한 사주와 궁합 리포트가 계정에 보관돼요</li></ul>' +
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
      writeAccount(); closeSheet(); updateSegCount(); updateTopbar();
      toast(restored ? '다시 오셨네요! 계정의 기록을 불러왔어요' : PROV[provider] + ' 계정으로 로그인했어요 · 기록이 동기화돼요');
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

  var SH_IC = {
    send:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13"/></svg>',
    link:'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11.5 4.4"/><path d="M14 11a5 5 0 0 0-7.1 0l-2.8 2.8a5 5 0 0 0 7.1 7.1l1.3-1.3"/></svg>',
    heart:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/></svg>'
  };

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
      '<h1 class="hero-title">' + esc(inv.name) + '님이<br>궁합을 보자고 해요</h1>' +
      '<p class="helper">내 생년월일만 알려 주면 두 사람의 궁합 점수와 풀이가 바로 나와요. 가입 없이 30초면 끝나요.</p>' +
      '<div class="wel-cta"><button class="btn-primary btn-block" id="btnInvStart">내 생년월일 입력하기</button><button class="text-btn" id="btnInvSkip">초대는 나중에 볼게요</button></div></div>';
  }

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
