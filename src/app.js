(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id){ return document.getElementById(id); }
  /* =========================================================
     효과 단계 — full(풍부하게) / lite(가볍게)
     설정값 unsu_fx: auto | full | lite. auto 는 기기 사양을 보고 시작한 뒤 실제 프레임을 재서, 끊기면 lite 로 내린다.
     lite: 카드 뒤 흐림(backdrop-filter) 끔 · 배경 오로라 정지 · 입자 수 줄임. 모양은 html[data-perf] 로 CSS 가 바꾼다.
     ========================================================= */
  var PERF = (function(){
    var root = document.documentElement, subs = [], pref = 'auto', tier;
    function ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch(e){} return null; }
    function weakDevice(){ var n = navigator; return (n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 2) || !!(n.connection && n.connection.saveData); }
    function remembered(){ var a = (ls('unsu_fxauto') || '').split('|'); return a[0] === 'lite' && Date.now() - (+a[1] || 0) < 7 * 864e5; }   /* 일주일 뒤 다시 재 본다 */
    function resolve(){ return pref === 'full' || pref === 'lite' ? pref : (reduceMotion || weakDevice() || remembered()) ? 'lite' : 'full'; }
    function apply(){ var t = resolve(); if (t === tier) return; tier = t; root.setAttribute('data-perf', t); subs.forEach(function(fn){ try { fn(t); } catch(e){} }); }
    var p0 = ls('unsu_fx'); if (p0 === 'full' || p0 === 'lite') pref = p0;
    apply();
    /* 실측: 1.5초 구간마다 본다. 화면이 실제로 그려진 횟수가 초당 40번에 못 미치거나 느린 프레임(34ms 초과)이 30%를 넘는 구간이 두 번 이어지면 lite 로 */
    (function watch(){
      var last = 0, t0 = 0, n = 0, slow = 0, strikes = 0, until = 0;
      function f(t){
        if (pref !== 'auto' || tier !== 'full' || t > until) return;
        var d = t - last; last = t;
        if (document.hidden || d > 400){ t0 = t; n = 0; slow = 0; }   /* 탭 전환·멈춤은 세지 않는다 */
        else { n++; if (d > 34) slow++; }
        if (t - t0 >= 1500){
          strikes = (n < 60 || slow / n > .3) ? strikes + 1 : 0; t0 = t; n = 0; slow = 0;
          if (strikes >= 2){ ls('unsu_fxauto', 'lite|' + Date.now()); apply(); return; }
        }
        requestAnimationFrame(f);
      }
      setTimeout(function(){ requestAnimationFrame(function(t){ last = t0 = t; until = t + 90000; requestAnimationFrame(f); }); }, 1500);   /* 첫 로딩 직후의 버벅임은 빼고, 1분 30초 동안 잰다 */
    })();
    return {
      lite:function(){ return tier === 'lite'; },
      pref:function(){ return pref; },
      on:function(fn){ subs.push(fn); },
      set:function(v){ pref = v === 'full' || v === 'lite' ? v : 'auto'; ls('unsu_fx', pref === 'auto' ? null : pref); if (pref === 'auto') ls('unsu_fxauto', null); apply(); }
    };
  })();
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  /* 공유 링크로 연 결과는 '공유한 날짜' 기준으로 그린다 — 렌더하는 동안만 VIEW_DATE를 잠깐 바꾼다 */
  var VIEW_DATE = null;
  function nowD(){ return VIEW_DATE ? new Date(VIEW_DATE.getTime()) : new Date(); }
  function withDate(dt, fn){ var prev = VIEW_DATE; VIEW_DATE = dt; try { return fn(); } finally { VIEW_DATE = prev; } }
  function todayStr(){ var d = nowD(); return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate()); }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  /* 저장소: 예시 모드는 'demo:' 네임스페이스로 분리, 계정/모드 키는 전역 */
  var MEM = {}, NS = '', syncHook = null;
  var GLOBAL_KEYS = { unsu_mode:1, unsu_auth:1, unsu_account:1, unsu_intro:1, unsu_invite:1, unsu_gift:1, unsu_consent:1, unsu_notif:1, unsu_syncat:1 };
  var DATA_KEYS = ['unsu_list','unsu_me','unsu_coin','unsu_coinlog','unsu_att','unsu_ad','unsu_unlock','unsu_extra','unsu_draft','unsu_zbirth','unsu_seeded','unsu_welcomed','unsu_nudge','unsu_invgift','unsu_ny_alert','unsu_pet','unsu_coupons','unsu_orders','unsu_ny_open','unsu_dreams','unsu_dmdraft','unsu_numbox','unsu_drawn','unsu_peek','unsu_shared','unsu_todo','unsu_lifeseen','unsu_tk_open'];
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
  var OS = 8; /* 1/8 해상도로 그린 뒤 업스케일 → 결 없이 부드러운 블러 */
  /* 블루·바이올렛 중심 + 청록·연두·분홍을 은은하게 */
  /* 파스텔 + 신비로움: 라벤더 · 페리윙클 · 라일락 핑크 · 민트 · 복숭아 (채도 낮게, 아주 느리게) */
  var RIBBONS = [
    { c:[170,160,240], y:.30, amp:.07, k:2.1, sp:.00008,  ph:0.0, hgt:.46, a:.22 },
    { c:[196,170,240], y:.38, amp:.09, k:1.6, sp:.00010,  ph:2.2, hgt:.52, a:.22 },
    { c:[160,190,236], y:.24, amp:.06, k:2.7, sp:.00011,  ph:4.1, hgt:.34, a:.13 },
    { c:[226,178,226], y:.46, amp:.08, k:1.3, sp:.00007,  ph:5.3, hgt:.40, a:.15 },
    { c:[160,222,206], y:.34, amp:.08, k:1.8, sp:.000085, ph:1.2, hgt:.44, a:.12 },
    { c:[244,200,184], y:.42, amp:.07, k:2.3, sp:.00006,  ph:3.4, hgt:.36, a:.09 },
    { c:[214,160,220], y:.28, amp:.08, k:1.4, sp:.000075, ph:6.0, hgt:.38, a:.10 }
  ];
  function size(force){
    /* 모바일은 주소창이 접히고 펴질 때마다 resize 가 온다 → 폭이 같고 높이만 조금 바뀐 경우는 다시 만들지 않는다(스크롤 끊김의 원인) */
    var nw = window.innerWidth, nh = Math.max(window.innerHeight, cv.clientHeight || 0);
    if (force !== true && nw === W && Math.abs(nh - H) < 180) return false;
    DPR = Math.min(window.devicePixelRatio || 1, PERF.lite() ? 1 : 1.5);
    W = nw; H = nh;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    off.width = Math.ceil(W / OS); off.height = Math.ceil(H / OS);
    stars = [];
    var n = Math.min(PERF.lite() ? 110 : 220, Math.max(90, Math.round(W * H / 5200)));
    for (var i = 0; i < n; i++){
      var big = Math.random() < .07;
      stars.push({ x:Math.random()*W, y:Math.random()*H*.92, r:big ? Math.random()*.8 + 1.3 : Math.random()*1.1 + .35,
        b:Math.random()*.45 + .25, s:Math.random()*.0035 + .0012, p:Math.random()*6.28, big:big });
    }
    return true;
  }
  /* 리본 세로 그라데이션은 색마다 한 번만 만들어 두고(1×64 띠) 열마다 늘려 찍는다 — 프레임마다 그라데이션 객체 수천 개를 만들던 비용 제거 */
  var STRIPS = RIBBONS.map(function(r){
    var c = document.createElement('canvas'); c.width = 1; c.height = 64; var g2 = c.getContext('2d'), g = g2.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(' + r.c + ',0)'); g.addColorStop(.23, 'rgba(' + r.c + ',1)'); g.addColorStop(.56, 'rgba(' + r.c + ',.35)'); g.addColorStop(1, 'rgba(' + r.c + ',0)');
    g2.fillStyle = g; g2.fillRect(0, 0, 1, 64); return c;
  });
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
        ox.globalAlpha = Math.max(0, Math.min(1, al)); ox.drawImage(STRIPS[ri], x, cy - hh*.15, 1, hh*1.15);
      }
    });
    ox.globalAlpha = 1;
  }
  /* 배경은 화면 전체 + 유리 카드 뒤 흐림까지 다시 그리게 만드는 가장 비싼 층이다.
     오로라는 아주 느리게 움직이므로 초당 10장이면 충분하고, 스크롤 중에는 쉬고, lite 에서는 한 장만 그려 둔다. */
  var FRAME_MS = 96, lastDraw = -1e9, lastScroll = -1e9;
  window.addEventListener('scroll', function(){ lastScroll = performance.now(); }, { passive:true });
  function frame(t){
    var still = reduceMotion || PERF.lite();
    if (!still && !document.hidden) raf = requestAnimationFrame(frame); else raf = 0;
    if (!still && (t - lastDraw < FRAME_MS || t - lastScroll < 160)) return;
    lastDraw = t;
    cx.globalCompositeOperation = 'source-over';
    var bg = cx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0a1a'); bg.addColorStop(.6, '#13112a'); bg.addColorStop(1, '#1e1834');
    cx.fillStyle = bg; cx.fillRect(0, 0, W, H);
    /* aurora */
    drawOff(t);
    cx.globalCompositeOperation = 'lighter';
    cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = 'low';
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
  }
  var raf = 0;
  function kick(){ lastDraw = -1e9; if (reduceMotion || PERF.lite()){ frame(8000); } else if (!raf) raf = requestAnimationFrame(frame); }
  size(true);
  window.addEventListener('resize', function(){ if (size()) kick(); });
  document.addEventListener('visibilitychange', function(){ if (!document.hidden) kick(); });
  PERF.on(function(){ size(true); kick(); });
  kick();

  (function(){ var b = $('brandHome'); function home(){ if (typeof go === 'function'){ go('today'); window.scrollTo(0, 0); } } b.onclick = home; b.onkeydown = function(e){ if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); home(); } }; })();

  /* =========================================================
     공통 헬퍼
     ========================================================= */
  /* 행운 숫자 계산은 src/share.js 와 한 벌 — 서버의 링크 미리보기 이미지와 숫자가 같아야 한다 */
  var seedHash = SHARE.seedHash, mulberry32 = SHARE.mulberry32, drawYongNumbers = SHARE.drawYong;
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
    $('heroFig').innerHTML = uniImg('u-pouch', 'fig', '행운 복주머니를 든 우니') + '<figcaption>' + (r.error ? '' : r.seun.year + ' ' + r.pillars.year.hanja + ' · ' + r.color + ' ' + an) + '</figcaption>';
  })();

  /* =========================================================
     탭 네비게이션
     ========================================================= */
  var VIEWS = { today:$('v-today'), onboard:$('v-onboard'), my:$('v-my'), input:$('v-input'), result:$('v-result'), list:$('v-list'), zodiac:$('v-zodiac'), gunghap:$('v-gunghap'), fill:$('v-fill'), dream:$('v-dream'), shared:$('v-shared'), box:$('v-box') };
  var TAB_OF = { today:'today', onboard:'', my:'', input:'saju', result:'saju', list:'saju', zodiac:'today', gunghap:'today', fill:'num', dream:'dream', shared:'', box:'box' };
  var currentTab = 'today', currentView = 'today', lastSajuView = null;
  function show(view, tab){
    Object.keys(VIEWS).forEach(function(k){ VIEWS[k].hidden = k !== view; });
    var viewChanged = view !== shownView; shownView = view;
    if (typeof SHARED !== 'undefined' && SHARED && SHARED.view && view !== SHARED.view) sharedOff();   /* 공유 화면에서 다른 화면으로 넘어가면 일반 모드로 */
    currentView = view; currentTab = tab !== undefined ? tab : TAB_OF[view];
    document.body.classList.toggle('focus', view === 'onboard');
    if (typeof updateTopbar === 'function') updateTopbar();
    if (view === 'input' || view === 'list' || view === 'result') lastSajuView = view;
    document.querySelectorAll('.tab').forEach(function(b){ b.classList.toggle('active', b.dataset.tab === currentTab); b.setAttribute('aria-current', b.dataset.tab === currentTab ? 'page' : 'false'); });
    var ti = ['today','num','saju','dream','box'].indexOf(currentTab), lens = document.querySelector('.tab-lens');
    if (lens){ lens.style.opacity = ti < 0 ? '0' : '1'; if (ti >= 0) lens.style.setProperty('--ti', ti); }
    var segKey = view === 'result' ? 'mine' : view;
    document.querySelectorAll('.seg button').forEach(function(b){ b.setAttribute('aria-selected', String(b.dataset.sub === segKey)); });
    document.body.dataset.view = view; document.body.dataset.tab = currentTab || 'none';
    window.scrollTo(0, 0);
    if (viewChanged) enterFx(VIEWS[view]);
    if (typeof coachMaybe === 'function') setTimeout(function(){ coachMaybe(view); }, 1100);
  }
  /* 처음 온 사람을 위한 안내: 한 번씩만 보여 준다(기기 기준) */
  function coachOnce(k){ var c = store('unsu_coach') || {}; if (c[k]) return false; c[k] = 1; store('unsu_coach', c); return true; }
  function coachScroll(text){
    if (document.querySelector('.coach') || document.documentElement.scrollHeight < window.innerHeight * 1.4) return;
    var el = document.createElement('div'); el.className = 'coach'; el.setAttribute('role', 'status');
    el.innerHTML = '<span class="ar">↓</span>' + text; document.body.appendChild(el);
    var off = function(){ if (!el.isConnected) return; el.classList.add('out'); setTimeout(function(){ el.remove(); }, 400); window.removeEventListener('scroll', onS); };
    var onS = function(){ if (window.scrollY > 120) off(); };
    window.addEventListener('scroll', onS, { passive:true }); setTimeout(off, 7000);
  }
  function coachTab(tab, text){
    var b = document.querySelector('.tab[data-tab="' + tab + '"]'); if (!b) return;
    var rc = b.getBoundingClientRect(), el = document.createElement('div'); el.className = 'coach-tab'; el.textContent = text;
    el.style.left = (rc.left + rc.width / 2) + 'px'; el.style.bottom = (window.innerHeight - rc.top + 10) + 'px';
    document.body.appendChild(el);
    setTimeout(function(){ el.classList.add('out'); setTimeout(function(){ el.remove(); }, 400); }, 5000);
  }
  function coachMaybe(view){
    if (view !== currentView || document.querySelector('.sheet-backdrop:not([hidden])') || document.body.classList.contains('shared-mode')) return;
    var me = getMe();
    if (view === 'today' && !me){
      if (coachOnce('welTab')) coachTab('saju', '생년월일만 넣으면 여기서 사주 시작!');
      else if (coachOnce('welScroll')) coachScroll('아래로 내리면 띠별 운세도 볼 수 있어요');
    } else if (view === 'today' && me){ if (coachOnce('home')) coachScroll('아래로 내려 보면 오늘의 점수와 행운 부적이 있어요'); }
    else if (view === 'result'){ if (coachOnce('result')) coachScroll('천천히 내려 보며 내 사주를 읽어 보세요'); }
    else if (view === 'fill' && me){ if (coachOnce('lucky') && store('unsu_drawn') !== todayStr()) coachTab('num', '매일 새 복주머니가 생겨요'); }
  }

  /* =========================================================
     모션 (ai/decisions/004) — transform·opacity 만, IntersectionObserver 로만
     - enterFx: 화면이 바뀔 때 카드가 아래에서 차례로 올라온다. 같은 화면을 다시 그릴 때는 돌지 않는다
     - countUp: [data-count] 숫자가 0에서 올라간다
     ========================================================= */
  var shownView = null, fxIO = null;
  function fxDone(el){ el.classList.remove('rv', 'in'); el.style.removeProperty('--d'); }
  function enterFx(root){
    if (reduceMotion || !root || !('IntersectionObserver' in window)) return;
    if (fxIO) fxIO.disconnect();
    var els = [];
    Array.prototype.forEach.call(root.children, function(c){
      if (c.hidden) return;
      if (c.classList.contains('view') && c.children.length) Array.prototype.forEach.call(c.children, function(k){ if (!k.hidden) els.push(k); });
      else els.push(c);
    });
    els = els.filter(function(el){ return !el.classList.contains('no-fx') && getComputedStyle(el).position !== 'sticky'; });
    if (!els.length) return;
    fxIO = new IntersectionObserver(function(entries){
      var i = 0;
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        var el = en.target; fxIO.unobserve(el);
        el.style.setProperty('--d', Math.min(i++, 6) * 60 + 'ms');
        el.classList.add('in');
        setTimeout(function(){ fxDone(el); }, 900);
      });
    }, { rootMargin:'0px 0px -6% 0px' });
    els.forEach(function(el){ el.classList.add('rv'); fxIO.observe(el); });
    countUp(root);
  }
  function countUp(root){
    if (reduceMotion) return;
    var els = root.querySelectorAll('[data-count]'); if (!els.length) return;
    var t0 = null, dur = 900;
    els.forEach(function(el){ el.textContent = '0'; });
    requestAnimationFrame(function step(t){
      if (t0 === null) t0 = t;
      var k = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
      els.forEach(function(el){ el.textContent = Math.round(+el.dataset.count * e); });
      if (k < 1) requestAnimationFrame(step);
    });
  }
  /* 오늘 점수 → 배경 기운 4단계 (ai/decisions/003 피드백 3) */
  var MOODS = [[80, 'gold', '맑음'], [60, 'violet', '순풍'], [40, 'calm', '차분'], [0, 'care', '조심']];
  /* 점수 한 개 → 색 단계 (분야별 칩·시트·점수 카드). 80~ 금 / 60~ 보라 / 40~ 민트 / ~39 장미 */
  function tierOf(v){ return v >= 80 ? 'gold' : v >= 60 ? 'violet' : v >= 40 ? 'mint' : 'rose'; }
  var TIER_LABEL = { gold:'아주 좋음', violet:'좋음', mint:'보통', rose:'조심' };
  function moodOf(f){
    var avg = Math.round((f.scores.w + f.scores.l + f.scores.j) / 3);
    for (var i = 0; i < MOODS.length; i++) if (avg >= MOODS[i][0]) return { key:MOODS[i][1], label:MOODS[i][2], avg:avg };
  }
  /* PC 소개 패널 (ai/decisions/001): 넓은 화면에서만 우니와 QR을 한 번 그린다 */
  var pcMQ = window.matchMedia('(min-width:1100px)'), pcDone = false;
  function initPcSide(){
    if (pcDone || !pcMQ.matches) return; pcDone = true;
    try { $('pcWoni').innerHTML = uniImg('u-pouch', 'fig', '행운 복주머니를 든 우니'); } catch (e){}
    if (!window.QRCode){ var qs = document.querySelector('.pc-side.r'); if (qs) qs.hidden = true; }
    try { if (window.QRCode) new QRCode($('pcQr'), { text:location.origin + '/', width:232, height:232, colorDark:'#05060f', colorLight:'#ffffff', correctLevel:QRCode.CorrectLevel.M }); } catch (e){}
  }
  if (pcMQ.addEventListener) pcMQ.addEventListener('change', initPcSide);
  setTimeout(initPcSide, 0);
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
    else if (t === 'dream'){ openDream(); }
    else if (t === 'num'){ renderNumToday(); show('fill'); }
    else if (t === 'box'){ renderBox(); show('box'); }
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
  /* =========================================================
     손맛 효과 (FX) — 전부 transform·opacity 만 쓰는 짧은 Web Animations. 끝나면 노드를 지운다.
     - 버튼·공을 누르면 그 자리에서 반짝이가 튄다 / 빈 하늘을 누르면 별 하나가 반짝인다
     - 진동(안드로이드) · 복주머니 열기 꽃가루 · 별똥별(풍부하게 단계만)
     - 큰 그림은 마우스(노트북)나 스크롤(모바일)에 살짝 따라 움직인다
     reduced-motion 이면 전부 끈다. lite 단계에서는 입자 수를 줄이고 별똥별·따라 움직임은 쉰다.
     ========================================================= */
  var FX = (function(){
    var layer = null, live = 0, can = !reduceMotion && !!document.documentElement.animate;
    function L(){ if (!layer){ layer = document.createElement('div'); layer.className = 'fx-layer'; layer.setAttribute('aria-hidden', 'true'); document.body.appendChild(layer); } return layer; }
    function vib(p){ try { if (navigator.vibrate && !reduceMotion) navigator.vibrate(p); } catch(e){} }
    function bit(cls, x, y, frames, ms, delay){
      if (live > 70) return;
      var el = document.createElement('i'); el.className = cls; el.style.left = x + 'px'; el.style.top = y + 'px';
      L().appendChild(el); live++;
      var a = el.animate(frames, { duration:ms, delay:delay || 0, easing:'cubic-bezier(.2,.8,.3,1)', fill:'both' });
      a.onfinish = a.oncancel = function(){ el.remove(); live--; };
      return el;
    }
    var COLS = ['#fff', '#f5d48a', '#c9b9ff', '#8fe3d0', '#ff9cc0'];
    function spark(x, y, n){
      if (!can) return;
      n = PERF.lite() ? Math.ceil((n || 7) / 2) : (n || 7);
      for (var i = 0; i < n; i++){
        var ang = Math.PI * 2 * (i + Math.random() * .6) / n, d = 30 + Math.random() * 34, sz = 6 + Math.random() * 6;
        var el = bit('fx-dot', x, y, [
          { transform:'translate(-50%,-50%) scale(.3)', opacity:1 },
          { transform:'translate(calc(-50% + ' + (Math.cos(ang) * d).toFixed(1) + 'px),calc(-50% + ' + (Math.sin(ang) * d).toFixed(1) + 'px)) scale(1)', opacity:1, offset:.6 },
          { transform:'translate(calc(-50% + ' + (Math.cos(ang) * d * 1.25).toFixed(1) + 'px),calc(-50% + ' + (Math.sin(ang) * d * 1.25 + 8).toFixed(1) + 'px)) scale(.2)', opacity:0 }], 640 + Math.random() * 220);
        if (el){ el.style.width = el.style.height = sz + 'px'; el.style.background = COLS[i % COLS.length]; }
      }
    }
    function star(x, y){
      if (!can) return;
      var s = 26 + Math.random() * 18, el = bit('fx-star', x, y, [
        { transform:'translate(-50%,-50%) scale(0) rotate(0deg)', opacity:0 },
        { transform:'translate(-50%,-50%) scale(1) rotate(40deg)', opacity:1, offset:.4 },
        { transform:'translate(-50%,-50%) scale(0) rotate(90deg)', opacity:0 }], 820);
      if (el) el.style.width = el.style.height = s + 'px';
    }
    function confetti(box, n){
      if (!can || !box) return;
      var rc = box.getBoundingClientRect(); n = PERF.lite() ? 12 : (n || 30);
      for (var i = 0; i < n; i++){
        var x = rc.left + rc.width * (.1 + Math.random() * .8), dx = (Math.random() - .5) * 120, fall = 150 + Math.random() * 170, rot = (Math.random() - .5) * 720;
        var el = bit('fx-conf', x, rc.top + rc.height * .25, [
          { transform:'translate(-50%,-50%) translate(0,0) rotate(0deg)', opacity:1 },
          { transform:'translate(-50%,-50%) translate(' + (dx * .6).toFixed(0) + 'px,-' + (40 + Math.random() * 50).toFixed(0) + 'px) rotate(' + (rot * .4).toFixed(0) + 'deg)', opacity:1, offset:.3 },
          { transform:'translate(-50%,-50%) translate(' + dx.toFixed(0) + 'px,' + fall.toFixed(0) + 'px) rotate(' + rot.toFixed(0) + 'deg)', opacity:0 }], 1100 + Math.random() * 500, Math.random() * 180);
        if (el){ el.style.background = COLS[1 + i % 4]; if (i % 3 === 0) el.style.borderRadius = '50%'; }
      }
    }
    function hop(el){ if (can && el && el.animate) el.animate([{ transform:'translateY(0) scale(1)' }, { transform:'translateY(-9px) scale(1.14)', offset:.35 }, { transform:'translateY(0) scale(.96)', offset:.7 }, { transform:'translateY(0) scale(1)' }], { duration:420, easing:'cubic-bezier(.3,1.4,.5,1)' }); }

    /* 누르는 곳마다 반응 */
    var HOT = 'button,a,.ball,[role="button"],[role="link"],[role="switch"],summary';
    document.addEventListener('pointerdown', function(e){
      if (!can || e.button > 0) return;
      var t = e.target; if (!t || !t.closest || t.closest('.sheet-backdrop,canvas,input,textarea,select')) return;
      var ball = t.closest('.ball'), hot = t.closest(HOT);
      if (ball){ hop(ball); spark(e.clientX, e.clientY, 6); vib(6); }
      else if (hot){ if (hot.disabled) return; spark(e.clientX, e.clientY, hot.classList.contains('btn-primary') ? 9 : 5); if (hot.classList.contains('btn-primary')) vib(8); }
      else if (!t.closest('.card,.sheet,.tabbar,.topbar,.gen,.adov')) star(e.clientX, e.clientY);
    }, { passive:true });
    var brand = $('brandHome'); if (brand) brand.addEventListener('click', function(){ hop(brand.querySelector('img')); });

    /* 큰 그림이 마우스·스크롤을 살짝 따라온다 (풍부하게 단계만). 부모에 CSS 변수만 바꾸고 실제 이동은 transform */
    var FIGS = '.today-fig,.wel-fig,.hero-fig,.pc-woni', px = 0, py = 0, sy = 0, ptick = false;
    function par(){
      ptick = false; if (!can || PERF.lite()) return;
      var els = document.querySelectorAll(FIGS);
      for (var i = 0; i < els.length; i++){ if (!els[i].offsetParent) continue; els[i].style.transform = 'translate3d(' + (px * 10).toFixed(1) + 'px,' + (py * 8 + sy).toFixed(1) + 'px,0) rotate(' + (px * 2.5).toFixed(2) + 'deg)'; }
    }
    function need(){ if (!ptick){ ptick = true; requestAnimationFrame(par); } }
    if (window.matchMedia('(hover:hover) and (pointer:fine)').matches)
      window.addEventListener('pointermove', function(e){ px = e.clientX / window.innerWidth - .5; py = e.clientY / window.innerHeight - .5; need(); }, { passive:true });
    window.addEventListener('scroll', function(){ var y = window.scrollY || 0; if (y < 700){ sy = Math.min(60, y * .14); need(); } }, { passive:true });
    PERF.on(function(){ if (PERF.lite()) document.querySelectorAll(FIGS).forEach(function(el){ el.style.transform = ''; }); });

    /* 별똥별: 가끔, 화면 위쪽에 있을 때만 */
    (function shoot(){
      setTimeout(function(){
        if (can && !PERF.lite() && !document.hidden && (window.scrollY || 0) < 260 && !document.body.classList.contains('focus')){
          var w = window.innerWidth, x = w * (.25 + Math.random() * .7), y = 40 + Math.random() * 160, len = 190 + Math.random() * 120;
          bit('fx-shoot', x, y, [{ transform:'rotate(152deg) translateX(0) scaleX(.2)', opacity:0 }, { transform:'rotate(152deg) translateX(' + (len * .35).toFixed(0) + 'px) scaleX(1)', opacity:1, offset:.3 }, { transform:'rotate(152deg) translateX(' + len.toFixed(0) + 'px) scaleX(.3)', opacity:0 }], 950);
        }
        shoot();
      }, 6000 + Math.random() * 9000);
    })();
    return { spark:spark, star:star, confetti:confetti, hop:hop, vib:vib };
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
    return MS.calc({ y:e.y, m:e.m, d:e.d, cal:e.cal, leap:e.leap, hour:e.hour, minute:e.minute, unknownTime:e.unknown, gender:e.gender, lonCorr:e.corr !== false, lon:127, now:VIEW_DATE || undefined });
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
    showGen(r.result, function(){ openResult(r.entry, r.result); }, { name:r.entry.name });
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

  /* ---- 신뢰 배지 · 계산 근거: 엔진(src/engine.js)이 실제로 한 계산만 그 사람의 숫자로 보여 준다.
     '통계로 검증'·'과학적' 같은 말은 쓰지 않는다(검증한 적 없음 → 표시광고법) ---- */
  var SEAL_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.8l2.4 1.7 2.9-.1.9 2.8 2.3 1.8-.9 2.8.9 2.8-2.3 1.8-.9 2.8-2.9-.1L12 21.2l-2.4-1.7-2.9.1-.9-2.8-2.3-1.8.9-2.8-.9-2.8 2.3-1.8.9-2.8 2.9.1z"/><path d="M8.6 12.2l2.3 2.3 4.6-4.8" stroke-linecap="round"/></svg>';
  var JIE_BY_BR = ['대설','소한','입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동'];
  function trustStripHTML(r){
    var lonOn = r.time && r.input.lonCorr !== false;
    return '<button type="button" class="trust-strip" id="btnBasis"><span class="tt">' + SEAL_SVG + '천문 계산 만세력으로 세운 명식<span class="more">계산 근거 ›</span></span>' +
      '<span class="trust-chips"><span>입춘·절기 시각 기준</span>' + (lonOn ? '<span>출생지 경도 보정(서울 기준)</span>' : '') + '<span>서머타임·옛 표준시 반영</span><span>음력: 한국천문연구원 자료</span></span></button>';
  }
  function basisHTML(entry, r){
    var P = r.pillars, t = function(x){ return x.m + '월 ' + x.d + '일 ' + pad2(x.h) + ':' + pad2(x.mi); };
    var row = function(p, lab, h5, txt){ return '<div class="basis-row"><div class="pl"><b>' + (p ? p.hanja : '—') + '</b><small>' + lab + '</small></div><div><h5>' + h5 + '</h5><p>' + txt + '</p></div></div>'; };
    var y = r.solar.y, li = MS.jdToKST(MS.findLon(315, MS.jd(y, 2, 4, 0))), before = P.year.stem !== ((y - 4) % 10 + 10) % 10;
    var h = row(P.year, '연주', '입춘이 지났는지로 해를 정해요', before
      ? y + '년 입춘 <em>' + t(li) + '</em> 전에 태어나 아직 ' + (y - 1) + '년의 기운, ' + P.year.name + '년이에요. 1월 1일이나 설날이 아니라 입춘이 기준이에요.'
      : y + '년 입춘 <em>' + t(li) + '</em> 이후에 태어나 ' + P.year.name + '년이에요. 1월 1일이나 설날이 아니라 입춘이 기준이에요.');
    var mb = P.month.br;
    h += row(P.month, '월주', '절기가 들어온 시각으로 달을 정해요', JIE_BY_BR[mb] + ' <em>' + t(r.jie.prev) + '</em> 이후, ' + JIE_BY_BR[(mb + 1) % 12] + ' ' + t(r.jie.next) + ' 이전이라 ' + P.month.bk + '월(' + P.month.bh + '月)이에요. 태양의 위치를 직접 계산해 분 단위로 찾아요.' + (r.time ? '' : ' 태어난 시간을 몰라 그날 정오로 셈했어요.'));
    h += row(P.day, '일주', '날짜는 60갑자를 하루씩 세어요', r.time ? '밤 11시(자시)에 날이 바뀌는 기준으로, 아래에서 고친 시각으로 셈했어요.' : '태어난 날을 기준으로 60갑자를 하루씩 세어 정했어요.');
    if (r.time && P.hour){
      var c = r.corr, parts = [];
      parts.push('시계 시각 <em>' + pad2(r.time.h) + ':' + pad2(r.time.mi) + '</em>');
      if (c.dst) parts.push('그해 서머타임이라 1시간을 빼고');
      if (c.corrMin) parts.push((c.zone === 8.5 ? '당시 표준시(동경 127.5°)' : '동경 135° 기준 시각') + '을 서울(127°)의 해 시각으로 <em>' + Math.abs(c.corrMin) + '분</em> ' + (c.corrMin < 0 ? '당겨' : '늦춰'));
      else if (r.input.lonCorr === false) parts.push('(경도 보정은 꺼 두셨어요)');
      h += row(P.hour, '시주', '태어난 곳의 해 시각으로 고쳐요', parts.join(', ') + ' <em>' + pad2(c.lmH) + ':' + pad2(c.lmMi) + '</em>, ' + P.hour.bk + '시(' + P.hour.bh + '時)예요.' + (c.dst ? '' : ' 그해는 서머타임이 없었어요.'));
    } else h += row(null, '시주', '태어난 시간을 몰라요', '시주 없이 여섯 글자로 풀었어요. 시간을 알면 상세 설정에서 넣어 주세요.');
    var pct = Math.round(r.ratio * 100);
    return '<div class="card basis-card" id="basisCard"><div class="sec-head"><h2 class="sec-title">이 명식은 이렇게 세웠어요</h2><span class="sec-meta">계산 근거</span></div>' +
      '<div class="basis">' + h + '</div>' +
      '<div class="basis-src"><b>그다음 풀이는</b> 일간과 다른 글자의 관계(십성), 오행 분포와 일간의 힘(' + r.strength + ' ' + pct + '%), 억부로 고른 용신(' + MS.EL_H[r.yong] + ') 같은 명리학의 해석 규칙을 쉬운 말로 옮긴 거예요. 과학적으로 증명된 예측이 아니라 전통 해석이라는 점은 알고 봐 주세요.</div>' +
      '<p class="basis-foot">절기 시각: 태양 황경 계산(오차 ±1분 내외) · 음력 변환: 한국천문연구원 자료 · 표준시: 1954~61년 동경 127.5°, 서머타임 시행 연도 반영</p></div>';
  }
  function zoneHTML(key, t, d){ return '<div class="zone" data-zone="' + key + '"><b>' + t + '</b><span>' + d + '</span></div>'; }
  function openResult(entry, r, asTab){
    setTimeout(function(){ bond('saju'); }, 900);
    if (currentView !== 'result') prevView = currentView;
    cur = { entry:entry, r:r, asTab:!!asTab, date:todayStr() };
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
    h += trustStripHTML(r);
    h += '<button class="btn-primary btn-block" id="btnImgRes" style="margin:-4px 0 4px">정리된 결과 이미지로 저장·공유</button>';

    h += zoneHTML('me', '나', '타고난 나의 모습');
    /* --- 일간 --- */
    h += '<div class="card me-card ' + EL_CLASS[dEl] + '"><div class="sec-head"><h2 class="sec-title">나를 나타내는 글자</h2><span class="sec-meta">일간 日干</span></div>' +
      '<div class="ilgan-head ' + EL_CLASS[dEl] + '"><div class="ilgan-mark">' + P.day.sh + '</div><div><div class="ilgan-t">' + ig.t + '</div><div class="ilgan-img">' + ig.img + '</div><span class="me-badge">' + MS.EL_K[dEl] + '(' + MS.EL_H[dEl] + ') 기운을 타고난 ' + esc(entry.name) + '님</span></div></div>' +
      '<div class="chip-row">' + ig.kw.map(function(k){ return '<span class="chip">' + k + '</span>'; }).join('') + '</div>' +
      '<p class="body-text">' + ig.d + '</p><div class="divider"></div>' +
      '<div class="sub-block"><h4>타고난 강점</h4><p class="body-text">' + ig.good + '</p></div>' +
      '<div class="sub-block"><h4>조심하면 좋은 점</h4><p class="body-text">' + ig.care + '</p></div>' +
      '<div class="sub-block"><h4>잘 맞는 분야</h4><p class="body-text">' + ig.fit + '</p></div>' +
      '<div class="sub-block"><h4>일지 · ' + P.day.bk + '(' + P.day.bh + ') ' + P.day.tenBr + ' · ' + P.day.stage + '</h4><p class="body-text">배우자 자리에 ' + TEN_DESC[P.day.tenBr] + '의 기운이 앉아 있고, 일간은 이 자리에서 ‘' + P.day.stage + '’ 상태예요. ' + STAGE_DESC[P.day.stage] + '.</p></div>' +
      '</div>';

    /* --- 원국 --- */
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">사주 원국</h2><span class="sec-meta">' + (P.hour ? '8字' : '6字') + '</span></div>';
    h += '<div class="pillars">' + order.map(function(k){ return colHTML(k, P[k], k === 'day'); }).join('');
    h += '<div class="prow-label">지장간 支藏干</div>' + order.map(function(k){ return '<div class="pcell">' + (P[k] ? '<span class="jj">' + P[k].jijang + '</span>' : '—') + '</div>'; }).join('');
    h += '<div class="prow-label">12운성 十二運星</div>' + order.map(function(k){ return '<div class="pcell">' + (P[k] ? P[k].stage : '—') + '</div>'; }).join('');
    h += '</div><p class="table-note">가운데 일주의 윗글자(일간 <b style="color:#fff">' + P.day.sh + '</b>)가 나 자신이에요. 나머지 글자의 이름(비견·정재 등)은 일간과의 관계를 뜻해요.</p></div>';
    h += basisHTML(entry, r);

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

    h += adSlotHTML('원국과 오행을 본 뒤');
    var ezStart = h.length, ezOpen = owns('ez');
    h += zoneHTML('read', '풀이', '글자들이 말해 주는 것');
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

    /* --- 띠 --- */
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">' + r.color + ' ' + r.animal + '띠 이야기</h2><span class="sec-meta">' + P.year.hanja + '</span></div>' +
      '<div class="chip-row">' + ANIMAL_TRAITS[r.animal].map(function(t){ return '<span class="chip">' + t + '</span>'; }).join('') + '</div>' +
      '<p class="body-text">' + ANIMAL_BLURB[r.animal] + '</p></div>';

    h += zoneHTML('flow', '흐름', '지금 지나는 시기');
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

    /* --- 행운 숫자 --- */
    var iso = r.solar.y + '-' + pad2(r.solar.m) + '-' + pad2(r.solar.d);
    var tKey = r.time ? pad2(r.time.h) + pad2(r.time.mi) : 'unknown';
    var luck = todayLuck(entry, r), yongNums = luck.nums, lEl = luck.el;
    cur.yongNums = yongNums;
    if (!ezOpen){
      var EZ = product('ez');
      h = h.slice(0, ezStart) + zoneHTML('read', '풀이 · 흐름', '쉬운 사주 풀이에서 이어져요') +
        '<div class="card locked ez-lock"><div class="sec-head"><h2 class="sec-title">쉬운 사주 풀이</h2><span class="sec-meta">' + EZ.coin + '닢</span></div>' +
        '<div class="ez-art">' + tileArtSVG('book') + '</div><p class="body-text" style="text-align:center;margin:0 0 10px">어려운 한자 없이, ' + esc(entry.name) + '님의 사주를 이야기처럼 풀어 드려요.</p>' +
        '<ul class="lock-list">' + EZ.items.map(function(t){ return '<li>' + LOCK_SVG + t + '</li>'; }).join('') + '</ul>' +
        '<div class="locked-preview" aria-hidden="true"><div style="width:92%"></div><div style="width:78%"></div><div style="width:85%"></div></div>' +
        '<div class="lock-cta"><button class="btn-primary" id="btnEzBuy">' + COIN_SVG + '엽전 ' + EZ.coin + '닢으로 풀이 열기</button><p class="helper" style="text-align:center">한 번 열면 저장한 모든 사람의 풀이를 볼 수 있어요.</p></div></div>';
    }
    h += '<button type="button" class="card tk-saju" id="btnTkSaju"><span class="tk-bn-ic uni" aria-hidden="true">' + uniImg('u-calendar') + '</span><span class="tk-bn-t"><b>중요한 날 잡기</b><small>개업·계약·이사·면접, ' + esc(entry.name) + '님 사주에 맞는 날을 골라 드려요</small></span><span class="chev" aria-hidden="true">›</span></button>';
    h += '<div class="card num-cta ' + EL_CLASS[lEl] + '"><div class="num-cta-q">오늘 ' + esc(entry.name) + '님의<br><em>행운 숫자</em></div>' +
      '<p class="helper">오늘 ' + esc(entry.name) + '님에게 행운을 주는 ' + MS.EL_K[lEl] + '(' + MS.EL_H[lEl] + ') 기운의 숫자예요. 매일 바뀌어요.</p>' +
      luckChips(yongNums.map(function(o){ return o.n; }), EL_CLASS[lEl]) +
      '<button class="btn-soft btn-block" id="btnDraw">오늘의 행운 부적 열어 보기</button></div>';

    h += adSlotHTML('사주 풀이를 다 읽은 뒤');
    h += '<p class="disclaimer">전통 명리 이론을 바탕으로 계산한 참고용 풀이예요. 절기가 바뀌는 시각 전후 10분 이내에 태어났다면 월주가 달라질 수 있어요.</p>';

    $('resultBody').innerHTML = h;
    show('result', asTab ? 'saju' : prevView === 'today' ? 'today' : prevView === 'gunghap' ? 'gunghap' : 'saju');
    drawOn($('posterFig'));
    if ($('btnEzBuy')) $('btnEzBuy').onclick = function(){ openPaySheet('ez', { onPaid:function(){ openResult(entry, r, asTab); } }); };
    var du = $('duScroll') && $('duScroll').querySelector('.now');
    if (du) $('duScroll').scrollLeft = du.offsetLeft - 60;
    if (!reduceMotion && window.gsap) gsap.from('#resultBody .el-bar .fill', { scaleX:0, duration:.9, ease:'power2.out', stagger:.06, delay:.2 });

    $('btnTkSaju').onclick = function(){ openTaekil(entry, r); };
    $('btnDraw').onclick = function(){ go('num'); window.scrollTo(0, 0); };
    $('btnImgRes').onclick = function(){ shareResultImage(entry, r); };
    if ($('btnBasis')) $('btnBasis').onclick = function(){ var b = $('basisCard'); if (b) b.scrollIntoView({ block:'start', behavior: reduceMotion ? 'auto' : 'smooth' }); };
    $('btnCopyRes').onclick = function(){ copyText(summaryText(), '결과를 복사했어요'); };
    $('btnShareRes').onclick = function(){
      var ig0 = ILGAN[P.day.stem];
      openShare({ sheetTitle:'사주 풀이 공유', title:entry.name + '님의 사주 · ' + P.day.name + '(' + P.day.hanja + ')일주', desc:ig0.t + ' — ' + ig0.img,
        fig:figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
        text:'[우니조아] ' + entry.name + '님의 사주\n' + P.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · ' + P.day.name + '(' + P.day.hanja + ')일주\n일간 ' + ig0.t + ' — ' + ig0.img,
        cta:'생년월일만 넣으면 내 여덟 글자도 풀어 줘요 →', link:resultLink('s', cur.date, [entry]), shareEntries:[entry] });
    };
  }

  /* ---- 결과 이미지 카드 (1080×1350, 공유·저장용) ---- */
  var EL_HEX = ['#6fd88a','#ff8a73','#f6cd5b','#eef1f8','#6c9dff'];
  function resultCardCanvas(entry, r, done){
    var P = r.pillars, c = document.createElement('canvas'); c.width = 1080; c.height = 1350;
    var g = c.getContext('2d'), F = '"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif', H = '"Noto Serif KR","Nanum Myeongjo","Apple SD Gothic Neo",serif';
    var bg = g.createLinearGradient(0,0,0,1350); bg.addColorStop(0,'#070b24'); bg.addColorStop(.55,'#101650'); bg.addColorStop(1,'#2a1a6e');
    g.fillStyle = bg; g.fillRect(0,0,1080,1350);
    [[200,260,520,'rgba(76,128,255,.28)'],[900,420,480,'rgba(140,90,250,.30)'],[540,1250,560,'rgba(100,80,240,.25)']].forEach(function(o){
      var rg = g.createRadialGradient(o[0],o[1],0,o[0],o[1],o[2]); rg.addColorStop(0,o[3]); rg.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0,0,1080,1350); });
    for (var i = 0; i < 70; i++){ g.fillStyle = 'rgba(230,240,255,' + (Math.random()*.6+.2) + ')'; g.beginPath(); g.arc(Math.random()*1080, Math.random()*1350, Math.random()*1.8+.5, 0, 6.283); g.fill(); }
    function rr(x,y,w,h,rad){ g.beginPath(); g.moveTo(x+rad,y); g.arcTo(x+w,y,x+w,y+h,rad); g.arcTo(x+w,y+h,x,y+h,rad); g.arcTo(x,y+h,x,y,rad); g.arcTo(x,y,x+w,y,rad); g.closePath(); }
    g.textAlign = 'center'; g.fillStyle = '#b9c8ff'; g.font = '500 34px ' + F; g.fillText('우니조아  ·  나의 사주 리포트', 540, 96);
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
          navigator.share({ files:[file], title:'우니조아 · ' + entry.name + '님의 사주', text:'[우니조아] ' + entry.name + '님의 사주 리포트' }).catch(function(){});
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
    return '우니조아 — ' + e.name + '님의 사주\n' +
      '원국(시일월년): ' + g + '\n' +
      P.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · 일간 ' + ILGAN[P.day.stem].t + ' (' + ILGAN[P.day.stem].img + ')\n' +
      '오행 목' + r.cnt[0] + ' 화' + r.cnt[1] + ' 토' + r.cnt[2] + ' 금' + r.cnt[3] + ' 수' + r.cnt[4] + ' · ' + r.strength + ' · 용신 ' + MS.EL_K[r.yong] + '\n' +
      '오늘의 행운 숫자: ' + cur.yongNums.map(function(o){ return o.n; }).join(', ');
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
  var ZEL = { fire:1, earth:2, air:0, water:4 };   /* 별자리 원소 → 오행 번호(바람은 나무 기운으로 본다) */
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
    var zNow = nowD(), zDate = todayStr();
    var doy = Math.floor((zNow - new Date(zNow.getFullYear(), 0, 0)) / 86400000);
    var seed = iso ? iso + '|unknown|' + todayStr() : z.name + '|' + todayStr();
    var nums = drawYongNumbers(seed, ZEL[z.el]).map(function(o){ return o.n; });
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
      '<button class="btn-primary btn-block" id="btnZDraw">오늘의 행운 숫자 보기</button>' +
      '<div id="zNums" hidden class="view" style="gap:14px">' + luckChips(nums, EL_CLASS[ZEL[z.el]] + ' soft') +
      '<div class="row"><button class="btn-ghost grow" id="btnZCopy">결과 복사</button><button class="btn-soft grow" id="btnZShare">공유하기</button></div>' +
      '<p class="disclaimer">재미로 즐기는 운세 콘텐츠예요.</p></div></div>';
    h += adSlotHTML('별자리 운세를 본 뒤');
    $('zResult').innerHTML = h;
    $('zHome').hidden = true; $('zResult').hidden = false; window.scrollTo(0, 0);
    drawOn($('zFig'));
    $('btnZBack').onclick = function(){ $('zResult').hidden = true; $('zHome').hidden = false; };
    $('btnZDraw').onclick = function(){ $('zNums').hidden = false; this.hidden = true; };
    var txt = '우니조아 — ' + z.name + '(' + z.en + ') ' + todayStr() + '\n오늘의 행운 숫자: ' + nums.join(', ');
    $('btnZCopy').onclick = function(){ copyText(txt, '결과를 복사했어요'); };
    $('btnZShare').onclick = function(){
      openShare({ sheetTitle:'별자리 운세 공유', title:'오늘의 ' + z.name + ' (' + z.en + ')', desc:'오늘의 행운 숫자 ' + nums.join(' · '),
        fig:figSVG(z.name, z.el, 'mini'),
        text:'[우니조아] 오늘의 ' + z.name + '(' + z.en + ') 운세\n행운 숫자 ' + nums.join(' · '),
        cta:'내 별자리 운세도 보기 →', link:resultLink('z', zDate, [], z.name + '~' + (iso || '')) });
    };
  }

  /* =========================================================
     대표 사주 · 엽전 · 바텀시트 · 광고 목업
     ========================================================= */
  function getMe(){ var id = store('unsu_me'), l = getList(); return l.filter(function(x){ return x.id === id; })[0] || null; }
  function setMe(id){ store('unsu_me', id); }
  function updateSegCount(){ var n = getList().length; document.querySelectorAll('.seg-n').forEach(function(s){ s.textContent = n ? n : ''; }); }
  function entryISO(e, r){ return r.solar.y + '-' + pad2(r.solar.m) + '-' + pad2(r.solar.d); }
  function entryTKey(r){ return r.time ? pad2(r.time.h) + pad2(r.time.mi) : 'unknown'; }
  /* 하루 한 가지 '행운 기운' → 행운의 팁 숫자 · 오늘의 행운 숫자 · 결과 화면이 모두 같은 값을 쓴다 */
  function todayLuck(entry, r){
    var f = DAILY.today(entry, r, nowD());
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

  var AD_PLAY_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="vertical-align:-4px;margin-right:6px"><rect x="3" y="5" width="18" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>';
  var COIN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="9.5" y="9.5" width="5" height="5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  var LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var GH_COST = 30, AD_REWARD = 20, AD_LIMIT = 3;
  /* 2026-11-15 소율: 유료는 전부 엽전(닢). 엽전은 충전소에서 원화로 충전(토스) · 신년운세 전체는 광고 시청으로 연다.
     값은 여기 한 곳만 고치면 화면 전체가 바뀐다. 1닢 ≈ 9~11원(충전 패키지 기준) */
  var COST = { cat:100, dream:200, gh:100, ez:100, tk:500 };   /* 서버 가격표 api/_lib/shop.js PRICES 와 같이 바꾼다 */
  var CAT_COST = COST.cat;

  var SIGNUP_COINS = 500;   /* 2026-11-14 소율: 1,000 → 500 */
  function isGuest(){ return !NS && !store('unsu_auth'); }
  /* =========================================================
     서버 계정 (카카오 로그인 · 엽전 원장 · 결제) — api/me.js · api/coins.js · api/pay.js
     서버 환경변수가 없으면(로컬 미리보기·설정 전) 예전처럼 이 기기 안에서만 동작한다.
     ========================================================= */
  var SRV = { cfg:null, orders:[], applying:false, pushT:0, split:null, spending:false, passUntil:0 };
  /* 우니 패스 (2026-11-18 소율 요청): 원화 바로 결제 기간권. 기간 동안 엽전 콘텐츠를 엽전 없이 열고 광고를 숨긴다.
     서버 기준값 api/_lib/shop.js PASSES 와 같게. 꿈 풀이 리포트(AI)만 하루 1번 */
  var PASS = { id:'pass30', days:30, p:12900, name:'우니 패스 30일', dream:1 };
  function passActive(){ return !NS && srvUser() && SRV.passUntil > Date.now(); }
  /* 원화 단건 결제 (2026-11-21 소율 결정): PG 심사 때문에 엽전은 팔지 않고, 엽전이 모자라면 그 콘텐츠 하나만 원화로 바로 결제한다.
     엽전은 출석·가입·선물로 모으는 무료 적립 포인트. 가격은 서버 api/_lib/shop.js WON 과 같게(서버 값이 오면 그 값을 쓴다).
     */
  var WON = { cat:990, dream:1900, gh:990, ez:990, tk:4900 };
  function wonOf(k){ var w = SRV.cfg && SRV.cfg.won; return (w && w[k]) || WON[k] || 0; }
  function coinSale(){ return !!(SRV.cfg && SRV.cfg.packs); }   /* 서버 COIN_SALE=1 일 때만 엽전 충전 패키지를 보인다 */
  /* 잠금 화면 버튼: 엽전이 모자랄 때 '990원 바로 열기' */
  function buyLabel(k){ return wonOf(k).toLocaleString() + '원 결제하고 바로 열기'; }
  function passEndStr(){ var d = new Date(SRV.passUntil); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; }
  /* 광고 보상 엽전은 실제 보상형 광고 + 서버 확인이 붙을 때까지 숨긴다(서버 AD_COIN_ON). 예시 모드는 연출만 보여 준다 */
  function adCoinOn(){ return NS || !!(SRV.cfg && SRV.cfg.adCoin); }
  function srvOn(){ return !!(SRV.cfg && SRV.cfg.on && SRV.cfg.login && (SRV.cfg.login.kakao || SRV.cfg.login.google)); }
  function srvLogin(p){ return !!(SRV.cfg && SRV.cfg.on && SRV.cfg.login && SRV.cfg.login[p]); }
  function srvUser(){ var a = store('unsu_auth'); return !NS && !!(a && a.srv); }
  function api(path, opt){
    opt = opt || {};
    return fetch(path, { method:opt.method || 'GET', credentials:'same-origin', headers:opt.body ? { 'Content-Type':'application/json' } : {}, body:opt.body ? JSON.stringify(opt.body) : undefined })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ j = j || {}; j._s = r.status; return j; }); });
  }
  /* 화면에서 쓰는 사유 문구 → 서버 적립 규칙(api/_lib/shop.js)의 이름 */
  function coinKind(n, why){
    if (n < 0) return 'spend';
    if (/^광고 보상/.test(why)) return 'ad';
    if (why === '출석 체크') return 'att';
    if (/연속 출석 보너스/.test(why)) return 'streak';
    if (why === '우니의 선물') return 'petgift';
    if (/^오늘 할 일/.test(why)) return 'todo';
    if (why === '우니 꾹 뽑기') return 'peek';
    if (why === '초대 수락 선물') return 'invite';
    return null;   /* 가입 선물·충전은 서버가 직접 넣는다 */
  }
  function setSrvCoins(x){
    var bal = x;
    if (x && typeof x === 'object'){ if (typeof x.free === 'number') SRV.split = { free:x.free, paid:x.paid || 0 }; bal = x.bal; }
    if (typeof bal !== 'number') return; var key = nsk('unsu_coin'); MEM[key] = bal; try { localStorage.setItem(key, JSON.stringify(bal)); } catch(e){} renderCoin(); }
  function pushSnapshot(now){
    clearTimeout(SRV.pushT);
    return new Promise(function(ok){
      SRV.pushT = setTimeout(function(){
        if (!srvUser()) return ok();
        var snap = snapshot(); delete snap.unsu_coin; delete snap.unsu_coinlog;
        api('/api/me', { method:'PUT', body:{ snapshot:snap } }).then(function(r){ if (r.ok) try { localStorage.setItem('unsu_syncat', JSON.stringify(r.at)); } catch(e){} ok(); }).catch(function(){ ok(); });
      }, now ? 0 : 1200);
    });
  }
  function pushConsent(){ var c = getConsent(); if (c) api('/api/me', { method:'POST', body:{ consent:c } }).catch(function(){}); }
  function loginBtnsHTML(){
    var on = srvOn();   /* 서버 로그인이 켜졌으면 실제로 연결된 것만 보여 준다 */
    return (!on || srvLogin('kakao') ? '<button class="btn-social k" data-login="kakao">카카오로 계속하기</button>' : '') + (!on || srvLogin('google') ? '<button class="btn-social g" data-login="google">Google로 계속하기</button>' : '');
  }
  /* 서버 회원 정보를 이 기기에 반영 */
  function applySrvUser(u, justLoggedIn){
    SRV.applying = true;
    try {
      store('unsu_auth', { provider:u.provider || 'kakao', nick:(getMe() && getMe().name) || u.nick || '우니조아 사용자', at:Date.now(), srv:true });
      var localAt = 0; try { localAt = JSON.parse(localStorage.getItem('unsu_syncat')) || 0; } catch(e){}
      var snap = u.snapshot, hasSrv = !!(snap && snap.unsu_me);
      /* 계정에 기록이 있는데 이 기기에도(비회원) 기록이 있으면: 계정 기록을 먼저 보여 주고, 기기 기록은 따로 맡아 뒀다가 확인받고 합친다 */
      if (justLoggedIn && hasSrv && getMe()) stashLocalForMerge();
      var useServer = hasSrv && (!getMe() || justLoggedIn || u.snapshotAt > localAt);
      if (useServer){ DATA_KEYS.forEach(function(k){ if (k === 'unsu_coin' || k === 'unsu_coinlog') return; var v = snap[k]; var key = nsk(k); if (v === null || v === undefined){ delete MEM[key]; try { localStorage.removeItem(key); } catch(e){} } else store(k, v); }); try { localStorage.setItem('unsu_syncat', JSON.stringify(u.snapshotAt)); } catch(e){} }
      store('unsu_coinlog', u.ledger || []);
      store('unsu_gift', 1);
      setSrvCoins(u.coins);
      SRV.orders = u.orders || [];
      SRV.passUntil = +u.passUntil || 0;
      if (SRV.cfg && SRV.cfg.passes && SRV.cfg.passes[PASS.id]){ PASS.p = SRV.cfg.passes[PASS.id].p; PASS.days = SRV.cfg.passes[PASS.id].days; }
      if (SRV.cfg && SRV.cfg.passDreamMax) PASS.dream = SRV.cfg.passDreamMax;
      if (u.consent && !getConsent()) store('unsu_consent', u.consent);
    } finally { SRV.applying = false; }
    if (!useServer) pushSnapshot();
    if (getConsent() && (!u.consent || !u.consent.terms)) pushConsent();
    return useServer;
  }
  /* ---- 비회원 기록 → 계정 승계 (2026-11-19) ----
     덮어쓰기 금지 · 겹치는 건 빼고 추가 · 사람(사주)은 이름만으로 같다고 보지 않고 생년월일시·성별까지 같아야 같은 사람.
     엽전·구매는 계정(서버) 기준이라 여기서 옮기지 않는다. */
  function stashLocalForMerge(){
    var o = { at:Date.now(), list:getList().filter(function(x){ return !x.sample; }), me:store('unsu_me'), box:getBox(), dreams:getDreams(), ny:store('unsu_ny_open') || {} };
    if (!o.list.length && !o.box.length && !o.dreams.length) return;
    try { localStorage.setItem('wj_merge', JSON.stringify(o)); } catch(e){}
  }
  function readMerge(){ try { return JSON.parse(localStorage.getItem('wj_merge')) || null; } catch(e){ return null; } }
  function sajuSig(x){ return [x.name, x.gender, x.cal, x.leap ? 1 : 0, x.y, x.m, x.d, x.unknown ? 'u' : x.hour + ':' + x.minute].join('|'); }
  function boxSig(b){ return b.d + '|' + (b.nums || []).join(','); }
  function mergePlan(){
    var m = readMerge(); if (!m || !srvUser()) return null;
    var list = getList(), ids = {}, sigs = {}, idMap = {};
    list.forEach(function(x){ ids[x.id] = 1; sigs[sajuSig(x)] = x.id; });
    var addList = m.list.filter(function(x){ if (ids[x.id]) { idMap[x.id] = x.id; return false; } var hit = sigs[sajuSig(x)]; if (hit){ idMap[x.id] = hit; return false; } idMap[x.id] = x.id; return true; });
    var bs = {}; getBox().forEach(function(b){ bs[b.id] = 1; bs[boxSig(b)] = 1; });
    var addBox = m.box.filter(function(b){ return !bs[b.id] && !bs[boxSig(b)]; });
    var ds = {}; getDreams().forEach(function(d){ ds[d.id] = 1; });
    var addDreams = m.dreams.filter(function(d){ return !ds[d.id]; });
    return { list:addList, box:addBox, dreams:addDreams, idMap:idMap, ny:m.ny || {}, n:addList.length + addBox.length + addDreams.length };
  }
  function pendingMergeCount(){ var p = mergePlan(); if (p && !p.n){ try { localStorage.removeItem('wj_merge'); } catch(e){} } return p ? p.n : 0; }
  function applyMerge(){
    var p = mergePlan(); if (!p) return 0;
    if (p.list.length) store('unsu_list', getList().concat(p.list.map(function(x){ return Object.assign({}, x, { saved:x.saved || Date.now() }); })));
    if (p.box.length) store('unsu_numbox', getBox().concat(p.box).sort(function(a, b){ return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; }));
    if (p.dreams.length) store('unsu_dreams', getDreams().concat(p.dreams).sort(function(a, b){ return (b.at || 0) - (a.at || 0); }));
    var ny = store('unsu_ny_open') || {}, nyCh = false;   /* 광고로 연 신년운세(엽전 아님)만 따라온다 */
    Object.keys(p.ny).forEach(function(id){ var to = p.idMap[id]; if (to && !ny[to]){ ny[to] = p.ny[id]; nyCh = true; } });
    if (nyCh) store('unsu_ny_open', ny);
    try { localStorage.removeItem('wj_merge'); } catch(e){}
    updateSegCount(); pushSnapshot(true);
    return p.n;
  }
  function openMergeSheet(after){
    var p = mergePlan(); if (!p || !p.n){ if (after) after(); return; }
    var cell = function(n, l){ return '<div' + (n ? '' : ' class="zero"') + '><b>' + n + '</b><small>' + l + '</small></div>'; };
    var done = false, fin = function(){ if (done) return; done = true; if (after) setTimeout(after, 280); };
    openSheet('<div class="sheet-fig">' + uniImg('u-wave') + '</div><h3 id="sheetTitle">이 기기에 저장된 기록이 있어요</h3>' +
      '<p class="body-text" style="margin:-6px 0 14px">로그인 전에 이 기기에서 만든 기록이에요. 계정에 추가하면 다른 기기에서도 볼 수 있어요.</p>' +
      '<div class="merge-sum">' + cell(p.list.length, '사주') + cell(p.box.length, '행운 부적') + cell(p.dreams.length, '꿈 기록') + '</div>' +
      '<div class="view" style="gap:8px"><button class="btn-primary" id="mgGo">계정에 추가하기</button><button class="btn-ghost" id="mgLater">지금은 하지 않기</button></div>' +
      '<p class="helper" style="text-align:center;margin-top:12px">계정에 이미 있는 기록은 덮어쓰지 않아요. 겹치는 건 빼고 추가해요.<br>엽전·구매 내역은 계정에 있는 기록이 기준이에요.</p>' +
      '<button class="text-btn" id="mgDrop" style="display:block;margin:4px auto 0">가져오지 않고 지우기</button>');
    $('mgGo').onclick = function(){ var n = applyMerge(); closeSheet(); toast('이 기기 기록 ' + n + '개를 계정에 추가했어요'); if (currentView === 'box') renderBox(); else if (currentView === 'today') renderToday(); fin(); };
    $('mgLater').onclick = function(){ closeSheet(); toast('보관함 맨 위에서 언제든 가져올 수 있어요'); if (currentView === 'box') renderBox(); fin(); };
    $('mgDrop').onclick = function(){ try { localStorage.removeItem('wj_merge'); } catch(e){} closeSheet(); toast('이 기기 기록을 지웠어요'); if (currentView === 'box') renderBox(); fin(); };
  }
  function resumeAfterLogin(rs){
    if (!rs || !rs.k) return;
    var e = rs.id ? getList().filter(function(x){ return x.id === rs.id; })[0] : null;
    try {
      if (rs.k === 'coin') openCoinSheet();
      else if (rs.k === 'cat' && e && CATS[rs.cat]) openCatLock(e, compute(e), rs.cat);
      else if (rs.k === 'tk' && e && TAEKIL.PURPOSES[rs.p]) openTaekil(e, compute(e), rs.p);
    } catch(err){}
  }
  /* 단건 결제가 끝난 콘텐츠를 연다. 서버 원장에 'spend:<item>' 구매 기록이 있어서 spendCoins 가 dup 으로 차감 없이 통과한다 */
  function resumeBuy(rs){
    if (!rs || !rs.item) return;
    var e = rs.id ? getList().filter(function(x){ return x.id === rs.id; })[0] : null;
    var open = function(fn){ spendCoins(rs.cost, rs.why, rs.item, fn); };
    try {
      if (rs.k === 'cat' && e && CATS[rs.cat]) open(function(){ setCatPaid(rs.cat); openCat(e, compute(e), rs.cat); });
      else if (rs.k === 'tk' && e && TAEKIL.PURPOSES[rs.p]) open(function(){ setTkOpen(e, rs.p); openTaekil(e, compute(e), rs.p); });
      else if (rs.k === 'dream' && rs.text) open(function(){ go('dream'); setTimeout(function(){ dreamRun(rs.text, true, null, true); }, 300); });
      else if (rs.k === 'pay' && product(rs.pid)) open(function(){ if (!owns(rs.pid) || rs.pid === 'gh') addOrder(rs.pid, { ghKey:rs.ghKey || null }); toast(product(rs.pid).name + ' 열렸어요 · 다시 누르면 바로 보여요'); });
      else toast('결제한 콘텐츠는 다시 누르면 바로 열려요');
    } catch(err){}
  }
  /* 엽전이 모자랄 때: 그 콘텐츠 하나만 원화로 바로 결제 (엽전 충전은 팔지 않는다 — 2026-11-21)
     o: { cost, why, item, rs } — item 은 서버 구매 기록 키, rs 는 결제 뒤 다시 열 곳 */
  function openBuySheet(o){
    if (isGuest()){ openLoginSheet('로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요.'); return; }
    var k = o.item.split(':')[0], w = wonOf(k), coins = getCoins(), ready = payReady();
    o.rs = Object.assign({ item:o.item, cost:o.cost, why:o.why }, o.rs || {});
    var nm = (SRV.cfg && SRV.cfg.wonNames && SRV.cfg.wonNames[k]) || o.why;
    openSheet('<div class="buy-sheet"><div class="short-fig">' + uniImg('u-money') + '</div><h3 id="sheetTitle">' + esc(nm) + '</h3>' +
      '<p class="body-text">엽전이 ' + Math.max(1, o.cost - coins).toLocaleString() + '닢 모자라요 (보유 ' + coins.toLocaleString() + '닢).<br>이 콘텐츠만 바로 결제하면 지금 열려요.</p>' +
      '<div class="pay-price"><b>' + w.toLocaleString() + '원</b><small> · 엽전 ' + o.cost.toLocaleString() + '닢 대신</small></div>' +
      '<button class="btn-primary btn-block" id="buyGo"' + (ready || NS ? '' : ' disabled') + '>' + (ready ? buyLabel(k) : NS ? '예시 모드에서는 결제할 수 없어요' : '결제 준비 중 · ' + w.toLocaleString() + '원') + '</button>' +
      '<p class="helper" style="text-align:center;margin:8px 0 14px">' + (ready ? (SRV.cfg.pay.test ? '<b class="pay-test">테스트 결제</b> 실제로 돈이 나가지 않아요 · ' : '') + '결제 즉시 열리는 디지털 콘텐츠예요 · 결제하면 <button class="link-btn" data-doc="refund">환불 정책</button>에 동의하는 것으로 봐요' : '카드 결제를 연결하고 있어요. 그동안은 출석·우니 꾹 뽑기로 엽전을 모아 열 수 있어요.') + '</p>' +
      passLinkHTML() +
      '<button class="btn-ghost btn-block" id="buyEarn" style="margin-top:8px">엽전 무료로 모으기</button><button class="text-btn" data-close>닫기</button></div>');
    $('buyGo').onclick = function(){ if (NS){ toast('예시 모드에서는 결제할 수 없어요'); return; } if (!payReady()) return; startCharge({ item:o.item, rs:o.rs }, this); };
    $('buyEarn').onclick = function(){ openCoinSheet(); };
  }
  /* 토스페이먼츠 결제창 (SDK v2, API 개별 연동 키) */
  var tossLoad = null;
  function loadToss(){
    if (window.TossPayments) return Promise.resolve();
    return tossLoad || (tossLoad = new Promise(function(ok, no){ var sc = document.createElement('script'); sc.src = 'https://js.tosspayments.com/v2/standard'; sc.onload = ok; sc.onerror = function(){ tossLoad = null; no(); }; document.head.appendChild(sc); }));
  }
  /* 포트원 V2 결제창 (PC는 응답 객체, 모바일은 redirectUrl 로 복귀) */
  var portoneLoad = null;
  function loadPortone(){
    if (window.PortOne) return Promise.resolve();
    return portoneLoad || (portoneLoad = new Promise(function(ok, no){ var sc = document.createElement('script'); sc.src = 'https://cdn.portone.io/v2/browser-sdk.js'; sc.onload = ok; sc.onerror = function(){ portoneLoad = null; no(); }; document.head.appendChild(sc); }));
  }
  /* k: { id } 패스·엽전 패키지 / { item, rs } 콘텐츠 하나 단건. rs = 결제 뒤 다시 열 곳(resumeBuy) */
  function startCharge(k, btn){
    var label = btn.innerHTML; btn.disabled = true; btn.textContent = '결제창 여는 중…';
    var reset = function(){ btn.disabled = false; btn.innerHTML = label; };
    var pp = SRV.cfg.pay.provider === 'portone';
    Promise.all([api('/api/pay?a=order', { method:'POST', body:k.item ? { item:k.item } : { pack:k.id } }), pp ? loadPortone() : loadToss()]).then(function(a){
      var o = a[0];
      if (!o.ok && o.err === 'owned' && k.item){ closeSheet(); resumeBuy(k.rs); return; }   /* 이미 결제한 콘텐츠 → 그냥 연다 */
      if (!o.ok) throw o;
      try { sessionStorage.setItem('wj_back', k.item ? JSON.stringify({ tab:currentView || 'today', k:'buy', rs:k.rs }) : 'coin'); } catch(e){}
      if (pp){
        var c = SRV.cfg.pay;
        return window.PortOne.requestPayment({ storeId:c.storeId, channelKey:c.channelKey, paymentId:o.orderId, orderName:o.orderName,
          totalAmount:o.amount, currency:'CURRENCY_KRW', payMethod:'CARD', redirectUrl:location.origin + '/pay/success' }).then(function(r){
          if (r && r.code){ if (/CANCEL/i.test(r.code + (r.message || ''))) return; var er = new Error(r.message || r.code); throw er; }
          if (k.item){   /* PC 단건: 페이지를 떠나지 않고 서버 확인 → 그 자리에서 연다 */
            try { sessionStorage.removeItem('wj_back'); } catch(e){}
            return api('/pay/success?json=1&paymentId=' + encodeURIComponent(o.orderId)).then(function(c){
              if (!c.ok){ toast('결제가 완료되지 않았어요' + (c.code ? ' (' + c.code + ')' : '') + '. 다시 시도해 주세요'); return; }
              closeSheet(); toast('결제가 완료됐어요'); setTimeout(function(){ resumeBuy(k.rs); }, 300);
            });
          }
          location.href = '/pay/success?paymentId=' + encodeURIComponent(o.orderId);   /* PC: 응답을 받으면 서버 확인 페이지로 */
        });
      }
      var pay = window.TossPayments(SRV.cfg.pay.clientKey).payment({ customerKey:o.customerKey });
      return pay.requestPayment({ method:'CARD', amount:{ currency:'KRW', value:o.amount }, orderId:o.orderId, orderName:o.orderName,
        successUrl:location.origin + '/pay/success', failUrl:location.origin + '/?pay=fail', card:{ flowMode:'DEFAULT' } });
    }).then(reset, function(e){
      reset();
      if (e && e.code === 'USER_CANCEL') return;
      toast(e && e.err === 'login' ? '로그인이 풀렸어요. 다시 로그인해 주세요' : '결제창을 열지 못했어요. 잠시 뒤 다시 시도해 주세요');
    });
  }
  function srvInit(){
    var q = {}; try { new URLSearchParams(location.search).forEach(function(v, k){ q[k] = v; }); } catch(e){}
    var back = null, rs = null; try { back = sessionStorage.getItem('wj_back'); sessionStorage.removeItem('wj_back'); } catch(e){}
    if (back && back.charAt(0) === '{'){ try { rs = JSON.parse(back); back = rs.tab || 'today'; } catch(e){ back = null; } }
    if (q.login || q.pay){ try { history.replaceState(null, '', location.pathname + location.hash); } catch(e){} }
    if (NS || !/^https?:$/.test(location.protocol)) return;
    api('/api/me').then(function(r){
      if (!r.cfg || !r.cfg.on) return;
      SRV.cfg = r.cfg;
      var a = store('unsu_auth');
      if (r.user){
        var lp = (q.login === 'kakao' || q.login === 'google') ? q.login : '';
        var hadLocal = !!getMe();
        var fromServer = applySrvUser(r.user, !!lp);
        updateSegCount(); updateTopbar();
        var carried = lp && hadLocal && !fromServer;   /* 빈 계정 + 이 기기 기록 → 그대로 계정에 올렸다 */
        if (lp) toast(q['new'] ? PROV[lp] + '로 가입했어요 · ' + (carried ? '이 기기 기록도 계정에 옮겼어요' : '가입 선물 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 받았어요') : fromServer ? '다시 오셨네요! 계정의 기록을 불러왔어요' : carried ? '로그인했어요 · 이 기기 기록을 계정에 저장했어요' : PROV[lp] + ' 계정으로 로그인했어요');
        if (lp && q['new']) setTimeout(function(){ coinBurst(SIGNUP_COINS, '가입 환영 선물'); }, 500);   /* 처음 가입하면 엽전이 뾰롱 */
        var buyBack = rs && rs.k === 'buy';
        if (q.pay === 'ok') toast(q.buy ? '결제가 완료됐어요' : q.pass ? '우니 패스가 시작됐어요 · ' + passEndStr() + '까지 전부 열려요' : '엽전 ' + (+q.n || 0).toLocaleString() + '닢을 충전했어요');
        if (fromServer || q.login) { if (currentView === 'today' || !currentView) renderToday(); }
        if (buyBack && q.pay){   /* 단건 결제에서 돌아옴: 보던 탭으로 → 산 콘텐츠를 연다(실패면 안내만) */
          if (back !== 'today' || currentView !== 'today') go(back === 'my' ? 'today' : back);
          if (q.pay === 'ok') setTimeout(function(){ resumeBuy(rs.rs); }, 450);
          else toast('결제가 완료되지 않았어요' + (q.code && q.code !== 'PAY_PROCESS_CANCELED' && q.code !== 'USER_CANCEL' ? ' (' + q.code + ')' : '') + '. 다시 시도해 주세요');
        }
        else if (back === 'coin' || q.pay) setTimeout(function(){ openCoinSheet(q.pay === 'fail' ? '결제가 완료되지 않았어요' + (q.code && q.code !== 'PAY_PROCESS_CANCELED' && q.code !== 'USER_CANCEL' ? ' (' + q.code + ')' : '') + '. 다시 시도해 주세요.' : undefined); }, 400);
        else if (back && q.login){
          if (back !== 'today' || currentView !== 'today') go(back === 'my' ? 'today' : back);
          var after = function(){ resumeAfterLogin(rs); };
          if (lp && pendingMergeCount()) setTimeout(function(){ openMergeSheet(after); }, 700); else setTimeout(after, 450);
        }
        else if (lp && pendingMergeCount()) setTimeout(function(){ openMergeSheet(); }, 700);
      } else {
        if (a && a.srv){ store('unsu_auth', null); clearData(); updateSegCount(); updateTopbar(); renderToday(); toast('로그인이 만료됐어요. 다시 로그인하면 기록이 돌아와요'); }
        else if (a && !a.srv){ store('unsu_auth', null); store('unsu_account', null); updateTopbar(); }   /* 미리보기 시절 가짜 로그인 정리 — 기기 데이터는 그대로 */
        if (q.login === 'cancel') toast('로그인을 취소했어요');
        else if (q.login === 'error') toast('로그인 중 문제가 생겼어요. 다시 시도해 주세요');
        if (back && (q.login === 'cancel' || q.login === 'error')){   /* 취소해도 보던 화면 그대로 */
          if (back !== 'today') go(back === 'my' ? 'today' : back);
          setTimeout(function(){ resumeAfterLogin(rs); }, 450);
        }
      }
    }).catch(function(){});
  }
  function getCoins(){ var c = store('unsu_coin'); return typeof c === 'number' ? c : 0; }
  function renderCoin(bump){
    $('coinChip').classList.toggle('guest', isGuest());
    $('coinVal').textContent = isGuest() ? SIGNUP_COINS.toLocaleString() + '닢 받기' : getCoins();
    if (bump && !reduceMotion){ var c = $('coinChip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }
  }
  function addCoins(n, why){
    if (isGuest()) return;   /* 로그인하지 않으면 엽전을 쌓지 않는다 */
    if (srvUser()){   /* 실제 계정: 화면은 바로 바꾸고, 서버가 정한 잔액으로 맞춘다(하루 한도·잔액 검사는 서버가 한다) */
      var kind = coinKind(n, why);
      if (!kind || kind === 'spend') return;   /* 사용은 spendCoins 로만(서버가 가격 확인) */
      api('/api/coins', { method:'POST', body:{ kind:kind, n:n, why:why, key:Date.now().toString(36) + Math.random().toString(36).slice(2, 8) } }).then(function(r){
        if (typeof r.bal === 'number') setSrvCoins(r);
        if (!r.ok && r.err === 'limit' && n > 0) toast('오늘은 이미 받았어요');
      }).catch(function(){});
    }
    store('unsu_coin', Math.max(0, getCoins() + n));
    logCoin(n, why);
    renderCoin(true);
    if (n > 0) setTimeout(function(){ coinBurst(n, why); }, 250);
  }
  function logCoin(n, why){
    var log = store('unsu_coinlog'); if (!Array.isArray(log)) log = [];
    log.unshift({ t:Date.now(), n:n, why:why }); if (log.length > 50) log.length = 50;
    store('unsu_coinlog', log);
  }
  /* 엽전으로 열기. 로그인 계정이면 서버가 가격표로 확인·차감한 뒤에만 onOk 로 연다.
     item: '상품:대상' — 서버 구매 기록 키. 같은 item 은 한 번만 차감된다(새로고침·기기 변경 후 다시 눌러도 이중 차감 없음) */
  function spendCoins(cost, why, item, onOk, rs){
    if (NS){ toast('예시 모드라 엽전 없이 열었어요'); onOk(); return; }
    if (!srvUser()){ addCoins(-cost, why); onOk(); return; }
    if (SRV.spending) return;
    SRV.spending = true;
    api('/api/coins', { method:'POST', body:{ kind:'spend', n:-cost, why:why, item:item } }).then(function(r){
      SRV.spending = false;
      if (r.ok){
        setSrvCoins(r);
        if (r.pass){ if (!r.dup) logCoin(0, why + ' · 패스'); }
        else if (!r.dup){ logCoin(-cost, why); renderCoin(true); }
        onOk(); return;
      }
      if (typeof r.bal === 'number') setSrvCoins(r);
      if (r.err === 'short'){ if (rs && wonOf(item.split(':')[0])) openBuySheet({ cost:cost, why:why, item:item, rs:rs }); else openCoinSheet('엽전이 ' + Math.max(1, cost - getCoins()).toLocaleString() + '닢 더 필요해요.'); }
      else if (r.err === 'login') toast('로그인이 풀렸어요. 다시 로그인해 주세요');
      else if (r.err === 'price') toast('가격 정보가 바뀌었어요. 새로고침한 뒤 다시 열어 주세요');
      else toast('엽전을 쓰지 못했어요. 잠시 뒤 다시 시도해 주세요');
    }, function(){ SRV.spending = false; toast('연결이 불안정해요. 잠시 뒤 다시 시도해 주세요'); });
  }
  /* 충전한(유료) 엽전 / 받은(무료) 엽전. 기기 저장 모드에서는 충전이 없으니 전부 받은 엽전 */
  function coinSplit(){
    if (srvUser() && SRV.split) return SRV.split;
    return { paid:0, free:getCoins() };
  }

  /* ---- 엽전 획득 연출: 금빛 엽전이 튀어 올라 상단 엽전 칸으로 날아간다 ---- */
  var COIN_FX_SVG = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="cfG" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff3c4"/><stop offset=".45" stop-color="#f0c35b"/><stop offset="1" stop-color="#a8721a"/></radialGradient></defs>' +
    '<circle cx="32" cy="32" r="30" fill="url(#cfG)" stroke="#8a5a12" stroke-width="2"/><circle cx="32" cy="32" r="24" fill="none" stroke="rgba(120,74,10,.55)" stroke-width="2"/>' +
    '<rect x="23" y="23" width="18" height="18" rx="2" fill="#1a1245" stroke="#8a5a12" stroke-width="2"/><path d="M14 20a22 22 0 0 1 14-9" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="3" stroke-linecap="round"/></svg>';
  var cfxQ = [], cfxOn = false;
  function coinBurst(n, why){
    if (cfxOn){ var last = cfxQ[cfxQ.length - 1]; if (last && n < 100 && last.n < 100){ last.n += n; last.why = '엽전 선물'; } else cfxQ.push({ n:n, why:why }); return; }
    cfxOn = true;
    var next = function(){ cfxOn = false; var q = cfxQ.shift(); if (q) coinBurst(q.n, q.why); };
    var big = n >= 100, chip = $('setBtn'), cr = chip && !chip.hidden ? chip.getBoundingClientRect() : { left:window.innerWidth - 120, top:24, width:90, height:36 };
    var tx = cr.left + cr.width / 2, ty = cr.top + cr.height / 2;
    var el = document.createElement('div'); el.className = 'cfx' + (big ? ' big' : ''); el.setAttribute('role', 'status');
    var label = '+' + n.toLocaleString() + ' 엽전';
    el.innerHTML = (big ? '<div class="cfx-glow"></div><div class="cfx-main">' + COIN_FX_SVG + '</div>' : '') +
      '<div class="cfx-txt"><b id="cfxNum">' + (reduceMotion ? label : '+0') + '</b><small>' + esc(why || '') + '</small></div>';
    document.body.appendChild(el);
    var life = big ? 2600 : 1500;
    if (reduceMotion){ setTimeout(function(){ el.remove(); next(); }, big ? 1600 : 1200); return; }
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
    var gone = false, end = function(){ if (gone) return; gone = true; el.remove(); next(); };
    setTimeout(function(){ el.classList.add('out'); setTimeout(end, 350); }, life);
    if (big) el.onclick = end;
  }
  function adCount(){ var a = store('unsu_ad'); return a && a.d === todayStr() ? a.n : 0; }
  function useAd(){ store('unsu_ad', { d:todayStr(), n:adCount() + 1 }); }

  /* ---- bottom sheet ---- */
  var sheetReturn = null;
  function openSheet(html){
    sheetReturn = document.activeElement;
    $('sheetBody').classList.remove('st-sheet');
    $('sheet').style.transform = ''; $('sheet').style.transition = ''; $('sheetBackdrop').style.opacity = '';
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
  /* 시트를 손가락으로 아래로 끌어내려 닫기 (맨 위에서 아래로 당기거나, 손잡이 영역을 끌면 동작) */
  (function(){
    var sh = $('sheet'), bd = $('sheetBackdrop'), y0 = 0, t0 = 0, dy = 0, drag = false, armed = false, lastY = 0, lastT = 0, vel = 0;
    function setY(v){ sh.style.transform = v ? 'translateY(' + v + 'px)' : ''; bd.style.opacity = v ? String(Math.max(0.15, 1 - v / 420)) : ''; }
    sh.addEventListener('touchstart', function(e){
      if (e.touches.length !== 1 || $('sheetWrap').hidden) return;
      var t = e.touches[0], r = sh.getBoundingClientRect();
      var onGrip = t.clientY - r.top < 56, inField = e.target.closest && e.target.closest('input,textarea,select,[contenteditable]');
      armed = !inField && (onGrip || sh.scrollTop <= 0); drag = false; dy = 0; vel = 0;
      y0 = lastY = t.clientY; t0 = lastT = Date.now();
    }, { passive:true });
    sh.addEventListener('touchmove', function(e){
      if (!armed) return;
      var y = e.touches[0].clientY, d = y - y0;
      if (!drag){
        if (d > 6 && (sh.scrollTop <= 0 || y0 - sh.getBoundingClientRect().top < 56)){ drag = true; sh.style.transition = 'none'; }
        else if (d < -6 || sh.scrollTop > 0){ armed = false; return; }
        else return;
      }
      if (e.cancelable) e.preventDefault();
      dy = Math.max(0, d);
      var now = Date.now(); if (now - lastT > 0) vel = (y - lastY) / (now - lastT); lastY = y; lastT = now;
      setY(dy);
    }, { passive:false });
    function end(){
      if (!drag){ armed = false; return; }
      drag = false; armed = false;
      sh.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1)';
      if (dy > 110 || vel > 0.6){
        setY(sh.offsetHeight + 40);
        setTimeout(function(){ closeSheet(); sh.style.transition = ''; setY(0); }, 220);
      } else { setY(0); setTimeout(function(){ sh.style.transition = ''; }, 260); }
    }
    sh.addEventListener('touchend', end); sh.addEventListener('touchcancel', end);
  })();
  $('sheetBackdrop').onclick = closeSheet;
  $('sheet').addEventListener('click', function(e){ if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('[data-pass]')) openCoinSheet(); });
  /* 잠금 화면마다 한 줄: 엽전 대신 우니 패스로 전부 열기 */
  function passLinkHTML(){ return passActive() || isGuest() || NS ? '' : '<button type="button" class="pass-link" data-pass>광고 없이 전부 열기 · ' + PASS.name + ' ' + PASS.p.toLocaleString() + '원 ›</button>'; }
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape'){ closeSheet(); } });

  /* ---- 보상형 광고: 끝까지 봐야 보상 ----
     지금은 목업(5초). 실제 광고는 Google Ad Manager '보상형 웹 광고'(rewardedSlotReady → rewardedSlotGranted) 승인 뒤
     이 함수 안만 바꾸면 신년운세·엽전 보상이 그대로 이어진다. msg: 시작 안내 문구 */
  var adTimer = 0, adDone = null, adFinished = false;
  function playAd(onReward, msg){
    adDone = onReward; adFinished = false;
    var total = 5, left = total, ring = $('adRing');
    $('adOverlay').hidden = false; document.body.style.overflow = 'hidden';
    $('adClaim').disabled = true; $('adSec').textContent = left;
    $('adMsg').textContent = msg || '끝까지 보면 보상을 받을 수 있어요';
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

  $('coinChip').onclick = function(){ openCoinSheet(); };
  $('fsBtn').onclick = openFsSheet;
  /* 엽전 충전소 — 유료 콘텐츠는 전부 여기서 충전한 엽전으로 연다(2026-11-15). 패키지 가격은 제안값.
     PAY_READY(토스 연결) 전에는 결제 버튼을 '준비 중'으로 잠근다 — GPT 검토 P0-1: 판매 전 버튼이 살아 보이면 안 됨 */
  var COIN_PACKS = [
    { id:'p300', n:300, b:0, p:3300 },
    { id:'p1000', n:1000, b:100, p:9900, hot:true },   /* '추천' 표시 — 실제 판매 집계 전이라 '인기 1위' 같은 말은 쓰지 않는다 */
    { id:'p2000', n:2000, b:300, p:18900, tag:'+15%' },
    { id:'p5000', n:5000, b:1000, p:44000, tag:'최대 혜택' }
  ];
  var coinPick = 'p1000';
  /* 충전한 엽전(환불 대상) / 받은 엽전(가입·출석 선물) 나눠 보기 — 환불 정책과 같은 말로 */
  function coinSplitHTML(){
    var c = coinSplit();
    return '<div class="cs-split"><div><small>충전한 엽전</small><b>' + c.paid.toLocaleString() + '닢</b><p>환불 대상 · 충전일부터 5년</p></div>' +
      '<div><small>받은 엽전</small><b>' + c.free.toLocaleString() + '닢</b><p>가입·출석 선물 · 먼저 써요</p></div></div>' +
      '<p class="cs-split-note">1닢은 약 10원이에요(충전 패키지 기준). 쓸 때는 받은 엽전부터 빠지고, 남은 충전 엽전은 <button class="link-btn" data-doc="refund">환불 정책</button>에 따라 돌려받을 수 있어요. <button class="link-btn" id="csLogLink">사용 내역</button></p>';
  }
  /* 우니 패스 카드 — 충전소 맨 위. 원화로 바로 결제(엽전 충전을 거치지 않음) */
  function passCardHTML(){
    if (passActive()) return '<div class="pass-card on"><div class="pc-top"><span class="pc-badge">이용 중</span><b>' + PASS.name + '</b></div>' +
      '<p class="pc-sub">' + passEndStr() + '까지 엽전 없이 전부 열고, 광고 없이 봐요.</p></div>';
    var full = COST.cat * 4 + COST.dream + COST.gh + COST.ez + COST.tk;
    return '<div class="pass-card"><div class="pc-top"><span class="pc-badge">광고 없이 전체</span><b>' + PASS.name + '</b><span class="pc-price">' + PASS.p.toLocaleString() + '원</span></div>' +
      '<ul class="pc-list"><li>분야별 운세·궁합 상세·쉬운 풀이·중요한 날 잡기를 엽전 없이</li><li>꿈 풀이 리포트 하루 ' + PASS.dream + '번</li><li>신년운세 전체와 결과 화면, 광고 없이</li></ul>' +
      '<p class="pc-sub">' + (coinSale() ? '한 번씩 다 열면 ' + full.toLocaleString() + '닢(약 ' + (Math.round(full * 9 / 100) * 100).toLocaleString() + '원)이에요. ' : '하나씩 결제하면 분야별 운세 ' + wonOf('cat').toLocaleString() + '원, 중요한 날 잡기 ' + wonOf('tk').toLocaleString() + '원이에요. ') + '자동 결제 없이 ' + PASS.days + '일만 써요.</p>' +
      '<button class="btn-primary btn-block" id="csPass"' + (payReady() || NS ? '' : ' disabled') + '>' + (payReady() ? PASS.p.toLocaleString() + '원 결제하고 바로 쓰기' : NS ? '예시 모드에서는 결제할 수 없어요' : '결제 준비 중') + '</button></div>';
  }
  function openCoinSheet(reason){
    if (isGuest()){ openLoginSheet('처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요. 엽전은 출석·우니 꾹 뽑기로 더 모으고, 분야별 운세·꿈 해몽·번호 한 줄 더에 쓸 수 있어요.', { k:'coin' }); return; }
    var log = store('unsu_coinlog'); if (!Array.isArray(log)) log = [];
    var a = getAtt(), doneToday = !!a.days[todayStr()], left = 7 - (streakOf(a) % 7), used = adCount();
    var won = function(n){ return n.toLocaleString() + '원'; };
    var sale = coinSale(), split = coinSplit();
    var useRow = function(cls, name, k, small){ return '<div' + (cls ? ' class="' + cls + '"' : '') + '><span>' + name + '</span><b>' + COST[k] + '닢</b><small>' + small + (wonOf(k) && !sale ? ' · 또는 ' + wonOf(k).toLocaleString() + '원' : '') + '</small></div>'; };
    var h = '<div class="sheet-fig">' + uniImg('u-money') + '</div><div class="cs-head"><h3 id="sheetTitle">' + (sale ? '엽전 충전소' : '엽전 주머니') + '</h3><div class="cs-bal">' + COIN_SVG + '<span>내 엽전</span><b>' + getCoins().toLocaleString() + '닢</b></div></div>' +
      (typeof reason === 'string' ? '<p class="cs-reason">' + reason + '</p>' : '') +
      (sale || split.paid > 0 ? coinSplitHTML() : '<p class="cs-split-note">엽전은 출석·가입·우니 선물로 모으는 <b>무료 포인트</b>예요. 현금으로 바꾸거나 따로 사고팔 수 없어요. 엽전이 모자라면 그 콘텐츠 하나만 원화로 바로 결제할 수 있어요.</p>') + passCardHTML() +
      (!sale ? '' : '<div class="eyebrow"><span class="line"></span>엽전 충전<span class="line right"></span></div>' +
      '<div class="cs-packs" role="radiogroup" aria-label="엽전 패키지">' + COIN_PACKS.map(function(k){
        return '<button type="button" role="radio" class="cs-pack' + (k.hot ? ' hot' : '') + (k.id === coinPick ? ' on' : '') + '" data-pack="' + k.id + '" aria-checked="' + (k.id === coinPick) + '">' +
          (k.hot ? '<span class="cs-badge">추천</span>' : k.tag ? '<span class="cs-badge sub">' + k.tag + '</span>' : '') +
          '<span class="cs-coin">' + COIN_SVG + '</span><span class="cs-n"><b>' + k.n.toLocaleString() + '닢</b>' + (k.b ? '<small>+' + k.b.toLocaleString() + ' 보너스</small>' : '<small>기본</small>') + '</span>' +
          '<span class="cs-p">' + won(k.p) + '<small>1닢 ' + (k.p / (k.n + k.b)).toFixed(1) + '원</small></span></button>';
      }).join('') + '</div>' +
      '<button class="btn-primary btn-block" id="csBuy"></button>' +
      '<p class="helper" style="text-align:center;margin:8px 0 18px">' + (payReady() ? (SRV.cfg.pay.test ? '<b class="pay-test">테스트 결제</b> 실제로 돈이 나가지 않아요 · ' : '') + '안전한 PG사 결제창으로 결제돼요 · 결제하면 <button class="link-btn" data-doc="refund">환불 정책</button>에 동의하는 것으로 봐요. 7일 안에 쓰지 않은 충전은 전액 환불돼요' : '카드 결제를 연결하고 있어요. 열리기 전까지는 아래 방법으로 무료로 모을 수 있어요.') + '</p>') +
      '<div class="eyebrow"><span class="line"></span>엽전으로 열 수 있어요<span class="line right"></span></div><div class="cs-use">' +
      useRow('hot', '꿈 풀이 리포트', 'dream', '꿈 하나 · 길흉 판정과 오늘의 처방') + useRow('', '분야별 운세', 'cat', '분야 하나 · 오늘 하루') +
      useRow('', '중요한 날 잡기', 'tk', '목적 하나 · 1년 달력') + useRow('', '궁합 상세', 'gh', '두 사람 · 계속 보기') +
      useRow('', '쉬운 사주 풀이', 'ez', '저장한 사람 모두') + '</div>' +
      '<div class="eyebrow"><span class="line"></span>무료로 모으기<span class="line right"></span></div><div class="tip-list" style="margin:12px 0 18px">' +
      '<div class="earn-row"><div><div class="t">매일 출석 +10</div><div class="s">오늘의 운세를 열면 자동으로 출석돼요</div></div><span class="chip" style="color:' + (doneToday ? '#8fdcaa' : 'var(--text-helper)') + '">' + (doneToday ? '오늘 완료' : '대기') + '</span></div>' +
      '<div class="earn-row"><div><div class="t">7일 연속 보너스 +30</div><div class="s">' + (left === 7 ? '이번 주기 보너스를 받았어요' : '앞으로 ' + left + '일 더 출석하면 받아요') + '</div></div><button class="btn-ghost" id="csCal" style="padding:9px 14px;font-size:calc(12.5px*var(--fs))">캘린더</button></div>' +
      '<div class="earn-row"><div><div class="t">우니 꾹 뽑기 +' + GIFT_COIN + '</div><div class="s">매일 한 번, 가끔 엽전이 나와요</div></div><button class="btn-ghost" id="csPeek" style="padding:9px 14px;font-size:calc(12.5px*var(--fs))">하러 가기</button></div>' +
      (!adCoinOn() ? '' : '<div class="earn-row"><div><div class="t">광고 보고 +' + AD_REWARD + '</div><div class="s">하루 ' + AD_LIMIT + '번 · 오늘 ' + used + '/' + AD_LIMIT + '</div></div><button class="btn-soft" id="csAd" style="padding:9px 14px;font-size:calc(12.5px*var(--fs))"' + (used >= AD_LIMIT ? ' disabled' : '') + '>' + (used >= AD_LIMIT ? '내일 다시' : '광고 보기') + '</button></div>') +
      '</div><div class="eyebrow"><span class="line"></span>최근 내역<span class="line right"></span></div><div class="ledger">' +
      (log.length ? log.map(function(x, i){ var d = new Date(x.t); return '<div' + (i >= 8 ? ' class="more" hidden' : '') + '><span>' + (d.getMonth()+1) + '.' + d.getDate() + ' ' + esc(x.why) + (x.p ? ' <small class="lg-paid">충전 ' + (x.p > 0 ? '+' : '') + x.p + '</small>' : '') + '</span><b class="' + (x.n < 0 ? 'minus' : '') + '">' + (x.n > 0 ? '+' : '') + x.n + '</b></div>'; }).join('') : '<div><span>아직 내역이 없어요</span></div>') +
      '</div>' + (log.length > 8 ? '<button class="text-btn" id="csLogMore" style="margin-top:4px">사용 내역 전체 보기 (' + log.length + '건)</button>' : '') +
      '<button class="btn-ghost btn-block" data-close>닫기</button>';
    openSheet(h);
    if ($('csPass')) $('csPass').onclick = function(){ if (NS){ toast('예시 모드에서는 결제할 수 없어요'); return; } if (!payReady()) return; startCharge({ id:PASS.id }, this); };
    if ($('csLogMore')) $('csLogMore').onclick = function(){ $('sheetBody').querySelectorAll('.ledger .more').forEach(function(x){ x.hidden = false; }); this.remove(); };
    if ($('csLogLink')) $('csLogLink').onclick = function(){ var l = $('sheetBody').querySelector('.ledger'); if ($('csLogMore')) $('csLogMore').click(); if (l) l.scrollIntoView({ block:'start', behavior: reduceMotion ? 'auto' : 'smooth' }); };
    var setBuy = function(){ if (!$('csBuy')) return; var k = COIN_PACKS.filter(function(x){ return x.id === coinPick; })[0]; $('csBuy').disabled = !payReady() && !NS; $('csBuy').innerHTML = (payReady() || NS) ? (k.n + k.b).toLocaleString() + '닢 · ' + won(k.p) + ' 충전하기' : '결제 준비 중 · ' + (k.n + k.b).toLocaleString() + '닢 ' + won(k.p); };
    setBuy();
    $('sheetBody').querySelectorAll('[data-pack]').forEach(function(btn){
      btn.onclick = function(){
        coinPick = btn.dataset.pack;
        $('sheetBody').querySelectorAll('[data-pack]').forEach(function(x){ var on = x === btn; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
        setBuy();
      };
    });
    if ($('csBuy')) $('csBuy').onclick = function(){
      var k = COIN_PACKS.filter(function(x){ return x.id === coinPick; })[0];
      if (NS){ addCoins(k.n + k.b, '충전(예시)'); toast('예시 모드라 결제 없이 ' + (k.n + k.b).toLocaleString() + '닢을 채웠어요'); openCoinSheet(); return; }
      if (!payReady()) return;
      startCharge(k, this);
    };
    if ($('csAd')) $('csAd').onclick = function(){
      if (adCount() >= AD_LIMIT) return;
      closeSheet();
      playAd(function(){ useAd(); addCoins(AD_REWARD, '광고 보상'); toast('엽전 +' + AD_REWARD + '닢을 받았어요'); openCoinSheet(); });
    };
    $('csPeek').onclick = function(){ closeSheet(); go('today'); setTimeout(function(){ var pc = $('peekCard'); if (pc) pc.scrollIntoView({ block:'center', behavior: reduceMotion ? 'auto' : 'smooth' }); }, 350); };
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
    openSheet('<div class="sheet-fig">' + uniImg('u-attend') + '</div><h3 id="sheetTitle">운세 캘린더</h3><p class="helper" style="margin:-10px 0 16px">출석한 날의 운세는 언제든 다시 볼 수 있어요. 매일 +10닢, 7일 연속이면 +30닢.</p><div id="calWrap" class="view" style="gap:14px">' + calendarHTML() + '</div><button class="btn-primary btn-block" data-close style="margin-top:18px">확인</button>');
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
      return '<div class="score-row" data-tier="' + tierOf(v) + '"><span class="cat">' + c[1] + ' <em class="tier-tag">' + TIER_LABEL[tierOf(v)] + '</em></span><span class="ln">' + f.lines[c[0]] + '</span><span class="sc"><b data-count="' + v + '">' + v + '</b><small>점</small></span><span class="score-bar"><i style="--v:' + (v / 100) + '"></i></span></div>';
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
     2027 정미년 신년운세 — 무료 콘텐츠 (4~12월·2~7장은 보상형 광고 1회로 열림)
     丁(천간 3) · 未(지지 7)과 내 일간의 십성으로 키워드를 만든다
     ========================================================= */
  var NY = { open:'12월 14일' };
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
  /* ---- 더 깊이 보기: 유료 상품 배너 (002 가격) ---- */
  function deepHTML(me, r){
    var ny = newYear(r);
    var B = [
      { id:'dpDm', tone:'night', badge:'HOT', title:'꿈 풀이 리포트', sub:'길몽일까 흉몽일까? 오늘의 처방까지', price:COST.dream + '닢', cta:'꿈 풀이 받기', art:'dreamnum' },
      { id:'dpNY', tone:'sun', badge:'무료', title:'2027 신년운세 전체', sub:'#' + ny.kw.join(' #') + ' · 12개월 흐름', price:'광고 한 편', cta:'전체 보기', art:'ny' },
      { id:'dpGh', tone:'rose', badge:'', title:'궁합 상세 리포트', sub:'둘의 성향 차이와 잘 맞는 대화법까지', price:COST.gh + '닢', cta:'리포트 열기', art:'gh' },
      { id:'dpEz', tone:'mint', badge:'', title:'쉬운 사주 풀이', sub:'어려운 한자 없이, 내 사주를 이야기처럼', price:COST.ez + '닢', cta:'풀이 보기', art:'book' }
    ];
    var IC = { star:TIP_IC.star, heart:CAT_IC.heart, scroll:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13"/></svg>' };
    return '<section class="deep" aria-label="더 깊이 보기"><div class="deep-head"><h2 class="sec-title">더 깊이 보기</h2><small>궁금한 운, 하나 더 깊게</small></div>' +
      B.map(function(b){
        return '<button type="button" class="deep-bn t-' + b.tone + '" id="' + b.id + '"><span class="db-txt"><b>' + b.title + (b.badge ? ' <em>' + b.badge + '</em>' : '') + '</b><small>' + b.sub + '</small>' +
          '<span class="db-cta">' + b.price + ' · ' + b.cta + ' →</span></span>' +
          '<span class="db-uni" aria-hidden="true">' + tileArtSVG(b.art) + '</span></button>';
      }).join('') +
      '<button type="button" class="deep-set" id="dpSet"><span><b>' + (coinSale() ? '엽전 충전소' : '엽전 주머니') + '</b> 내 엽전 ' + (isGuest() ? '0' : getCoins().toLocaleString()) + '닢 · ' + (coinSale() ? '충전하고 더 깊게' : '모자라면 하나씩 바로 결제') + '</span><span class="ds-p">' + (coinSale() ? '충전' : '보기') + ' ›</span></button></section>';
  }
  function nyCardHTML(me, r){
    var ny = newYear(r);
    return '<div class="ny-card"><div class="ny-eyebrow">2027 정미년 신년운세 · 총평 무료</div>' +
      '<h2 class="ny-title">' + esc(me.name) + '님의 2027년 키워드</h2>' +
      '<div class="ny-kw">' + ny.kw.map(function(k){ return '<span>#' + k + '</span>'; }).join('') + '</div>' +
      '<p class="body-text" style="margin:0">' + ny.line + '</p>' +
      '<button class="btn-primary btn-block" id="btnNY">신년운세 총평 무료로 보기</button></div>';
  }
  /* 신년운세 구조 (2026-11-10 변경: 무료 콘텐츠)
     바로 무료: 1장 총운·키워드 + 총점·분야별 점수 + 1~3월 흐름
     광고 한 편 보고 무료로 열기: 4~12월 + 2~7장(월별, 재물, 직업·학업, 연애·결혼, 건강, 행운) */
  var NY_CHAPTERS = [
    { t:'월별 운세 1월~12월', pv:'1월은 작은 결정이 한 해의 방향을 정해요. 2월에는 오래 미룬 연락이 다시 이어지고' },
    { t:'재물운 · 돈이 들어오는 달', pv:'수입이 늘어나는 달과 지출을 줄여야 하는 달이 뚜렷하게 나뉘어요' },
    { t:'직업 · 학업운', pv:'올해 이직이나 새 도전을 하기 좋은 시기는 상반기 중에서도' },
    { t:'연애 · 결혼운', pv:'인연이 가까워지는 달에는 평소 가지 않던 자리에서 만남이' },
    { t:'건강운과 조심할 시기', pv:'특히 환절기가 겹치는 달에는 무리하지 말고 수면을' },
    { t:'2027 행운의 색 · 방향 · 숫자', pv:'한 해의 행운의 색, 방향, 숫자를 한눈에' }
  ];
  function nyScores(me, r){
    var rnd = mulberry32(seedHash(entryISO(me, r) + '|' + entryTKey(r) + '|ny2027'));
    var pick = function(lo, hi){ return lo + Math.floor(rnd() * (hi - lo + 1)); };
    var total = pick(68, 94), f = {};
    ['재물', '연애', '직업', '건강'].forEach(function(k){ f[k] = Math.max(55, Math.min(98, total + pick(-12, 10))); });
    var months = []; for (var i = 0; i < 12; i++) months.push(pick(48, 98));
    return { total:total, f:f, months:months };
  }
  var NY_MONTH = {
    hi:['일이 손에 잘 붙는 달이에요. 미뤄 둔 계획을 꺼내 시작해 보세요.', '도와주는 사람이 가까이 있어요. 먼저 연락하면 길이 열려요.', '노력이 눈에 띄는 달이에요. 결과를 정리해 보여 주기 좋아요.', '기분 좋은 소식이 들어와요. 들뜬 만큼 약속은 꼼꼼하게.'],
    mid:['큰 변화보다는 다지는 달이에요. 루틴을 지키면 흐름이 이어져요.', '선택지가 여러 개 보여요. 하나만 골라 끝까지 가 보세요.', '사람 사이 균형이 중요한 달이에요. 말 한마디를 부드럽게.', '작은 성과가 쌓이는 달이에요. 기록해 두면 다음 달에 힘이 돼요.'],
    lo:['속도를 줄이고 쉬어 가는 달이에요. 무리한 약속은 미뤄요.', '지출이 새기 쉬워요. 큰 결정은 한 번 더 확인하고.', '컨디션 관리가 먼저예요. 잠과 식사를 챙기면 금방 회복돼요.', '오해가 생기기 쉬운 달이에요. 중요한 말은 글로 남겨요.']
  };
  var NY_FIELD = {
    재물:['돈이 들어오는 길이 넓어지는 해예요. 들어온 돈을 바로 쓰지 말고 통장을 나눠 두면 연말에 차이가 커요.', '수입은 꾸준하지만 새는 돈이 보여요. 고정비를 한 번 정리하면 여유가 생겨요.', '큰돈을 움직이기보다 지키는 해예요. 남의 말에 급하게 투자하지 않는 게 재물운을 지키는 길이에요.'],
    직업:['맡은 일이 커지고 인정받는 해예요. 이직·승진·시험 모두 도전해 볼 만해요.', '지금 자리에서 실력을 쌓는 해예요. 자격증이나 공부를 시작하면 내년에 빛을 봐요.', '사람 관계가 일의 성패를 가르는 해예요. 혼자 끌어안기보다 나눠 맡기세요.'],
    연애:['인연이 가까워지는 해예요. 소개나 모임 자리를 피하지 마세요. 연인이 있다면 약속이 깊어져요.', '천천히 알아 가는 관계가 좋은 해예요. 서두르지 않으면 오래가요.', '내 마음을 먼저 돌보는 해예요. 혼자 있는 시간이 오히려 좋은 인연을 부르는 준비가 돼요.'],
    건강:['기운이 좋은 해예요. 새 운동을 시작하면 꾸준히 이어 가기 쉬워요.', '큰 탈은 없지만 피로가 쌓이기 쉬워요. 환절기마다 수면 시간을 지켜 주세요.', '몸이 보내는 신호에 귀 기울일 해예요. 미뤄 둔 검진을 챙기면 마음이 편해져요.']
  };
  function nyFullHTML(me, r, sc){
    var tier = function(v){ return v >= 80 ? 0 : v >= 62 ? 1 : 2; };
    var best = sc.months.indexOf(Math.max.apply(null, sc.months)), worst = sc.months.indexOf(Math.min.apply(null, sc.months));
    var seed = seedHash(entryISO(me, r) + '|nyline') % 4;
    var used = { hi:seed, mid:seed, lo:seed };
    var months = sc.months.map(function(v, i){
      var key = ['hi', 'mid', 'lo'][tier(v)];
      return '<li><b>' + (i + 1) + '월 <small>' + v + '</small></b><span>' + NY_MONTH[key][used[key]++ % 4] + '</span></li>';
    }).join('');
    var field = function(k){ return '<p>' + NY_FIELD[k][tier(sc.f[k])] + '</p>'; };
    var e = (Math.floor(r.pillars.day.stem / 2) + 4) % 5, L = EL_TEXT[e];
    return '<div class="ny-full">' +
      '<div class="nf-sec"><h4>2장 · 월별 운세</h4><p class="helper">가장 좋은 달 <b>' + (best + 1) + '월</b> · 쉬어 갈 달 <b>' + (worst + 1) + '월</b></p><ul class="nf-months">' + months + '</ul></div>' +
      '<div class="nf-sec"><h4>3장 · 재물운 <small>' + sc.f['재물'] + '점</small></h4>' + field('재물') + '</div>' +
      '<div class="nf-sec"><h4>4장 · 직업 · 학업운 <small>' + sc.f['직업'] + '점</small></h4>' + field('직업') + '</div>' +
      '<div class="nf-sec"><h4>5장 · 연애 · 결혼운 <small>' + sc.f['연애'] + '점</small></h4>' + field('연애') + '</div>' +
      '<div class="nf-sec"><h4>6장 · 건강운 <small>' + sc.f['건강'] + '점</small></h4>' + field('건강') + '<p class="helper">쉬어 갈 달인 ' + (worst + 1) + '월에는 일정을 가볍게 잡아 두세요.</p></div>' +
      '<div class="nf-sec"><h4>7장 · 2027 행운 처방</h4><div class="nf-lucky"><span><small>행운의 색</small>' + L.color + '</span><span><small>행운의 방향</small>' + L.dir + '</span><span><small>행운의 숫자</small>' + L.num.join(' · ') + '</span></div>' +
        '</div>' +
      '</div>';
  }
  function openNYSheet(me, r){
    setTimeout(function(){ bond('ny'); }, 900);
    var ny = newYear(r), sc = nyScores(me, r), open = nyOpen(me);
    var bars = '', FREE_M = 3;
    for (var i = 0; i < 12; i++){
      bars += (i < FREE_M || open)
        ? '<div class="nm on"><i style="height:' + sc.months[i] + '%"></i><span>' + (i + 1) + '월</span><b>' + sc.months[i] + '</b></div>'
        : '<div class="nm lock"><i style="height:38%"></i><span>' + (i + 1) + '월</span><b>' + LOCK_SVG + '</b></div>';
    }
    var fields = Object.keys(sc.f).map(function(k){ return '<div class="nf"><span>' + k + '</span><i><u style="width:' + sc.f[k] + '%"></u></i><b>' + sc.f[k] + '</b></div>'; }).join('');
    var chap = NY_CHAPTERS.map(function(c, i){ return '<li class="nc"><div class="nc-h"><span>' + (i + 2) + '장 · ' + c.t + '</span>' + LOCK_SVG + '</div><p class="ny-blur" aria-hidden="true">' + c.pv + '</p></li>'; }).join('');
    openSheet('<div class="sheet-fig">' + uniImg('u-newyear') + '</div><h3 id="sheetTitle">' + esc(me.name) + '님의 2027 신년운세</h3>' +
      '<p class="helper" style="margin:-4px 0 12px">' + r.pillars.day.name + '(' + r.pillars.day.hanja + ')일주 기준 · 만세력으로 계산 · ' + (open ? '전체 열림' : '총평과 1~3월 무료') + '</p>' +
      '<div class="ny-score"><div class="big"><b>' + sc.total + '</b><span>점</span><small>2027년 흐름</small></div><div class="nfs">' + fields + '</div></div>' +
      '<div class="ny-open"><b style="color:#f3dca0">1장 · 2027년 한 해의 흐름</b><br>' +
      '2027년 정미년(丁未年)의 천간 丁은 ' + esc(me.name) + '님에게 <b>' + ny.sT + '</b>, 지지 未는 <b>' + ny.bT + '</b>의 기운이에요. ' +
      '12운성으로는 <b>' + ny.stage + '</b>의 자리에 서요. ' + ny.line + '</div>' +
      '<h4 class="ny-h">월별 흐름 <small>' + (open ? '1~12월' : '1~3월 무료 · 4~12월은 전체 보기에서') + '</small></h4><div class="ny-months">' + bars + '</div>' +
      (open ? nyFullHTML(me, r, sc) + adSlotHTML('신년운세를 다 본 뒤')
        : '<h4 class="ny-h">전체 보기에서 열려요 <small>2~7장</small></h4><ul class="ny-chaps">' + chap + '</ul>' +
          '<div class="ny-free"><div class="ny-free-fig">' + uniImg('u-newyear') + '</div><b>광고 한 편 보면 전체가 무료로 열려요</b><p class="helper">4~12월 흐름과 2~7장(재물·직업·연애·건강·행운 처방)이 모두 열리고, ' + esc(me.name) + '님 신년운세는 계속 다시 볼 수 있어요.</p>' +
          passLinkHTML() + '<button class="btn-primary btn-block sheen" id="btnNYBuy">' + AD_PLAY_SVG + '광고 보고 전체 무료로 보기</button></div>') +
      '<button class="text-btn" data-close>' + (open ? '닫기' : '나중에 볼게요') + '</button>');
    if (!open) $('btnNYBuy').onclick = function(){
      closeSheet();
      playAd(function(){ setNyOpen(me); toast('2027 신년운세 전체가 열렸어요'); openNYSheet(me, r); }, '끝까지 보면 신년운세 전체가 열려요');
    };
  }
  /* 신년운세 전체 = 광고 시청(사람별, 한 번 열면 계속). 예시 모드도 광고 연출은 보여 준다 */
  function nyOpen(me){ var o = store('unsu_ny_open'); return !!(o && typeof o === 'object' && me && o[me.id]) || passActive(); }
  function setNyOpen(me){ var o = store('unsu_ny_open'); if (!o || typeof o !== 'object') o = {}; o[me.id] = Date.now(); store('unsu_ny_open', o);
  }

  /* =========================================================
     꿈해몽 (2026-11-21: 번호를 빼고 '길흉 판정 + 오늘의 처방'이 유료 훅)
     · 무료: 해몽 사전 풀이(제목·요약·상징 뜻) — 검색 유입·체류용, 비로그인도 가능, 분석 중 광고 1개
     · 엽전 COST.dream: AI 정밀 풀이 + 길몽·흉몽 판정 + 오늘의 처방(조심할 것 · 좋은 방향 · 색 · 숫자) (무료 결과에서 바로 이어서 받을 수도 있음)
     입력 → 경고문 확인 → 엽전 차감(또는 1회권) → /api/dream(AI) → 실패 시 자체 사전 풀이
     ========================================================= */
  var DM = { cost:COST.dream, min:10, max:500 };
  var DM_BAN = /(씨발|시발|ㅅㅂ|병신|ㅂㅅ|좆|개새|지랄|미친놈|미친년|느금|니애미|애미|섹스|자살)/;
  var DM_PHONE = /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/;
  var DM_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/><path d="M15.5 4.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/></svg>';
  var dmAgree = false;
  function getDreams(){ var d = store('unsu_dreams'); return Array.isArray(d) ? d : []; }
  function dmCoupon(){ return getCoupons()[0] || null; }
  function openDream(){ renderDreamInput(); $('dmResult').hidden = true; $('dmInput').hidden = false; show('dream'); }
  /* 대화형 입력: 주제 → (사람이면) 누구 → 이름(선택) → 꿈 이야기. 고른 맥락은 해몽 사전·AI 둘 다에 넘긴다 */
  var DM_THEMES = [['person','사람이 나왔어'],['animal','동물'],['nature','물·불·자연'],['money','돈·물건'],['place','집·장소'],['event','떨어지거나 쫓기는 꿈'],['etc','잘 모르겠어']];
  var DM_WHO = [['celeb','연예인·유명인'],['family','가족'],['lover','연인·짝사랑'],['ex','전 애인'],['friend','친구·동료'],['stranger','모르는 사람'],['ancestor','돌아가신 분']];
  var DM_HINT = { person:'그 사람이 뭘 했는지, 나는 어떤 기분이었는지 적어 줘.', animal:'어떤 동물이었는지, 색깔·크기, 나한테 다가왔는지 적어 줘.', nature:'물이 맑았는지 탁했는지, 불이 컸는지처럼 모습을 적어 줘.',
    money:'무엇을 얻었는지 잃었는지, 얼마나 많았는지 적어 줘.', place:'어떤 곳이었는지, 거기서 무슨 일이 있었는지 적어 줘.', event:'어디서 떨어졌는지, 누가 쫓아왔는지, 끝은 어떻게 됐는지 적어 줘.', etc:'기억나는 장면을 생각나는 대로 적어 줘.' };
  var dmCtx = { theme:'', who:'', name:'', named:false };
  function dmLabel(list, k){ var x = list.filter(function(i){ return i[0] === k; })[0]; return x ? x[1] : ''; }
  function dmNeedName(){ return dmCtx.theme === 'person' && dmCtx.who && dmCtx.who !== 'stranger' && !dmCtx.named; }
  function dmReady(){ return dmCtx.theme && (dmCtx.theme !== 'person' || (dmCtx.who && !dmNeedName())); }
  function dmChatHTML(){
    var av = '<span class="dmc-av">' + petSVG('happy', getPet().lv, 'mini') + '</span>';
    function uni(t, sub){ return '<div class="dmc-row">' + av + '<div class="dmc-b">' + t + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>'; }
    function me(t){ return '<div class="dmc-row me"><div class="dmc-b">' + esc(t) + '</div></div>'; }
    function chips(list, attr){ return '<div class="dmc-chips">' + list.map(function(i){ return '<button type="button" ' + attr + '="' + i[0] + '">' + i[1] + '</button>'; }).join('') + '</div>'; }
    var h = uni('어젯밤엔 어떤 꿈을 꿨어?', '제일 기억나는 걸 하나만 골라 줘. 고르면 더 정확하게 풀 수 있어.');
    if (!dmCtx.theme) return h + chips(DM_THEMES, 'data-dmt');
    h += me(dmLabel(DM_THEMES, dmCtx.theme));
    if (dmCtx.theme === 'person'){
      h += uni('누가 나왔어?');
      if (!dmCtx.who) return h + chips(DM_WHO, 'data-dmw');
      h += me(dmLabel(DM_WHO, dmCtx.who));
      if (dmCtx.who !== 'stranger'){
        h += uni(dmCtx.who === 'celeb' ? '누구였는지 이름을 알려 줄래?' : '뭐라고 부르면 될까?', dmCtx.who === 'celeb' ? '이름을 알면 이름 글자를 물건으로 잘못 읽지 않아. 안 적어도 괜찮아.' : '실명 대신 별명이나 호칭(엄마, 팀장님)으로 적어 줘.');
        if (!dmCtx.named) return h + '<div class="dmc-name"><input class="text-input" id="dmName" maxlength="12" placeholder="' + (dmCtx.who === 'celeb' ? '예) 유재석' : '예) 엄마, 팀장님') + '" autocomplete="off"><button type="button" class="btn-soft" id="dmNameGo">다음</button></div>';
        h += me(dmCtx.name || '건너뛸게');
      }
    }
    return h + uni('좋아! 이제 꿈 이야기를 들려줘.', DM_HINT[dmCtx.theme]);
  }
  function openDream(){ dmCtx = { theme:'', who:'', name:'', named:false }; renderDreamInput(); $('dmResult').hidden = true; $('dmInput').hidden = false; show('dream'); }
  function renderDreamInput(){
    var guest = isGuest(), cp = dmCoupon(), coins = getCoins(), past = getDreams(), draft = store('unsu_dmdraft') || '';
    dmAgree = false;
    var ready = dmReady();
    var h = '<div class="flow-header"><button class="icon-back" id="btnDmBack" aria-label="뒤로">‹</button><span class="ttl">꿈해몽</span>' + (dmCtx.theme ? '<button class="btn-ghost" id="btnDmReset" style="padding:8px 14px;font-size:calc(12.5px*var(--fs))">처음부터</button>' : '') + '</div>' +
      '<div class="card dmc" id="dmChat">' + dmChatHTML() + '</div>';
    if (ready){
      h += '<div class="card dm-card"><label class="dm-lab" for="dmText">내 꿈 이야기</label>' +
        '<div class="dmc-ctx">' + '<span>' + dmLabel(DM_THEMES, dmCtx.theme) + '</span>' + (dmCtx.who ? '<span>' + dmLabel(DM_WHO, dmCtx.who) + (dmCtx.name ? ' · ' + esc(dmCtx.name) : '') + '</span>' : '') + '</div>' +
        '<textarea class="text-input dm-text" id="dmText" maxlength="' + DM.max + '" rows="5" placeholder="' + (dmCtx.name ? esc(dmCtx.name) + '이(가) 꿈에 나와서 나한테 웃어 줬어요. 너무 설렜어요.' : '예) 맑은 강에서 큰 잉어를 잡았는데 배 속에서 금반지가 나왔어요. 꿈에서 정말 기뻤어요.') + '">' + esc(draft) + '</textarea>' +
        '<div class="dm-meta"><span class="helper">꿈속 기분까지 적으면 더 자세히 풀려요</span><span class="dm-count" id="dmCount">0/' + DM.max + '</span></div>' +
        '<p class="field-hint" id="dmHint" role="alert"></p></div>' +
        '<div class="dm-warn" role="note"><details><summary>' + LOCK_SVG + '꿈풀이 전에 꼭 읽어 주세요 ›</summary><ul>' +
          '<li><strong>해몽만 보기는 무료예요.</strong> <strong>꿈 풀이 리포트를 받으면 엽전 ' + DM.cost + '닢이 바로 쓰여요.</strong> 리포트는 누르는 즉시 만들어지는 디지털 콘텐츠라, 시작된 뒤에는 엽전을 돌려드리지 않아요. 오류로 결과가 안 나오면 엽전을 돌려드려요.</li>' +
          '<li>욕설·비방·성적인 표현, 특정인을 해치거나 깎아내리는 내용은 풀이하지 않아요. 이런 글은 엽전이 쓰이기 전에 막혀요.</li>' +
          '<li>전화번호·주소·주민번호 같은 개인정보는 적지 마세요. 적은 글은 풀이를 만드는 데만 쓰고(AI 풀이 서비스로 전송), 결과는 이 기기에만 보관돼요.</li>' +
          '<li>꿈 해몽은 재미로 즐기는 콘텐츠예요. 미래를 예언하거나 어떤 결과를 보장하지 않아요.</li>' +
        '</ul></details></div>' +
        '<button type="button" class="unk-btn" id="dmAgree" aria-pressed="false"><span>위 내용을 확인했어요</span><span class="ck"></span></button>' +
        '<div class="dm-offer"><div class="dmo-fig">' + uniImg('u-thinking') + '</div><div><b>이 꿈으로 오늘의 처방 받기</b><ul><li>AI가 꿈 장면을 하나하나 읽어요</li><li><em>길몽·흉몽 판정</em>과 오늘 조심할 것</li><li>좋은 방향, 색, 숫자까지 한 장으로</li></ul></div></div>' +
        '<div class="dm-pay">' + (guest ? '<span>로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢 · 꿈 풀이 ' + Math.floor(SIGNUP_COINS / DM.cost) + '번</span>'
          : cp ? '<span class="pet-ticket sm"><small>COUPON</small><b>' + esc(cp.name) + ' 사용</b><span>이번 풀이는 엽전이 쓰이지 않아요</span></span>'
          : '<span>' + COIN_SVG + '내 엽전 <b>' + coins.toLocaleString() + '닢</b></span><span>꿈 풀이 <b>' + DM.cost + '닢</b></span>') + '</div>' +
        '<button class="btn-primary btn-block sheen" id="btnDmGo" disabled>' + DM_IC + '꿈 풀이 리포트 받기' + (guest || cp ? '' : ' · ' + DM.cost + '닢') + '</button>' +
        '<button class="btn-ghost btn-block dm-free" id="btnDmFree" disabled>해몽만 무료로 보기</button>';
    }
    if (past.length) h += '<div class="card"><div class="sec-head"><h2 class="sec-title">지난 꿈풀이</h2><span class="sec-meta">' + past.length + '개 · 이 기기</span></div><div class="dm-past">' +
      past.map(function(d, i){ return '<button type="button" data-dm="' + i + '"><b>' + esc(d.title) + '</b><span>' + fmtDate(d.at) + ' · ' + (d.free ? '무료 해몽' : '꿈 풀이 리포트') + '</span></button>'; }).join('') + '</div></div>';
    $('dmInput').innerHTML = h;
    $('btnDmBack').onclick = function(){ go('today'); };
    if ($('btnDmReset')) $('btnDmReset').onclick = function(){ dmCtx = { theme:'', who:'', name:'', named:false }; renderDreamInput(); };
    var box = $('dmChat');
    box.querySelectorAll('[data-dmt]').forEach(function(b){ b.onclick = function(){ dmCtx.theme = b.dataset.dmt; renderDreamInput(); dmScroll(); }; });
    box.querySelectorAll('[data-dmw]').forEach(function(b){ b.onclick = function(){ dmCtx.who = b.dataset.dmw; renderDreamInput(); dmScroll(); }; });
    if ($('dmNameGo')){
      var ni = $('dmName');
      var nx = function(){ var v = ni.value.trim(); dmCtx.name = DREAM.cleanCtx({ name:v }).name; dmCtx.named = true; renderDreamInput(); dmScroll(); };
      $('dmNameGo').onclick = nx; ni.onkeydown = function(e){ if (e.key === 'Enter') nx(); };
      if (!('ontouchstart' in window)) ni.focus();
    }
    document.querySelectorAll('[data-dm]').forEach(function(b){ b.onclick = function(){ renderDreamResult(getDreams()[+b.dataset.dm], false); }; });
    if (!ready) return;
    var ta = $('dmText');
    function sync(){
      var v = ta.value.trim(), n = ta.value.length;
      $('dmCount').textContent = n + '/' + DM.max;
      var bad = DM_BAN.test(v) ? '욕설이나 비방으로 보이는 표현이 있어요. 지우고 다시 적어 주세요.' : DM_PHONE.test(v) ? '전화번호 같은 개인정보는 지워 주세요.' : '';
      $('dmHint').textContent = bad;
      $('btnDmGo').disabled = $('btnDmFree').disabled = !dmAgree || v.length < DM.min || !!bad;
      try { store('unsu_dmdraft', ta.value); } catch (e) {}
    }
    ta.oninput = sync; sync();
    $('dmAgree').onclick = function(){ dmAgree = !dmAgree; this.setAttribute('aria-pressed', String(dmAgree)); this.querySelector('.ck').innerHTML = dmAgree ? OK_SVG : ''; sync(); };
    $('btnDmGo').onclick = function(){ dreamGo(ta.value.trim(), true); };
    $('btnDmFree').onclick = function(){ dreamGo(ta.value.trim(), false); };
  }
  function dmScroll(){
    var t = $('dmText') || $('dmName') || document.querySelector('#dmChat .dmc-chips');
    if (t) t.scrollIntoView({ block:'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function dreamGo(text, paid){
    if (text.length < DM.min){ $('dmHint').textContent = DM.min + '자 이상 적어 주세요.'; return; }
    if (!paid){ dreamRun(text, false); return; }
    if (isGuest()){ openLoginSheet('꿈 풀이 리포트는 로그인하고 엽전으로 볼 수 있어요. 처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요. 꿈풀이 ' + Math.floor(SIGNUP_COINS / DM.cost) + '번을 볼 수 있는 만큼이에요.'); return; }
    var cp = dmCoupon();
    if (!cp && !passActive() && getCoins() < DM.cost){ dreamShortSheet(text); return; }
    if (!dmCtx.who && !DREAM.find(DREAM.maskName(text, dmCtx.name)).length && text.length < 40){
      openSheet('<h3 id="sheetTitle">꿈속 장면을 조금 더 적어 볼까요?</h3><p class="body-text">지금 글에서는 풀이할 상징이 잘 보이지 않아요. 등장한 동물·사람·물건이나 꿈속 기분을 한두 줄 더 적으면 훨씬 자세히 풀려요.</p>' +
        '<button class="btn-primary btn-block" data-close>더 적을게요</button><button class="text-btn" id="btnDmAnyway">이대로 풀기 · ' + (cp ? '1회권 사용' : DM.cost + '닢') + '</button>');
      $('btnDmAnyway').onclick = function(){ closeSheet(); dreamRun(text, true); };
      return;
    }
    dreamRun(text, true);
  }
  function dreamShortSheet(text){
    /* 2026-11-21: 엽전이 모자라면 이 꿈 하나만 원화로 바로 결제(엽전 충전 판매 안 함). 결제 뒤 같은 꿈 글로 풀이를 이어 간다 */
    if (text && srvUser()){ openBuySheet({ cost:DM.cost, why:'꿈 풀이 리포트', item:'dream:' + Date.now().toString(36), rs:{ k:'dream', text:text } }); return; }
    var left = adCoinOn() ? AD_LIMIT - adCount() : 0, adOn = adCoinOn();
    openSheet('<div class="short-fig">' + uniImg('u-money') + '</div><h3 id="sheetTitle">엽전이 조금 모자라요</h3><p class="body-text">꿈 풀이 리포트에는 엽전 ' + DM.cost + '닢이 필요해요. 지금 ' + getCoins().toLocaleString() + '닢이 있어요.</p>' +
      '<ul class="dm-tips">' +
        (adOn ? '<li><b>광고 보고 모으기</b><span>한 편에 ' + AD_REWARD + '닢 · 오늘 ' + Math.max(0, left) + '번 남음</span></li>' : '') +
        '<li><b>매일 출석</b><span>하루 10닢 · 7일 연속이면 +30닢</span></li>' +
        '<li><b>우니와 교감</b><span>게이지를 채우면 꿈풀이 1회권</span></li></ul>' +
      '<button class="btn-primary btn-block" id="btnDmCharge">엽전 주머니 보기</button>' +
      (adOn ? '<button class="btn-ghost btn-block" id="btnDmAd" style="margin-top:8px"' + (left > 0 ? '' : ' disabled') + '>' + (left > 0 ? AD_PLAY_SVG + '광고 보고 엽전 ' + AD_REWARD + '닢 받기' : '오늘 광고 보상을 모두 받았어요') + '</button>' : '') +
      '<button class="text-btn" data-close>닫기</button>');
    $('btnDmCharge').onclick = function(){ openCoinSheet('꿈 풀이 리포트에 엽전이 ' + (DM.cost - getCoins()) + '닢 더 필요해요.'); };
    if (left > 0) $('btnDmAd').onclick = function(){ closeSheet(); playAd(function(){ useAd(); addCoins(AD_REWARD, '광고 보상'); renderDreamInput(); }); };
  }
  /* paid=false: 해몽 사전만(무료) · paid=true: 엽전/1회권 차감 후 AI. upgrade: 무료 결과를 같은 id로 리포트까지 채울 때 */
  function dreamRun(text, paid, upgrade, charged){
    /* 로그인 계정: 서버가 엽전을 먼저 확인·차감한 뒤에 풀이를 시작한다 */
    if (paid && !charged && !NS && srvUser() && !dmCoupon()){
      spendCoins(DM.cost, '꿈 풀이 리포트', 'dream:' + Date.now().toString(36), function(){ dreamRun(text, paid, upgrade, true); }, { k:'dream', text:text });
      return;
    }
    var btn = $('btnDmGo'); if (!upgrade && btn){ if (btn.dataset.busy) return; btn.dataset.busy = '1'; btn.disabled = true; }
    var cp = paid ? dmCoupon() : null;
    if (paid){
      if (cp){ var all = store('unsu_coupons') || []; all.forEach(function(c){ if (c.id === cp.id){ c.used = true; c.usedAt = Date.now(); } }); store('unsu_coupons', all); }
      else if (!NS && !charged) addCoins(-DM.cost, '꿈 풀이 리포트');
    }
    if (!upgrade) store('unsu_dmdraft', '');
    show('dream'); $('dmInput').hidden = true; $('dmResult').hidden = false; window.scrollTo(0, 0);
    $('dmResult').innerHTML = '<div class="flow-header"><span class="ttl">' + (paid ? '꿈 풀이 만드는 중' : '꿈 해몽') + '</span></div><div class="card dm-loading">' + uniImg(paid ? 'u-thinking' : 'u-sleep', 'dm-fig') +
      '<b>' + (paid ? '우니가 꿈을 자세히 읽고 있어요' : '우니가 꿈을 읽고 있어요') + '</b><p class="helper">' + (paid ? '길흉을 판정하고 오늘의 처방을 만드는 중이에요. 잠시만 기다려 주세요.' : '해몽 사전에서 꿈속 상징을 찾는 중이에요.') + '</p><div class="dm-dots"><i></i><i></i><i></i></div></div>' +
      adSlotHTML('꿈 분석 중', 'loading');
    var ctx = upgrade ? upgrade.ctx : { theme:dmCtx.theme, who:dmCtx.who, name:dmCtx.name }, local = DREAM.analyze(text, ctx), done = false;
    function finish(res){
      if (done) return; done = true;
      var item = { id:upgrade ? upgrade.id : 'd' + Date.now().toString(36), at:upgrade ? upgrade.at : Date.now(), text:text, ctx:ctx, cat:res.cat, catName:res.catName, title:res.title, summary:res.summary,
        symbols:(res.symbols || []).map(function(s){ return { word:s.word, meaning:s.meaning }; }), caution:res.caution || '', source:res.source || 'local', paid:paid ? (cp ? 'coupon' : DM.cost) : 0, free:!paid };
      var list = getDreams().filter(function(x){ return x.id !== item.id; }); list.unshift(item); if (list.length > 20) list.length = 20; store('unsu_dreams', list);
      renderDreamResult(item, true);
      setTimeout(function(){ bond('dream'); }, 1200);
    }
    var started = Date.now();
    if (!paid){ setTimeout(function(){ finish(local); }, 1400); return; }
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function(){ if (ctl) ctl.abort(); finish(local); }, 20000);
    fetch('/api/dream', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ text:text, ctx:ctx }), signal:ctl ? ctl.signal : undefined })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(j){
        var res = j && j.title && j.summary ? j : local;
        setTimeout(function(){ clearTimeout(t); finish(res); }, Math.max(0, 1600 - (Date.now() - started)));
      })
      .catch(function(){ setTimeout(function(){ clearTimeout(t); finish(local); }, Math.max(0, 1600 - (Date.now() - started))); });
  }
  /* 무료 해몽 결과에서 '이 꿈으로 오늘의 처방 받기' */
  function dreamUpgrade(d){
    if (isGuest()){ openLoginSheet('꿈 풀이 리포트는 엽전 ' + DM.cost + '닢이에요. 처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요.'); return; }
    if (!NS && !dmCoupon() && !passActive() && getCoins() < DM.cost){ dreamShortSheet(d.text); return; }
    dreamRun(d.text, true, d);
  }
  /* 원문에서 꿈속 상징을 표시해 보여 준다 */
  function dmAnnotate(text, symbols){
    var marks = [];
    symbols.forEach(function(s){
      var i = text.indexOf(s.word);
      if (i < 0 || marks.some(function(m){ return i < m.at + m.len && m.at < i + s.word.length; })) return;
      marks.push({ at:i, len:s.word.length });
    });
    marks.sort(function(a, b){ return a.at - b.at; });
    var out = '', p = 0;
    marks.forEach(function(m){
      out += esc(text.slice(p, m.at)) + '<mark>' + esc(text.slice(m.at, m.at + m.len)) + '</mark>';
      p = m.at + m.len;
    });
    return out + esc(text.slice(p));
  }
  /* 오늘의 처방: 길흉 판정 · 오늘 조심할 것 · 좋은 방향 · 좋은 색 · 좋은 숫자.
     내 사주가 있으면 오늘 나에게 필요한 오행으로, 없으면 꿈의 성격(분류)에 맞는 오행으로 정한다 */
  function dreamRx(d){
    var X = DREAM.RX[d.cat] || DREAM.RX.x, me = getMe(), el = X.el, mine = false;
    if (me){ var r = compute(me); if (!r.error){ el = todayLuck(me, r).el; mine = true; } }
    var E = EL_TEXT[el];
    return { X:X, el:el, mine:mine, color:E.color, dir:E.dir, caution:d.caution || X.c,
      nums:drawYongNumbers(String(d.id || d.at || '') + '|rx|' + el, el).slice(0, 2).map(function(o){ return o.n; }) };
  }
  function rxCardHTML(d){
    var q = dreamRx(d), stars = '';
    for (var i = 1; i <= 5; i++) stars += '<i class="' + (i <= q.X.s ? 'on' : '') + '">★</i>';
    return '<div class="card talisman dm-rx ' + EL_CLASS[q.el] + '"><div class="tl-k">오늘의 처방' + (q.mine ? ' · 내 사주 기운 반영' : '') + '</div>' +
      '<h2 class="tl-head">' + esc(q.X.v) + '</h2><div class="dm-stars" aria-label="길흉 지수 5점 만점에 ' + q.X.s + '점">' + stars + '</div>' +
      '<div class="tl-rows">' +
        '<div class="tl-row tl-wide"><span class="k">오늘 조심할 것</span><b>' + esc(q.caution) + '</b></div>' +
        '<div class="tl-row"><span class="k">좋은 방향</span><b>' + q.dir + '</b></div>' +
        '<div class="tl-row"><span class="k">좋은 색</span><b>' + q.color + '</b></div>' +
        '<div class="tl-row tl-nums"><span class="k">좋은 숫자</span>' + luckChips(q.nums, '') + '</div>' +
      '</div>' +
      (q.mine ? '' : '<p class="helper">내 사주를 등록하면 방향, 색, 숫자가 나에게 필요한 기운으로 바뀌어요.</p>') + '</div>';
  }
  function renderDreamResult(d, fresh){
    if (!d) return;
    $('dmInput').hidden = true; $('dmResult').hidden = false;
    var free = !!d.free, X = DREAM.RX[d.cat] || DREAM.RX.x;
    var h = '<div class="flow-header"><button class="icon-back" id="btnDmRBack" aria-label="꿈 입력으로">‹</button><span class="ttl">' + (free ? '무료 꿈 해몽' : '꿈 풀이 리포트') + '</span></div>' +
      '<div class="card dm-res"><div class="dm-tag"><span class="chip">' + esc(d.catName) + '</span><small>' + fmtDate(d.at) + '</small></div>' +
      '<h2 class="dm-title">' + esc(d.title) + '</h2>' +
      '<div class="dm-quote"><small>내가 꾼 꿈</small><p>' + dmAnnotate(d.text, d.symbols) + '</p></div>' +
      '<h4 class="ny-h">어떤 꿈일까요</h4><p class="body-text">' + esc(d.summary) + '</p>' +
      (d.symbols.length ? '<h4 class="ny-h">꿈속 상징 <small>' + d.symbols.length + '개</small></h4><ul class="dm-syms">' + d.symbols.map(function(s){
        return '<li><div class="dm-sh"><b>' + esc(s.word) + '</b></div><p>' + esc(s.meaning) + '</p></li>';
      }).join('') + '</ul>' : '') +
      '<p class="disclaimer">재미로 즐기는 꿈 해몽이며 미래를 예언하거나 결과를 보장하지 않습니다.' + (d.source === 'ai' ? ' AI가 우니조아 해몽 사전을 바탕으로 풀었어요.' : ' 우니조아 해몽 사전으로 풀었어요.') + '</p></div>' +
      (free
        ? '<div class="card dm-up"><div class="dmu-fig">' + uniImg('u-thinking') + '</div><div class="dmu-k">이 꿈은 <b>' + esc(d.catName) + '</b>이에요. 오늘은 어떻게 보내면 좋을까요?</div>' +
          '<h3 class="dmu-t">오늘의 처방 받아 볼까요?</h3>' +
          '<div class="dmu-lock" aria-hidden="true"><span>길몽 · 흉몽 판정</span><span>오늘 조심할 것</span><span>좋은 방향</span><span>좋은 색</span><span>좋은 숫자</span></div>' +
          '<ul class="dmu-list"><li>AI가 꿈 장면을 다시 읽고 더 자세히 풀어요</li><li>길몽·흉몽 판정과 오늘 조심할 것</li><li>좋은 방향, 색, 숫자를 한 장으로</li></ul>' +
          '<button class="btn-primary btn-block sheen" id="btnDmUp">' + DM_IC + '꿈 풀이 리포트 받기 · ' + DM.cost + '닢</button>' +
          '<p class="helper" style="text-align:center;margin-top:8px">' + (isGuest() ? '처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요' : NS ? '예시 모드에서는 엽전 없이 받아 볼 수 있어요' : '내 엽전 ' + getCoins().toLocaleString() + '닢') + '</p></div>'
        : rxCardHTML(d)) +
      '<div class="row"><button class="btn-soft grow" id="btnDmNew">다른 꿈 풀기</button><button class="btn-ghost grow" id="btnDmNum">오늘의 행운 부적 보기</button></div>' +
      adSlotHTML('꿈풀이 결과를 다 본 뒤');
    $('dmResult').innerHTML = h;
    window.scrollTo(0, 0);
    $('btnDmRBack').onclick = $('btnDmNew').onclick = function(){ dmCtx = { theme:'', who:'', name:'', named:false }; renderDreamInput(); $('dmResult').hidden = true; $('dmInput').hidden = false; window.scrollTo(0, 0); };
    $('btnDmNum').onclick = function(){ go('num'); };
    if (free) $('btnDmUp').onclick = function(){ dreamUpgrade(d); };
    if (fresh && !free) toast(d.paid === 'coupon' ? '꿈풀이 1회권을 사용했어요' : NS ? '예시 모드라 엽전 없이 받았어요' : '엽전 ' + DM.cost + '닢을 사용했어요');
  }

  /* =========================================================
     사업자 정보 · 약관 · 개인정보 · 환불 — PG 심사용 필수 노출 (내용은 출시 전 채움)
     ========================================================= */
  var BIZ = LEGAL.BIZ;   /* 값은 src/legal.js 한 곳에서 채운다 */
  function bizFootHTML(){
    return '<div class="biz-foot"><button data-doc="biz">사업자 정보</button><button data-doc="terms">이용약관</button>' +
      '<button data-doc="privacy"><b>개인정보처리방침</b></button><button data-doc="refund">환불 정책</button></div>';
  }
  var DOC_URL = { terms:'/terms', privacy:'/privacy', refund:'/refund' };
  function openDoc(k){
    var d = LEGAL.DOCS[k]; if (!d) return;
    openSheet('<div class="doc-sheet"><h3 id="sheetTitle">' + d.title + '</h3>' + d.html() + (DOC_URL[k] ? '<p class="doc-link"><a href="' + DOC_URL[k] + '" target="_blank" rel="noopener">새 창에서 보기</a></p>' : '') + '</div><button class="btn-primary btn-block" data-close style="margin-top:18px">확인</button>');
  }
  /* 화면 맨 아래 사업자 정보 (전자상거래법 표시 의무 · PG 심사) */
  (function siteFoot(){
    var el = $('siteFoot'); if (!el) return;
    el.innerHTML = '<nav class="sf-links"><a href="/terms" data-doc="terms">이용약관</a><a href="/privacy" data-doc="privacy"><b>개인정보처리방침</b></a><a href="/refund" data-doc="refund">환불 정책</a><a href="#" data-doc="biz">사업자 정보</a></nav>' +
      '<p class="sf-biz">' + LEGAL.footer() + '</p><p class="sf-copy">© 2026 ' + LEGAL.esc(BIZ.name) + ' · 우니조아의 운세는 재미로 보는 콘텐츠예요</p>';
  })();
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
     키우는 캐릭터 '우니' — 콘텐츠를 볼 때마다 교감이 오르고, 가득 차면 쿠폰
     · 콘텐츠마다 하루 1번만 오름 (도배 방지 → 2~3일에 한 번 가득 참)
     · 게이지는 줄지 않음 (안 들어와도 벌 없음)
     · 쿠폰은 로그인해야 받음 (가입 전환), 받으면 게이지 0 + 한 단계 성장
     ========================================================= */
  var PET_PTS = { today:{ n:10, label:'오늘의 운세', go:'today' }, saju:{ n:15, label:'사주 풀이', go:'saju' }, gunghap:{ n:15, label:'궁합', go:'gunghap' },
    zodiac:{ n:10, label:'별자리 운세', go:'zodiac' }, num:{ n:10, label:'행운 부적 열기', go:'num' }, ny:{ n:15, label:'신년운세', go:'ny' }, dream:{ n:15, label:'꿈 해몽', go:'dream' } };
  var PET_STAGE = ['새싹 별', '아기 별', '꼬마 별', '반짝 별', '보름달 별'];
  var COUPON_DM = { t:'dream1', name:'꿈풀이 1회권', days:7 };
  function getPet(){ var p = store('unsu_pet'); return p && typeof p === 'object' ? p : { g:0, lv:1, day:'', done:{}, n:0 }; }
  function savePet(p){ store('unsu_pet', p); }
  function petMood(g){ return g >= 100 ? 'love' : g >= 70 ? 'happy' : g >= 30 ? 'calm' : 'sleepy'; }
  function petStage(lv){ return PET_STAGE[Math.min(lv, PET_STAGE.length) - 1]; }
  function petDone(p){ return p.day === todayStr() ? (p.done || {}) : {}; }
  function getCoupons(){ var c = store('unsu_coupons'); return Array.isArray(c) ? c.filter(function(x){ return x.t === 'dream1' && !x.used && x.exp > Date.now(); }) : []; }
  var petUid = 0;
  /* =========================================================
     우니·조아 캐릭터 이미지 (2026-11-15 새 아트, src/img/u-*.webp · uj-*.webp)
     PNG 원본은 로컬 '우니조아 캐릭터/woonijoa-page-assets' — 400px(단독)·640px(둘) webp로 줄여 씀
     ========================================================= */
  function uniImg(pose, cls, alt){
    var duo = pose === 'uj-hug' ? 438 : pose === 'uj-hands' ? 451 : 0;   /* 함수 선언이 위에서 먼저 불려도 되게 상수는 안에 둔다 */
    return '<img class="uni-png ' + (cls || '') + '" src="img/' + pose + '.webp" width="' + (duo ? 640 : 400) + '" height="' + (duo || 400) + '" alt="' + (alt || '') + '"' + (alt ? '' : ' aria-hidden="true"') + ' decoding="async" draggable="false">';
  }
  /* 기분 → 포즈: 졸림·보통·반가움·기쁨 */
  var MOOD_POSE = { sleepy:'u-sleep', calm:'u-calm', happy:'u-wave', love:'u-happy' };
  /* 우니 + 조아(친구). pose: 'hold'(손잡기) | 'hug'(안기) */
  function duoSVG(pose, cls){ return uniImg(pose === 'hug' ? 'uj-hug' : 'uj-hands', 'duo-svg ' + (cls || '')); }
  function duoSVGVec(pose, cls){
    var hug = pose === 'hug';
    var a = petSVGVec('love', 1, ''), b = petSVGVec(hug ? 'love' : 'happy', 1, '', 'joa');
    var inner = function(svg){ return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); };
    var dx = hug ? 82 : 96;
    return '<svg class="duo-svg ' + (cls || '') + '" viewBox="0 0 ' + (120 + dx) + ' 124" aria-hidden="true">' +
      '<g class="duo-a" transform="rotate(' + (hug ? 8 : 4) + ' 60 100)"><svg x="0" y="4" width="120" height="120" viewBox="0 0 120 120" overflow="visible">' + inner(a) + '</svg></g>' +
      '<g class="duo-b" transform="translate(' + dx + ' 0) rotate(' + (hug ? -8 : -4) + ' 60 100)"><svg x="0" y="4" width="120" height="120" viewBox="0 0 120 120" overflow="visible">' + inner(b) + '</svg></g>' +
      (hug
        ? '<path d="M86 104q20 6 38-4" fill="none" stroke="#7d5cf5" stroke-width="7" stroke-linecap="round"/><path d="M118 106q-14 5-28-1" fill="none" stroke="#f0707f" stroke-width="7" stroke-linecap="round"/>'
        : '<path d="M94 86q8 6 18 6" fill="none" stroke="#7d5cf5" stroke-width="7" stroke-linecap="round"/><path d="M122 86q-4 6-10 6" fill="none" stroke="#f0707f" stroke-width="7" stroke-linecap="round"/><circle cx="112" cy="92" r="5.5" fill="#ffd1dc"/>') +
      '<path class="duo-h" d="M' + ((120 + dx) / 2) + ' 30c-5-8-17-4-13 5l13 11 13-11c4-9-8-13-13-5z" fill="#ff8fb1"/>' +
      '</svg>';
  }
  /* 홈 2×2 메뉴 타일 · 상품 카드 · 결제 시트 일러스트 */
  var TILE_POSE = { dream:'u-sleep', zodiac:'u-zodiac', book:'u-book', ny:'u-newyear', gh:'uj-hands', coin:'u-money', dreamnum:'u-sleep' };
  function tileArtSVG(kind){ return TILE_POSE[kind] === 'uj-hands' ? duoSVG('hold', 'tile-art') : uniImg(TILE_POSE[kind] || 'u-wave', 'tile-art'); }
  function tileArtSVGVec(kind){
    var inner = function(svg){ return svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); };
    var pet = function(m, x, y, s){ return '<svg x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" viewBox="0 0 120 120" overflow="visible">' + inner(petSVGVec(m, 1, '')) + '</svg>'; };
    if (kind === 'gh') return duoSVGVec('hold', 'tile-art');
    var h = '<svg class="tile-art" viewBox="0 0 140 120" aria-hidden="true">';
    if (kind === 'dream'){
      h += '<path d="M104 14a16 16 0 1 0 14 24a13 13 0 1 1-14-24z" fill="#ffe7a3"/>' +
        '<path d="M14 98c-10 0-12-14-1-15c1-10 15-12 19-3c9-3 15 6 10 12c6 1 6 6 0 6z" fill="#fff" opacity=".9"/>' +
        '<path d="M98 104c-8 0-9-11 0-12c1-8 12-9 15-2c7-2 12 5 8 10c5 1 5 4 0 4z" fill="#fff" opacity=".85"/>' + pet('sleepy', 20, 4, 108);
    } else if (kind === 'zodiac'){
      h += '<g stroke="#fff" stroke-width="1.6" opacity=".9" fill="none"><path d="M12 30L34 14L56 24M98 18L122 30L128 56"/></g>' +
        '<g fill="#fff6c9"><circle cx="12" cy="30" r="3.4"/><circle cx="34" cy="14" r="2.6"/><circle cx="56" cy="24" r="3"/><circle cx="98" cy="18" r="2.6"/><circle cx="122" cy="30" r="3.4"/><circle cx="128" cy="56" r="2.6"/></g>' + pet('happy', 18, 8, 108);
    } else if (kind === 'book'){
      h += pet('calm', 0, 8, 100) + '<g transform="translate(70 60)"><path d="M2 8c12-4 22-3 32 3v40c-10-6-20-7-32-3z" fill="#fff6dc"/><path d="M66 8c-12-4-22-3-32 3v40c10-6 20-7 32-3z" fill="#ffe9b8"/><path d="M34 11v40" stroke="#c9a253" stroke-width="2"/><path d="M8 18h18M8 25h18M8 32h14M42 18h18M42 25h18M42 32h14" stroke="#c9a253" stroke-width="2" stroke-linecap="round" opacity=".7"/></g>';
    } else {
      h += '<g transform="translate(92 54)"><path d="M6 14c-6 10-6 34 18 34s24-24 18-34z" fill="#ff6f7d"/><path d="M8 14h32l-4-8H12z" fill="#e2485a"/><path d="M14 6c4-4 16-4 20 0" fill="none" stroke="#ffd36b" stroke-width="3" stroke-linecap="round"/><text x="24" y="38" font-size="15" font-weight="800" text-anchor="middle" fill="#ffe7a3" font-family="serif">福</text></g>' + pet('love', 4, 6, 108);
    }
    return h + '</svg>';
  }
  /* 우니 (기분별 PNG). 겉 span에 pet-svg·m-기분 클래스를 그대로 둬서 기존 크기·애니메이션 CSS를 이어 쓴다 */
  function petSVG(mood, lv, cls){
    return '<span class="pet-svg ' + (cls || '') + ' m-' + mood + (lv >= 4 ? ' lv-hi' : '') + '" aria-hidden="true"><span class="pbody">' + uniImg(MOOD_POSE[mood] || 'u-calm') + '</span>' +
      (mood === 'sleepy' ? '<span class="pz"><b>z</b><b>z</b></span>' : '') + '</span>';
  }
  /* 벡터 우니 — 공유 카드 이미지(캔버스)처럼 SVG가 꼭 필요한 곳에만 */
  function petSVGVec(mood, lv, cls, pal){
    var u = mood + (++petUid);
    var C = pal === 'joa' ? { hi:'#fff6ee', mid:'#ffc2a6', lo:'#ff7f8e', glow:'#ff9fa8', foot:'#e8566e', ant:'#ffc9b8' } : { hi:'#eef3ff', mid:'#b9a8ff', lo:'#6a45f0', glow:'#8f74ff', foot:'#5b3be8' };
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
    var antGlow = lv >= 2 ? '<circle class="pstar" cx="70" cy="18" r="9" fill="#f3dca0" opacity=".25"/>' : '';
    var cheekStar = lv >= 3 ? '<path d="M30 84l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4zM90 84l1.4 3 3 1.4-3 1.4-1.4 3-1.4-3-3-1.4 3-1.4z" fill="#fff4cc"/>' : '';
    return '<svg class="pet-svg ' + (cls || '') + ' m-' + mood + '" viewBox="0 0 120 120" aria-hidden="true"><defs>' +
      '<radialGradient id="pb' + u + '" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="' + C.hi + '"/><stop offset=".45" stop-color="' + C.mid + '"/><stop offset="1" stop-color="' + C.lo + '"/></radialGradient>' +
      '<radialGradient id="pg' + u + '" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="' + C.glow + '" stop-opacity=".55"/><stop offset="1" stop-color="' + C.glow + '" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="60" cy="66" r="56" fill="url(#pg' + u + ')"/>' + acc +
      '<g class="pbody">' + (pal === 'joa' ? '<path d="M52 38c-2-7 3-12 9-13M68 38c2-7-3-12-9-13" fill="none" stroke="' + C.ant + '" stroke-width="2.6" stroke-linecap="round"/><path class="pstar" d="M60 26c-4-6-13-3-10 4l10 8 10-8c3-7-6-10-10-4z" fill="#ff6f91"/>' :
      '<path d="M60 38c-6 0-8-8-2-16" fill="none" stroke="#c9b9ff" stroke-width="2.6" stroke-linecap="round"/>' + antGlow +
      '<path class="pstar" d="M70 10l2.4 5 5.4.8-3.9 3.8.9 5.4L70 22.5 65.2 25l.9-5.4-3.9-3.8 5.4-.8z" fill="#f3dca0"/>') +
      '<ellipse cx="45" cy="101" rx="9" ry="5" fill="' + C.foot + '"/><ellipse cx="75" cy="101" rx="9" ry="5" fill="' + C.foot + '"/>' +
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
      '<button type="button" class="pet-fig" id="petFig" aria-label="우니 쓰다듬기">' + petSVG(mood, p.lv) + '</button>' +
      '<div class="pet-info"><div class="pet-name">우니<small>Lv.' + p.lv + ' · ' + petStage(p.lv) + '</small></div>' +
      '<p class="pet-say">' + say + '</p>' +
      '<div class="pet-gauge" role="progressbar" aria-label="교감" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p.g + '"><i style="width:' + p.g + '%"></i></div>' +
      '<div class="pet-meta"><span>교감 <b>' + p.g + '</b>/100</span><span>' + (today ? '오늘 +' + today : '오늘 아직 0') + '</span></div></div></div>';
    if (p.g >= 100){
      h += '<button class="btn-primary btn-block pet-claim" id="btnPetClaim">' + TICKET_SVG + '우니의 선물 받기</button>';
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
      if (k === 'dream'){ openDream(); return; }
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
    if (isGuest()){ openLoginSheet('우니의 선물은 로그인하면 받을 수 있어요. 교감 게이지는 그대로 남아 있어요. 처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢도 드려요.'); return; }
    var hasNY = getCoupons().some(function(c){ return c.t === COUPON_DM.t; }), gift;
    if (!hasNY){
      var all = store('unsu_coupons'); all = Array.isArray(all) ? all : [];
      all.unshift({ id:'c' + Date.now().toString(36), t:COUPON_DM.t, name:COUPON_DM.name, exp:Date.now() + COUPON_DM.days * 864e5, used:false });
      store('unsu_coupons', all);
      gift = '<div class="pet-ticket"><small>COUPON</small><b>' + COUPON_DM.name + '</b><span>엽전 없이 꿈풀이 한 번 · 받은 날부터 ' + COUPON_DM.days + '일 동안</span></div>';
    } else {
      gift = '<div class="pet-ticket gold"><small>GIFT</small><b>엽전 100닢</b><span>1회권은 한 장만 가질 수 있어서 엽전으로 드려요</span></div>';
    }
    p.g = 0; p.lv += 1; p.n = (p.n || 0) + 1; savePet(p);
    openSheet('<div class="pet-levelup">' + petSVG('love', p.lv, 'big') + '<h3 id="sheetTitle">우니가 ' + petStage(p.lv) + '(으)로 자랐어요</h3>' +
      '<p class="helper">Lv.' + p.lv + ' · 교감 게이지는 처음부터 다시 채워요</p>' + gift + '</div>' +
      '<button class="btn-primary btn-block" data-close>고마워, 우니야</button>');
    if (hasNY) setTimeout(function(){ addCoins(100, '우니의 선물'); }, 350);
    refreshPetCard(); if (currentView === 'today') renderToday();
  }
  /* 네이티브 광고 자리 (애드핏/애드센스 심사 후 실제 광고로 교체). 원칙: 한 화면에 1개, 결과를 다 본 뒤, 결제 화면에는 넣지 않음 */
  /* =========================================================
     광고 (Google AdSense)
     - 승인 후 ADS.client(ca-pub-…)와 광고 단위 ID(slots)만 채우면 실제 광고로 바뀐다
     - 비어 있거나 Claude 미리보기 안이면 지금처럼 자리 표시만 보여 준다
     - 새로 그려진 <ins class="adsbygoogle">는 아래 MutationObserver가 자동으로 채운다
     ========================================================= */
  var ADS = { client:'', slots:{ feed:'', loading:'' } };
  function adsOn(kind){ return !!(ADS.client && ADS.slots[kind] && isHosted() && !NS); }
  (function adsBoot(){
    if (!ADS.client || !isHosted()) return;
    var sc = document.createElement('script'); sc.async = true; sc.crossOrigin = 'anonymous';
    sc.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(ADS.client);
    document.head.appendChild(sc);
    var fill = function(){
      document.querySelectorAll('ins.adsbygoogle:not([data-pushed])').forEach(function(ins){
        if (!ins.offsetParent && !ins.closest('.gen')) return;
        ins.setAttribute('data-pushed', '1');
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e){}
      });
    };
    new MutationObserver(function(){ requestAnimationFrame(fill); }).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
  })();
  function adSlotHTML(where, kind){
    kind = kind || 'feed';
    if (passActive()) return '';   /* 우니 패스: 광고 없음 */
    if (adsOn(kind)) return '<div class="ad-slot ad-live ad-' + kind + '"><span class="ad-badge">AD</span><ins class="adsbygoogle" style="display:block" data-ad-client="' + ADS.client + '" data-ad-slot="' + ADS.slots[kind] + '"' +
      (kind === 'loading' ? ' data-ad-format="rectangle"' : ' data-ad-format="auto" data-full-width-responsive="true"') + '></ins></div>';
    /* GPT 검토 P0/8: 실서비스(woonijoa.com)에서 광고가 안 붙었으면 자리를 접는다. 배치 확인용 예시는 로컬·미리보기에서만 */
    if (isHosted() && !/^(localhost|127\.|192\.168\.)/.test(location.hostname)) return '';
    return '<div class="ad-slot ad-' + kind + '" aria-label="광고 영역 예시"><span class="ad-badge">AD</span><span class="ph"></span><div><b>' + (kind === 'loading' ? '분석 중 광고 영역' : '네이티브 광고 영역') + '</b><small>' + where + ' · ' + (kind === 'loading' ? '애드센스 승인 후 실제 광고로 바뀌어요' : '콘텐츠 카드와 같은 모양으로 1개만') + '</small></div></div>';
  }
  function renderToday(){
    var body = $('todayBody'), me = getMe();
    if (!me){ renderWelcome(); return; }
    var r = compute(me);
    if (r.error){ body.innerHTML = '<div class="card bx-empty">' + uniImg('u-retry') + '<p class="body-text">대표 사주를 계산할 수 없어요. 사주 목록에서 다른 사주를 대표로 설정해 주세요.</p></div>'; return; }
    var now = new Date();
    var att = attend(); justStamped = att.newly;
    if (att.newly && !isGuest()){ var wmsg = pendingWelcome ? '환영해요! 첫 출석 10닢을 받았어요' : att.bonus ? att.streak + '일 연속 출석! 엽전 +40' : '출석 완료 · 엽전 +10'; setTimeout(function(){ toast(wmsg); }, 600); }
    pendingWelcome = false;
    var f = todayLuck(me, r).f, P = f.pillars;
    var iso = entryISO(me, r), tKey = entryTKey(r);
    var luck = todayLuck(me, r), nums = luck.nums;
    var elc = EL_CLASS[f.luckyEl];
    var mood = moodOf(f); document.body.dataset.mood = mood.key;
    var h = '';
    if (NS) h += demoBarHTML();
    h += attStripHTML(att.newly);
    h += '<div class="today-head"><div class="today-date">' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 ' + WD[now.getDay()] + '요일, 오늘은</div>' +
      '<h1 class="today-title">' + f.head + '</h1>' +
      '<div class="today-ilj">' + P.year.hanja + '年 ' + P.month.hanja + '月 ' + P.day.hanja + '日 · ' + f.ten + '의 날</div><span class="mood-chip" data-mood="' + mood.key + '"><i></i>오늘 기운 · ' + mood.label + '</span></div>';
    h += '<div class="today-fig" id="todayFig">' + figSVG(r.animal, f.auraEl) + '</div>';
    h += peekCardHTML(me, nums, elc);   /* GPT 검토 P1-6: 오늘 한 문장 바로 아래 행운 선물 */
    h += '<div class="qgrid">' + [['btnQNum','dream','꿈해몽','길몽일까 흉몽일까? 오늘의 처방','HOT'],['btnQGh','gh','궁합','둘의 합은 몇 점일까?',''],['btnQZ','zodiac','별자리','오늘의 별자리 운세',''],['btnQNY','ny','2027 신년운세','광고 한 편이면 전체 무료','']].map(function(q){ return '<button type="button" class="qtile q-' + q[1] + '" id="' + q[0] + '"><span class="qt-t">' + q[2] + (q[4] ? '<em>' + q[4] + '</em>' : '') + '</span><span class="qt-s">' + q[3] + '</span>' + tileArtSVG(q[1]) + '</button>'; }).join('') + tkBannerHTML() + '</div>';
    h += '<div class="card lt score-card">' + scoreRowsHTML(f) + '<div class="divider"></div>' +
      '<p class="body-text">' + esc(me.name) + '님, ' + f.body + '</p>' +
      '<button class="btn-soft btn-block" id="btnTodayShare">' + SH_IC.send + '오늘 운세 공유</button></div>';
    h += catChipsHTML(f);
    h += adSlotHTML('오늘 점수를 본 뒤');
    h += todoCardHTML();
    h += petCardHTML();
    h += '<div class="card lt ' + elc + '"><div class="lucky-title">오늘 ' + esc(me.name) + '님에게는<br><em>' + f.bless + '의 기운</em>이 행운을 가져와요.</div>' +
      '<p class="body-text">' + esc(me.name) + '님에게 필요한 ' + MS.EL_K[f.luckyEl] + '(' + MS.EL_H[f.luckyEl] + ') 기운을 가까이 두면 좋은 운은 높이고 흔들리는 운은 잡아 줘요. ' + EL_TEXT[f.luckyEl].act + '처럼 가벼운 행동으로 채워 보세요.</p>' +
      '<button class="row-link" id="btnTips"><span class="ic" style="color:var(--elc)">' + TIP_IC.star + '</span>오늘의 행운 부적 열어 보기<span class="chev">›</span></button></div>';
    var z = getZodiac(r.solar.m, r.solar.d);
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    h += '<div class="card lt"><div class="mini-z">' + figSVG(z.name, z.el, 'mini') + '<div class="view" style="gap:4px"><div class="sec-meta" style="text-align:left">TODAY · ' + z.en.toUpperCase() + '</div><div style="font-size:calc(16px*var(--fs));color:var(--text-headline);font-weight:500">' + z.glyph + ' ' + z.name + '</div><p class="helper">' + DAILY_LINES[doy % DAILY_LINES.length] + '</p></div></div>' +
      '<button class="row-link" id="btnTodayZ"><span class="ic">' + TIP_IC.star + '</span>내 별자리 운세 보기<span class="chev">›</span></button></div>';
    h += deepHTML(me, r);
    h += adSlotHTML('오늘의 결론을 본 뒤');
    var stNow = streakOf(getAtt());
    if (!NS && !store('unsu_auth') && store('unsu_nudge') !== todayStr() && (stNow >= 3 || getCoins() >= 60 || getUnlocks().length))
      h += '<div class="nudge"><div><b>기록이 쌓이고 있어요</b><p>연속 ' + stNow + '일 출석 · 엽전 ' + getCoins() + '닢. 로그인하면 기기를 바꿔도 그대로 이어져요.</p></div><div class="acts"><button class="btn-primary" id="btnNudgeLogin">로그인</button><button class="btn-ghost" id="btnNudgeClose">닫기</button></div></div>';
    h += '<p class="disclaimer">오늘의 운세는 일진과 사주의 관계로 계산한 재미용 콘텐츠예요.</p>';
    body.innerHTML = h;
    $('dpNY').onclick = function(){ openNYSheet(me, r); };
    $('dpGh').onclick = function(){ go('gunghap'); };
    $('dpEz').onclick = function(){ go('saju'); };
    $('dpSet').onclick = function(){ openCoinSheet(); };
    $('dpDm').onclick = function(){ openDream(); };
    $('btnGoNum').onclick = function(){ go('num'); window.scrollTo(0, 0); };
    bindPeek(me, nums);
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
        text:'[우니조아] ' + me.name + '님의 ' + md + ' 운세\n“' + f.head + '”\n재물 ' + f.scores.w + ' · 연애 ' + f.scores.l + ' · 직업 ' + f.scores.j,
        cta:'너의 오늘 운세도 확인해 봐 →', link:resultLink('d', todayStr(), [me]), shareEntries:[me],
        card:{ kicker:me.name + '님의 ' + md + ' 운세', head:f.head, rows:[['재물운', f.scores.w], ['연애운', f.scores.l], ['직업운', f.scores.j]] } });
    };
    $('btnTips').onclick = function(){ go('num'); window.scrollTo(0, 0); };
    $('btnTodayZ').onclick = $('btnQZ').onclick = function(){ myZ = z.name; renderZGrid(); openZodiac(z, iso); show('zodiac'); };
    $('btnQNum').onclick = function(){ openDream(); };
    $('btnQGh').onclick = function(){ go('gunghap'); };
    $('btnQNY').onclick = function(){ openNYSheet(me, r); };
    $('btnTk').onclick = function(){ openTaekil(me, r); };
    body.querySelectorAll('[data-cat]').forEach(function(b){ b.onclick = function(){ openCat(me, r, b.dataset.cat); }; });
  }


  /* =========================================================
     분야별 운세 (금전·연애결혼·취업직장·맞는 직업)
     - 오늘 점수(DAILY.today)는 그대로 쓰고, 원국의 십성 분포 + 올해 세운으로 '타고난 결'과 '올해 흐름'을 붙인다
     - 전부 입력값·날짜 기반이라 공유 링크(?r= 타입 c)로 열어도 같은 내용
     ========================================================= */
  var TEN_GRP = { '비견':'비겁','겁재':'비겁','식신':'식상','상관':'식상','편재':'재성','정재':'재성','편관':'관성','정관':'관성','편인':'인성','정인':'인성' };
  var CATS = {
    money:{ name:'금전운', sk:'w', ic:'coin' },
    love:{ name:'연애·결혼운', sk:'l', ic:'heart' },
    career:{ name:'취업·직장운', sk:'j', ic:'bag' },
    job:{ name:'나에게 맞는 직업', chip:'직업 찾기', sk:'', ic:'compass' }
  };
  var CAT_ORDER = ['money', 'love', 'career', 'job'];
  var CAT_IC = {
    coin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5"/><rect x="9.6" y="9.6" width="4.8" height="4.8"/></svg>',
    heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>',
    bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17"/></svg>',
    compass:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>'
  };
  var CAT_NATAL = {
    money:['원국에 재성(재물의 별)이 드러나 있지 않아요. 돈을 쫓기보다 실력과 사람으로 먼저 인정받고, 그게 수입으로 바뀌는 구조예요. 월급처럼 안정된 흐름이 잘 맞아요.',
      '원국에 재성이 알맞게 자리 잡고 있어요. 들어오는 길과 쓰는 길의 균형이 좋은 편이라, 계획을 세워 모으면 꾸준히 불어나요.',
      '원국에 재성이 많아 돈의 흐름에 밝고 기회를 잘 알아봐요. 벌이는 일이 많아질수록 새는 곳도 생기니, 통장을 나눠 지키는 습관이 재물운을 완성해요.'],
    love:['원국에 배우자의 별이 뚜렷하지 않아 인연을 서두르지 않는 편이에요. 오래 알고 지낸 사람과 자연스럽게 깊어지는 경우가 많아요.',
      '배우자의 별이 알맞게 있어 인연 운이 안정적이에요. 마음을 표현하는 타이밍만 잘 잡으면 관계가 순하게 이어져요.',
      '배우자의 별이 많아 인기가 많고 인연이 자주 찾아와요. 선택지가 많을수록 내 기준을 먼저 세워 두는 게 좋은 인연을 고르는 길이에요.'],
    career:['원국에 관성(직장의 별)이 약해 조직의 틀보다 내 방식대로 일할 때 힘이 나요. 프리랜서·전문직·작은 팀처럼 재량이 큰 자리가 잘 맞아요.',
      '관성이 알맞게 있어 조직 안에서 인정받는 힘이 있어요. 맡은 일을 끝까지 해내는 모습이 평가로 이어져요.',
      '관성이 강해 책임감과 규칙을 중시해요. 체계가 분명한 곳에서 빠르게 자리를 잡지만, 스스로를 몰아붙이지 않게 쉬는 시간도 일정에 넣어 두세요.']
  };
  var CAT_YEAR = {
    '비겁':{ money:'경쟁과 지출이 함께 늘어나는 해예요. 동업이나 보증은 한 번 더 따져 보세요.', love:'내 주장이 강해지는 해라 상대 이야기를 한 번 더 들어 주면 관계가 단단해져요.', career:'독립·창업 욕구가 커지는 해예요. 바로 뛰쳐나가기보다 준비 기간을 두면 성공 확률이 높아져요.' },
    '식상':{ money:'재능이 수입으로 이어지는 해예요. 부업이나 작업물 판매를 시작하기 좋아요.', love:'표현력이 좋아지는 해라 새로운 인연을 만나기 쉬워요. 먼저 말을 거는 쪽이 유리해요.', career:'아이디어가 인정받는 해예요. 기획·콘텐츠·영업처럼 보여 주는 일에서 특히 빛나요.' },
    '재성':{ money:'돈이 크게 움직이는 해예요. 수입이 느는 만큼 지출 계획을 먼저 세워 두세요.', love:'마음과 현실 조건이 함께 맞는 인연이 들어오는 해예요.', career:'성과가 숫자로 보이는 해예요. 연봉 협상이나 이직 조건을 따져 보기 좋아요.' },
    '관성':{ money:'책임이 커지면서 고정 수입이 안정되는 해예요. 무리한 투자보다 쌓는 쪽이 이득이에요.', love:'관계가 공식적으로 진전되는 해예요. 결혼이나 미래 약속 이야기가 오가기 좋아요.', career:'승진·합격·발령처럼 자리가 바뀌는 해예요. 취업운이 가장 강하게 들어오는 흐름이에요.' },
    '인성':{ money:'돈보다 배움에 투자할수록 남는 해예요. 자격증이나 교육비는 아끼지 마세요.', love:'편안하게 기대고 싶은 사람이 나타나는 해예요. 조급함만 내려놓으면 인연이 가까워져요.', career:'시험·자격증·학업에 유리한 해예요. 준비해 온 것이 문서로 결과가 나와요.' }
  };
  var CAT_JOB = {
    '비겁':{ t:'스스로 판을 짜는 일', jobs:['창업가', '프리랜서', '트레이너·코치', '영업 리더'] },
    '식상':{ t:'만들고 표현하는 일', jobs:['디자이너', '콘텐츠 크리에이터', '마케터', '요리사', '강사'] },
    '재성':{ t:'돈과 사람을 움직이는 일', jobs:['사업가', '재무·회계', '커머스 MD', '부동산'] },
    '관성':{ t:'체계 안에서 책임지는 일', jobs:['공무원', '관리직', '법·행정', '군·경찰'] },
    '인성':{ t:'배우고 전하는 일', jobs:['연구원', '교사·교수', '상담사', '의료·약학', '작가'] }
  };
  var EL_FIELD = ['교육·출판·환경', '미디어·IT·뷰티', '부동산·중개·컨설팅', '금융·기계·법조', '무역·유통·연구'];
  function natalGroups(r){
    var P = r.pillars, dS = P.day.stem, c = { '비겁':0, '식상':0, '재성':0, '관성':0, '인성':0 };
    ['year', 'month', 'day', 'hour'].forEach(function(k){
      var p = P[k]; if (!p) return;
      if (k !== 'day') c[TEN_GRP[MS.tenGod(dS, p.stem)]]++;
      c[TEN_GRP[MS.tenGod(dS, MS.BR_MAIN[p.br])]]++;
    });
    return c;
  }
  function lvOf(n){ return n === 0 ? 0 : n <= 2 ? 1 : 2; }
  function catHTML(entry, r, cat){
    var C = CATS[cat], g = natalGroups(r), f = todayLuck(entry, r).f, nm = esc(entry.name);
    var yG = TEN_GRP[r.seun.tenStem], d = nowD(), md = (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    var h = '<div class="cat-head">' + uniCatHTML(cat, C.sk ? tierOf(f.scores[C.sk]) : '', 'ch-uni') + '<div><small>' + md + ' · ' + nm + '님</small><b>' + C.name + '</b></div>' +
      (C.sk ? '<span class="cat-score"><b data-count="' + f.scores[C.sk] + '">' + f.scores[C.sk] + '</b><small>점</small><em class="tier-tag">' + TIER_LABEL[tierOf(f.scores[C.sk])] + '</em></span>' : '') + '</div>';
    if (C.sk){
      var star = cat === 'money' ? '재성' : cat === 'career' ? '관성' : (entry.gender === 'M' ? '재성' : '관성');
      h += '<div class="cat-bar"><i style="--v:' + (f.scores[C.sk] / 100) + '"></i></div><p class="cat-today">“' + f.lines[C.sk] + '”</p>' +
        '<div class="sub-block"><h4>타고난 ' + C.name.replace('운', '') + ' 그릇 <small>' + star + ' ' + g[star] + '개</small></h4><p class="body-text">' + CAT_NATAL[cat][lvOf(g[star])] +
        (cat === 'money' && g['식상'] ? ' 식상(재능)이 재성을 받쳐 주어 손재주·기획·말솜씨가 곧 수입원이 돼요.' : '') +
        (cat === 'career' && g['인성'] ? ' 인성(배움)도 있어 시험·자격증 운이 따라요.' : '') + '</p></div>' +
        '<div class="sub-block"><h4>' + r.seun.year + '년 흐름 <small>' + r.seun.tenStem + '의 해</small></h4><p class="body-text">' + CAT_YEAR[yG][cat] + '</p></div>';
    } else {
      var order = Object.keys(g).sort(function(a, b){ return g[b] - g[a] || Object.keys(g).indexOf(a) - Object.keys(g).indexOf(b); });
      var J1 = CAT_JOB[order[0]], J2 = CAT_JOB[order[1]];
      h += '<p class="cat-today">' + nm + '님은 <b>' + J1.t + '</b>에서 가장 힘이 나요.</p>' +
        '<div class="sub-block"><h4>잘 맞는 직업 <small>' + order[0] + ' ' + g[order[0]] + '개</small></h4><div class="cat-jobs">' + J1.jobs.map(function(j){ return '<span>' + j + '</span>'; }).join('') + '</div></div>' +
        '<div class="sub-block"><h4>함께 살리면 좋은 재능 <small>' + order[1] + '</small></h4><p class="body-text">' + J2.t + '도 잘 맞아요. ' + J2.jobs.slice(0, 3).join(', ') + ' 같은 일과 겹치는 자리라면 더 오래, 즐겁게 일할 수 있어요.</p></div>' +
        '<div class="sub-block"><h4>일간 ' + ILGAN[r.pillars.day.stem].t + '에게 맞는 분야</h4><p class="body-text">' + EL_FIELD[r.dEl] + ' 분야와 인연이 깊어요. ' + r.seun.year + '년 흐름도 함께 보면, ' + CAT_YEAR[yG].career + '</p></div>';
    }
    h += '<p class="disclaimer">사주 원국과 일진으로 계산한 재미용 풀이예요. 실제 결과를 보장하지 않습니다.</p>';
    return h;
  }
  /* 분야별 운세: 우니 일러스트 (점수 단계 → 우니 표정, 분야 → 옆에 떠 있는 작은 배지) */
  var TIER_MOOD = { gold:'love', violet:'happy', mint:'calm', rose:'sleepy' };
  var CAT_POSE = { money:'u-money', love:'u-love', career:'u-work', job:'u-book' };
  function uniCatHTML(cat, tier, cls){
    var C = CATS[cat];
    return '<span class="uni-cat ' + (cls || '') + '" aria-hidden="true">' + uniImg(CAT_POSE[cat] || 'u-calm') + '</span>';
  }
  function catChipsHTML(f){
    var best = CAT_ORDER.filter(function(k){ return CATS[k].sk; }).sort(function(a, b){ return f.scores[CATS[b].sk] - f.scores[CATS[a].sk]; })[0];
    var bt = tierOf(f.scores[CATS[best].sk]);
    var say = bt === 'gold' || bt === 'violet' ? '오늘은 <b>' + CATS[best].name + '</b>이 제일 좋아요. 먼저 볼까요?' : '오늘은 <b>' + CATS[best].name + '</b>부터 차근차근 살펴봐요.';
    return '<div class="card lt cat-card"><div class="sec-head"><h2 class="sec-title">분야별 운세</h2><span class="sec-meta">분야당 ' + CAT_COST + '닢</span></div>' +
      '<div class="cat-guide">' + uniCatHTML(best, bt, 'cg-uni') + '<p class="cg-say">' + say + '</p></div>' +
      '<div class="cat-chips uni">' +
      CAT_ORDER.map(function(k){ var C = CATS[k], t = C.sk ? tierOf(f.scores[C.sk]) : ''; return '<button type="button" data-cat="' + k + '"' + (t ? ' data-tier="' + t + '"' : '') + '>' + uniCatHTML(k, t) + '<span class="nm">' + (C.chip || C.name) + '</span>' + (C.sk ? '<b>' + f.scores[C.sk] + '<small>점</small></b>' : '<b class="go">보기 ›</b>') + '</button>'; }).join('') +
      '</div></div>';
  }
  /* 분야별 운세: 분야당 CAT_COST닢, 연 분야는 그날 하루 다시 볼 수 있다 */
  function catPaid(cat){ var c = store('unsu_catpaid'); return !!(c && c.d === todayStr() && c.c && c.c[cat]); }
  function setCatPaid(cat){ var c = store('unsu_catpaid'); if (!c || c.d !== todayStr()) c = { d:todayStr(), c:{} }; c.c[cat] = 1; store('unsu_catpaid', c); }
  function openCatLock(entry, r, cat){
    var C = CATS[cat], f = todayLuck(entry, r).f, t = C.sk ? tierOf(f.scores[C.sk]) : '';
    var guest = isGuest(), coins = getCoins(), short = !guest && !NS && !passActive() && coins < CAT_COST;
    openSheet('<div class="cat-lock"' + (t ? ' data-tier="' + t + '"' : '') + '>' + uniCatHTML(cat, t, 'cl-uni') +
      '<div class="cl-k">' + esc(entry.name) + '님의 오늘</div><h3 id="sheetTitle">' + C.name + '</h3>' +
      (C.sk ? '<div class="cl-score"><b>' + f.scores[C.sk] + '</b>점</div><p class="cl-line">“' + f.lines[C.sk] + '”</p>' : '<p class="cl-line">타고난 사주로 보는 나에게 맞는 일</p>') +
      '<div class="cl-blur" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<ul class="cl-list">' + (C.sk ? '<li>오늘 점수와 한 줄 풀이</li><li>타고난 ' + C.name.replace('운', '') + ' 그릇 (사주 원국)</li><li>올해 이 분야의 흐름</li>' : '<li>잘 맞는 직업 목록</li><li>함께 살리면 좋은 재능</li><li>일간에 맞는 분야와 올해 흐름</li>') + '</ul>' +
      passLinkHTML() + '<button class="btn-primary btn-block" id="clBuy">' + (guest ? '로그인하고 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢 받기' : short ? buyLabel('cat') : (passActive() ? '우니 패스로 열기' : COIN_SVG + '엽전 ' + CAT_COST + '닢으로 열기')) + '</button>' +
      '<p class="helper" style="text-align:center;margin-top:8px">' + (guest ? '로그인하면 바로 받은 엽전으로 열 수 있어요.' : NS ? '예시 모드에서는 엽전 없이 열어 볼 수 있어요.' : short ? '엽전이 ' + (CAT_COST - coins) + '닢 부족해요. 보유 ' + coins + '닢' : '보유 ' + coins.toLocaleString() + '닢 · 열면 오늘 하루 계속 볼 수 있어요') + '</p></div>');
    $('clBuy').onclick = function(){
      if (guest){ openLoginSheet('로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요. 분야별 운세는 분야당 ' + CAT_COST + '닢이에요.', { k:'cat', id:entry.id, cat:cat }); return; }
      var item = 'cat:' + (entry.id || '') + ':' + cat + ':' + todayStr(), rs = { k:'cat', id:entry.id, cat:cat };
      if (short){ openBuySheet({ cost:CAT_COST, why:C.name + ' 열기', item:item, rs:rs }); return; }
      spendCoins(CAT_COST, C.name + ' 열기', item, function(){ setCatPaid(cat); openCat(entry, r, cat); }, rs);
    };
  }
  function openCat(entry, r, cat){
    if (!catPaid(cat)){ openCatLock(entry, r, cat); return; }
    var date = todayStr();
    var cf = todayLuck(entry, r).f, csk = CATS[cat].sk;
    openSheet('<div class="cat-sheet"' + (csk ? ' data-tier="' + tierOf(cf.scores[csk]) + '"' : '') + '>' + catHTML(entry, r, cat) + '</div>' +
      '<div class="cat-next"><small>다른 분야도 볼까요?</small><div>' + CAT_ORDER.filter(function(k){ return k !== cat; }).map(function(k){ return '<button type="button" data-next="' + k + '">' + (CATS[k].chip || CATS[k].name) + '</button>'; }).join('') + '</div></div>' +
      '<button class="btn-primary btn-block" id="btnCatShare" style="margin-top:14px">' + SH_IC.send + '이 결과 공유하기</button>' +
      adSlotHTML(CATS[cat].name + '을 본 뒤'));
    countUp($('sheetBody'));
    $('sheetBody').querySelectorAll('[data-next]').forEach(function(b){ b.onclick = function(){ openCat(entry, r, b.dataset.next); }; });
    $('btnCatShare').onclick = function(){
      var f = todayLuck(entry, r).f, C = CATS[cat];
      openShare({ sheetTitle:C.name + ' 공유', title:entry.name + '님의 ' + C.name, desc:C.sk ? '오늘 ' + f.scores[C.sk] + '점 · ' + f.lines[C.sk] : '나에게 맞는 일 · ' + CAT_JOB[Object.keys(natalGroups(r)).sort(function(a, b){ var g = natalGroups(r); return g[b] - g[a]; })[0]].t,
        fig:figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
        text:'[우니조아] ' + entry.name + '님의 ' + C.name + (C.sk ? ' ' + f.scores[C.sk] + '점\n“' + f.lines[C.sk] + '”' : ''),
        cta:'내 ' + C.name + '도 보기 →', link:resultLink('c', date, [entry], cat), shareEntries:[entry],
        card:C.sk ? { kicker:entry.name + '님의 오늘 ' + C.name, head:'“' + f.lines[C.sk] + '”', rows:[[C.name, f.scores[C.sk]]] } : null });
    };
  }

  /* =========================================================
     중요한 날 잡기 (택일) — 2026-11-17 소율 선택: 분야별 운세와 별도 기능
     - 무료: 이번 달·다음 달 달력(좋음·보통·피할 날)과 피할 날 이유 (2026-11-17 소율: 1년 달력, 평일만 제거, 가격 상향)
     - 엽전 COST.tk(500): 12개월 전체 + 베스트 5일 + 달마다 베스트 + 이유·시간대 + 캘린더 저장 + 공유, 개업이면 사업운 섹션까지
     - 사람·목적별로 한 번 열면 계속 볼 수 있다 (unsu_tk_open: { '사람id|목적': 연 시각 })
     ========================================================= */
  var TK = { p:'open', mi:0, sel:null };
  var TK_IC = {
    open:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M4 9.5L5.5 4h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20"/></svg>',
    contract:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4M9 12h6M9 15.5h4"/><circle cx="16" cy="18" r="2.2"/></svg>',
    move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/></svg>',
    exam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M12 4l9 4.5-9 4.5-9-4.5z"/><path d="M7 10.8V15c0 1.4 2.2 2.8 5 2.8s5-1.4 5-2.8v-4.2M21 8.5v5"/></svg>',
    love:CAT_IC.heart
  };
  var TK_TIER = { good:'좋음', mid:'보통', bad:'피할 날' };
  var TK_DT = { good:'gold', mid:'violet', bad:'rose' };
  function tkOpenMap(){ var o = store('unsu_tk_open'); return o && typeof o === 'object' ? o : {}; }
  function tkOpen(entry, p){ return !!tkOpenMap()[entry.id + '|' + p]; }
  function setTkOpen(entry, p){ var o = tkOpenMap(); o[entry.id + '|' + p] = Date.now(); store('unsu_tk_open', o); }
  function tkMD(d){ return (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; }
  function tkMDW(d){ return tkMD(d) + ' (' + WD[d.getDay()] + ')'; }
  var TK_FREE_M = 2;   /* 무료: 이번 달 + 다음 달까지 색 공개, 나머지 10개월은 열면 보임 */
  function tkCalHTML(M, mi, open){
    var locked = !open && mi >= TK_FREE_M, rank = {};
    if (open && M.best) rank[M.best.key] = 1;
    var first = new Date(M.y, M.m - 1, 1), h = '<div class="tk-cal' + (locked ? ' locked' : '') + '" aria-label="' + M.y + '년 ' + M.m + '월 길흉 달력"><div class="tk-wd">' + WD.map(function(w, i){ return '<span' + (i === 0 ? ' class="sun"' : i === 6 ? ' class="sat"' : '') + '>' + w + '</span>'; }).join('') + '</div><div class="tk-grid">';
    for (var i = 0; i < first.getDay(); i++) h += '<span class="tk-pad"></span>';
    M.days.forEach(function(o){
      var d = o.date, t = o.past || locked ? '' : TK_DT[o.tier], rk = rank[o.key];
      h += '<button type="button" class="tk-d' + (o.past ? ' past' : '') + (rk ? ' best' : '') + (TK.sel === o.key ? ' sel' : '') + '" data-tk="' + o.key + '"' + (t ? ' data-tier="' + t + '"' : '') + (o.past ? ' disabled' : '') +
        ' aria-label="' + tkMDW(d) + (o.past ? ' 지난 날' : locked ? '' : ' ' + TK_TIER[o.tier]) + (rk ? ' 이달의 베스트' : '') + '"><b>' + d.getDate() + '</b>' + (rk ? '<em>★</em>' : '') + (o.son && !locked ? '<i class="son"></i>' : '') + '</button>';
    });
    h += '</div>';
    if (locked) h += '<div class="tk-cal-lock">' + LOCK_SVG + '<b>' + M.m + '월 길일은 1년 전체 보기에서 열려요</b><small>이번 달과 다음 달은 무료로 볼 수 있어요</small></div>';
    return h + '</div>';
  }
  function tkLegendHTML(purpose){
    return '<div class="tk-legend"><span data-tier="gold"><i></i>좋음</span><span data-tier="violet"><i></i>보통</span><span data-tier="rose"><i></i>피할 날</span>' + (purpose === 'move' ? '<span class="son"><i></i>손없는날</span>' : '') + '<span class="star"><i>★</i>이달의 베스트</span></div>';
  }
  function tkDayHTML(o, open, locked){
    if (!o) return '<p class="helper tk-hint">날짜를 누르면 그날의 일진과 풀이를 볼 수 있어요.</p>';
    if (locked) return '<div class="tk-day"><div class="tk-day-h"><b>' + tkMDW(o.date) + '</b><span>' + o.pillar.name + '(' + o.pillar.hanja + ')일</span></div><p class="helper">이 날의 길흉은 1년 전체 보기에서 열려요.</p></div>';
    var h = '<div class="tk-day" data-tier="' + TK_DT[o.tier] + '"><div class="tk-day-h"><b>' + tkMDW(o.date) + '</b><span>' + o.pillar.name + '(' + o.pillar.hanja + ')일 · ' + o.ten + '의 날</span>' +
      '<em>' + TK_TIER[o.tier] + (open ? ' · ' + o.score + '점' : '') + '</em></div>';
    if (o.tier === 'bad' || open){
      var lines = (open ? o.why.slice(0, 3) : []).map(function(t){ return '<li class="ok">' + t + '</li>'; }).concat(o.warn.slice(0, 2).map(function(t){ return '<li class="ng">' + t + '</li>'; }));
      if (lines.length) h += '<ul class="tk-why">' + lines.join('') + '</ul>';
      if (open && o.tier !== 'bad') h += '<p class="tk-hours">좋은 시간 · ' + o.hours.map(function(x){ return '<b>' + x.txt + '</b>'; }).join(' 또는 ') + '</p>';
    } else h += '<p class="helper">이 날이 왜 ' + TK_TIER[o.tier] + '인지, 몇 시가 좋은지는 1년 전체 보기에서 열려요.</p>';
    return h + '</div>';
  }
  var BIZ_TYPE = {
    '식상':{ t:'재능을 파는 크리에이터형', d:'내 손과 머리에서 나온 결과물이 곧 상품이에요. 디자인·콘텐츠·강의·제작처럼 실력이 보이는 일에서 단골이 생겨요. 가격은 처음부터 낮추지 말고 포트폴리오로 설득하세요.' },
    '재성':{ t:'돈 흐름을 읽는 장사꾼형', d:'어디서 돈이 들고 나는지 감이 빨라요. 유통·커머스·중개처럼 거래가 많은 일과 잘 맞고, 숫자를 매주 확인하는 습관이 그대로 매출이 돼요.' },
    '비겁':{ t:'혼자 판을 짜는 독립형', d:'남 밑보다 내 이름을 걸고 할 때 힘이 나요. 다만 동업이나 지분 나누기는 역할과 돈 규칙을 문서로 먼저 정해 두세요.' },
    '관성':{ t:'신뢰로 거래하는 체계형', d:'약속과 품질을 지키는 모습이 곧 브랜드예요. B2B·외주·납품처럼 계약 단위로 움직이는 일에서 오래가요.' },
    '인성':{ t:'전문성으로 버는 자격형', d:'배운 것과 자격이 무기예요. 상담·교육·전문 서비스처럼 신뢰가 쌓일수록 단가가 오르는 일이 잘 맞아요.' }
  };
  function tkBizHTML(entry, r){
    var g = natalGroups(r), keys = Object.keys(g), top = keys.slice().sort(function(a, b){ return g[b] - g[a] || keys.indexOf(a) - keys.indexOf(b); })[0];
    var B = BIZ_TYPE[top], yG = TEN_GRP[r.seun.tenStem], tips = [];
    if (!g['재성']) tips.push('원국에 재성(돈의 별)이 드러나 있지 않아요. 매출 통장과 생활비 통장을 나누고, 정산은 날짜를 정해 자동으로 돌리세요.');
    if (g['비겁'] >= 3) tips.push('비겁이 많아 동업·지인 거래에서 돈이 새기 쉬워요. 처음부터 계약서와 세금계산서로 깔끔하게 남기세요.');
    if (g['식상'] && g['재성']) tips.push('식상(재능)이 재성(돈)을 받쳐 주는 구조라 실력이 수입으로 이어지는 길이 열려 있어요.');
    return '<div class="card tk-biz"><div class="sec-head"><h2 class="sec-title">' + esc(entry.name) + '님의 사업운</h2><span class="sec-meta">개업 목적에 포함</span></div>' +
      '<div class="sub-block"><h4>사업 기질 · ' + B.t + ' <small>' + top + ' ' + g[top] + '개</small></h4><p class="body-text">' + B.d + '</p></div>' +
      '<div class="sub-block"><h4>' + r.seun.year + '년 사업 흐름 <small>' + r.seun.tenStem + '의 해</small></h4><p class="body-text">' + CAT_YEAR[yG].money + ' ' + CAT_YEAR[yG].career + '</p></div>' +
      (tips.length ? '<div class="sub-block"><h4>챙겨 두면 좋은 점</h4><p class="body-text">' + tips.join(' ') + '</p></div>' : '') + '</div>';
  }
  function tkICS(entry, S){
    var P = TAEKIL.PURPOSES[S.purpose], stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    function esc2(t){ return String(t).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n'); }
    function d8(d){ return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()); }
    var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//woonijoa//taekil//KO', 'CALSCALE:GREGORIAN'];
    S.best.forEach(function(b, i){
      var nx = new Date(b.date.getFullYear(), b.date.getMonth(), b.date.getDate() + 1);
      L.push('BEGIN:VEVENT', 'UID:' + b.key + '-' + S.purpose + '-' + entry.id + '@woonijoa.com', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d8(b.date), 'DTEND;VALUE=DATE:' + d8(nx),
        'SUMMARY:' + esc2('[우니조아] ' + P.short + ' 좋은 날 ' + (i + 1) + '순위'),
        'DESCRIPTION:' + esc2(b.pillar.name + '일 · ' + b.why.slice(0, 2).join(' / ') + '\n좋은 시간: ' + b.hours.map(function(x){ return x.txt; }).join(' 또는 ')), 'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([L.join('\r\n')], { type:'text/calendar;charset=utf-8' }));
    a.download = 'woonijoa-' + S.purpose + '-days.ics'; document.body.appendChild(a); a.click(); a.remove();
    toast('캘린더 파일을 저장했어요. 열면 일정에 추가돼요');
  }
  function openTaekil(entry, r, p){
    if (!entry){ startOnboarding('new'); return; }
    if (p && p !== TK.p){ TK.p = p; TK.sel = null; }
    var keepY = !$('sheetWrap').hidden && $('sheetBody').querySelector('.tk-wrap') ? $('sheet').scrollTop : 0;
    var P = TAEKIL.PURPOSES[TK.p], S = TAEKIL.scanYear(entry, r, TK.p, nowD()), open = tkOpen(entry, TK.p), nm = esc(entry.name);
    TK.mi = Math.max(0, Math.min(11, TK.mi || 0));
    var M = S.months[TK.mi], locked = !open && TK.mi >= TK_FREE_M;
    var sel = null; if (TK.sel) S.months.forEach(function(mm){ mm.days.forEach(function(o){ if (o.key === TK.sel && !o.past) sel = o; }); });
    if (sel && sel.mi !== TK.mi) sel = null;
    var guest = isGuest(), coins = getCoins(), short = !guest && !NS && !passActive() && coins < COST.tk;
    var avoid = locked ? [] : M.days.filter(function(o){ return !o.past && o.tier === 'bad'; });
    var h = '<div class="tk-wrap"><div class="tk-top"><div class="tk-uni">' + uniImg('u-calendar') + '</div><div><small>' + nm + '님 사주로 고르는</small><h3 id="sheetTitle">중요한 날 잡기</h3></div></div>' +
      '<div class="tk-ps" role="tablist" aria-label="무엇을 하는 날인가요">' + TAEKIL.ORDER.map(function(k){ var Q = TAEKIL.PURPOSES[k];
        return '<button type="button" role="tab" data-tkp="' + k + '" aria-selected="' + (k === TK.p) + '">' + TK_IC[k] + '<span>' + Q.name.replace('·', '·<wbr>') + '</span>' + (tkOpen(entry, k) ? '<i class="on" aria-label="열림"></i>' : '') + '</button>'; }).join('') + '</div>' +
      '<p class="tk-sum">앞으로 1년, <b>' + P.short + '</b>에 좋은 날이 <b>' + S.good + '일</b> 있어요.' + (open ? '' : ' 이번 달과 다음 달은 무료로 볼 수 있어요.') + '</p>' +
      '<div class="tk-months" role="tablist" aria-label="월 선택">' + S.months.map(function(mm, i){ var lk = !open && i >= TK_FREE_M;
        return '<button type="button" role="tab" data-tkm="' + i + '" aria-selected="' + (i === TK.mi) + '"' + (lk ? ' class="lk"' : '') + '>' + (i === 0 || mm.m === 1 ? '<small>' + mm.y + '</small>' : '') + '<b>' + mm.m + '월</b>' + (lk ? '<i>' + LOCK_SVG + '</i>' : '<i class="n">좋은 날 ' + mm.good + '</i>') + '</button>'; }).join('') + '</div>' +
      '<div class="tk-mhead"><button type="button" class="tk-nav" data-tkstep="-1" aria-label="이전 달"' + (TK.mi === 0 ? ' disabled' : '') + '>‹</button><b>' + M.y + '년 ' + M.m + '월</b><button type="button" class="tk-nav" data-tkstep="1" aria-label="다음 달"' + (TK.mi === 11 ? ' disabled' : '') + '>›</button></div>' +
      tkCalHTML(M, TK.mi, open) + tkLegendHTML(TK.p) + '<div id="tkDay">' + tkDayHTML(sel, open, locked) + '</div>';
    if (avoid.length) h += '<div class="tk-avoid"><h4>' + M.m + '월에 피해야 할 날' + (open ? '' : ' <small>무료</small>') + '</h4><div class="tk-av-list">' + avoid.map(function(o){ return '<button type="button" data-tk="' + o.key + '">' + tkMDW(o.date) + '</button>'; }).join('') + '</div>' +
      '<p class="helper">' + nm + '님의 일지 ' + r.pillars.day.bk + '(' + r.pillars.day.bh + ')와 충이 되거나 기운이 가장 약한 날이에요. 큰 결정은 이날만 피해도 반은 성공이에요.</p></div>';
    if (open){
      h += '<div class="tk-best"><h4>1년 중 ' + P.short + ' 베스트 5일</h4>' + S.best.map(function(b, i){
        return '<div class="tk-bc" data-tier="' + (i ? 'violet' : 'gold') + '"><div class="tk-bc-h"><em>' + (i + 1) + '</em><div><b>' + b.date.getFullYear() + '. ' + tkMDW(b.date) + '</b><small>' + b.pillar.name + '(' + b.pillar.hanja + ')일 · ' + b.ten + '</small></div><span><b>' + b.score + '</b>점</span></div>' +
          '<ul class="tk-why">' + b.why.slice(0, 3).map(function(t){ return '<li class="ok">' + t + '</li>'; }).join('') + b.warn.slice(0, 1).map(function(t){ return '<li class="ng">' + t + '</li>'; }).join('') + '</ul>' +
          '<p class="tk-hours">좋은 시간 · ' + b.hours.map(function(x){ return '<b>' + x.name + '</b> ' + x.txt; }).join(' / ') + '</p></div>';
      }).join('') +
      '<div class="tk-mb"><h4>달마다 가장 좋은 날</h4><div class="tk-mb-list">' + S.months.map(function(mm, i){ return mm.best ? '<button type="button" data-tkgo="' + i + '" data-key="' + mm.best.key + '"><small>' + mm.m + '월</small><b>' + mm.best.date.getDate() + '일 (' + WD[mm.best.date.getDay()] + ')</b></button>' : ''; }).join('') + '</div></div>' +
      '<div class="row" style="margin-top:4px"><button class="btn-soft grow" id="tkIcs">캘린더에 저장</button><button class="btn-primary grow" id="tkShare">' + SH_IC.send + '공유하기</button></div></div>';
      if (TK.p === 'open') h += tkBizHTML(entry, r);
    } else {
      h += '<div class="tk-lock"><h4>1년 전체 보기 <small>' + P.short + '</small></h4><div class="tk-lock-rows" aria-hidden="true">' + [1, 2, 3].map(function(i){ return '<div><em>' + i + '</em><span>●●●●. ●●월 ●●일</span><i></i></div>'; }).join('') + '</div>' +
        '<ul class="lock-list">' + ['12개월 달력 전체의 좋은 날·피할 날', '1년 중 베스트 5일과 고른 이유', '달마다 가장 좋은 날', '그날 좋은 시간대 (시진)', '캘린더 저장 · 공유 카드'].concat(TK.p === 'open' ? ['내 사업 기질과 ' + r.seun.year + '년 사업 흐름'] : []).map(function(t){ return '<li>' + LOCK_SVG + t + '</li>'; }).join('') + '</ul>' +
        passLinkHTML() + '<button class="btn-primary btn-block sheen" id="tkBuy">' + (guest ? '로그인하고 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢 받기' : short ? buyLabel('tk') : (passActive() ? '우니 패스로 1년 전체 열기' : COIN_SVG + '엽전 ' + COST.tk + '닢으로 1년 전체 열기')) + '</button>' +
        '<p class="helper" style="text-align:center;margin-top:8px">' + (guest ? '로그인하면 받은 엽전으로 바로 열 수 있어요.' : NS ? '예시 모드에서는 엽전 없이 열어 볼 수 있어요.' : short ? '엽전이 ' + (COST.tk - coins) + '닢 부족해요. 보유 ' + coins + '닢' : '보유 ' + coins.toLocaleString() + '닢 · ' + nm + '님의 ' + P.short + ' 달력은 계속 다시 볼 수 있어요') + '</p></div>';
    }
    if (TK.p === 'open') h += '<p class="tk-note">홈택스 개업일은 실제로 사업을 시작하는 날로 적어요. 사업자등록은 개업일 전에 미리 하거나, 개업일부터 20일 안에 신청하면 돼요.</p>';
    h += '<p class="disclaimer">일진과 사주 원국의 관계로 계산한 재미용 풀이예요. 실제 결과를 보장하지 않습니다.</p>' + (open ? adSlotHTML('중요한 날을 본 뒤') : '') + '<button class="text-btn" data-close>닫기</button></div>';
    openSheet(h);
    if (keepY) $('sheet').scrollTop = keepY;
    var body = $('sheetBody'), strip = body.querySelector('.tk-months');
    var on = strip.querySelector('[aria-selected="true"]'); if (on) strip.scrollLeft = on.offsetLeft - strip.clientWidth / 2 + on.offsetWidth / 2;
    function goMonth(i, key){ TK.mi = i; TK.sel = key || null; openTaekil(entry, r); }
    body.querySelectorAll('[data-tkp]').forEach(function(b){ b.onclick = function(){ openTaekil(entry, r, b.dataset.tkp); }; });
    body.querySelectorAll('[data-tkm]').forEach(function(b){ b.onclick = function(){ goMonth(+b.dataset.tkm); }; });
    body.querySelectorAll('[data-tkstep]').forEach(function(b){ b.onclick = function(){ goMonth(TK.mi + (+b.dataset.tkstep)); }; });
    body.querySelectorAll('[data-tkgo]').forEach(function(b){ b.onclick = function(){ goMonth(+b.dataset.tkgo, b.dataset.key); var c = $('sheetBody').querySelector('.tk-mhead'); if (c) c.scrollIntoView({ block:'start', behavior:reduceMotion ? 'auto' : 'smooth' }); }; });
    body.querySelectorAll('[data-tk]').forEach(function(b){ b.onclick = function(){
      TK.sel = b.dataset.tk;
      body.querySelectorAll('.tk-d.sel').forEach(function(x){ x.classList.remove('sel'); });
      var c = body.querySelector('.tk-d[data-tk="' + TK.sel + '"]'); if (c) c.classList.add('sel');
      $('tkDay').innerHTML = tkDayHTML(M.days.filter(function(o){ return o.key === TK.sel; })[0], open, locked);
      if (b.closest('.tk-av-list')) $('tkDay').scrollIntoView({ block:'nearest', behavior:reduceMotion ? 'auto' : 'smooth' });
    }; });
    if ($('tkBuy')) $('tkBuy').onclick = function(){
      if (guest){ openLoginSheet('로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요. 중요한 날 1년 전체 보기는 ' + COST.tk + '닢이에요.', { k:'tk', id:entry.id, p:TK.p }); return; }
      var item = 'tk:' + (entry.id || '') + ':' + TK.p, rs = { k:'tk', id:entry.id, p:TK.p };
      if (short){ openBuySheet({ cost:COST.tk, why:'중요한 날 잡기 · ' + P.short, item:item, rs:rs }); return; }
      spendCoins(COST.tk, '중요한 날 잡기 · ' + P.short, item, function(){
        setTkOpen(entry, TK.p);
        var b0 = S.best[0]; if (b0){ TK.mi = b0.mi; TK.sel = b0.key; }
        openTaekil(entry, r);
      }, rs);
    };
    if ($('tkIcs')) $('tkIcs').onclick = function(){ tkICS(entry, S); };
    if ($('tkShare')) $('tkShare').onclick = function(){
      var b0 = S.best[0]; if (!b0) return;
      openShare({ sheetTitle:'좋은 날 공유', title:entry.name + '님의 ' + P.short + ' 좋은 날', desc:'1순위 ' + tkMDW(b0.date) + ' · ' + b0.pillar.name + '일',
        fig:figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
        text:'[우니조아] ' + entry.name + '님의 ' + P.name + ' 좋은 날\n' + S.best.slice(0, 3).map(function(b, i){ return (i + 1) + '순위 ' + tkMDW(b.date); }).join('\n'),
        cta:'내 사주로 좋은 날 찾아보기 →', link:shareBase(),
        card:{ kicker:entry.name + '님의 ' + P.short + ' 좋은 날', head:tkMDW(b0.date), tag:'1순위 · ' + b0.pillar.name + '일', rows:S.best.slice(0, 3).map(function(b, i){ return [(i + 1) + '순위 ' + tkMD(b.date), b.score]; }) } });
    };
  }
  function tkBannerHTML(){
    return '<button type="button" class="qtile q-tk" id="btnTk"><span class="qt-t">중요한 날 잡기<em>NEW</em></span><span class="qt-s">개업·계약·이사·면접 날짜를<br>내 사주로 골라 드려요</span>' + uniImg('u-calendar', 'tile-art') + '</button>';
  }

  /* =========================================================
     행운 탭 — 복주머니를 열면 오늘의 행운 부적(색 · 방향 · 숫자 3개 · 아이템 · 시간)이 나온다
     2026-11-21: 번호 추첨 기능을 없애고 '오늘의 행운 세트'로 바꿨다. 숫자는 세트 안의 작은 힌트일 뿐이다.
     ========================================================= */
  function getBox(){ var b = store('unsu_numbox'); return Array.isArray(b) ? b : []; }
  function saveToBox(item){
    var b = getBox();
    if (b.some(function(x){ return x.d === item.d && x.kind === item.kind && x.nums.join() === item.nums.join(); })){ toast('이미 보관함에 있는 부적이에요'); return false; }
    b.unshift(item); if (b.length > 50) b.length = 50; store('unsu_numbox', b); return true;
  }
  /* 행운 숫자 칩 — 공이 아니라 오행 색 이름표 */
  function luckChips(nums, cls){
    return '<div class="lk-row ' + (cls || '') + '">' + nums.map(function(n){ return '<span class="lk-chip">' + n + '</span>'; }).join('') + '</div>';
  }
  function luckTime(me, r){
    var rnd = mulberry32(seedHash(entryISO(me, r) + '|' + todayStr() + '|lktime'));
    return GIFT_TIMES[Math.floor(rnd() * GIFT_TIMES.length)];
  }
  /* 오늘의 한마디: 오늘 필요한 오행을 채우는 생활 조언. 홈의 운세 문장과 겹치지 않게 '어떻게 보내면 좋은지'만 말한다 */
  var ADVICE = [
    ['새싹은 하루아침에 자라지 않아요. 오늘 시작한 작은 일 하나가 내일의 숲이 돼요.', '창문을 열고 바깥 공기를 한 번 깊게 들이마셔 보세요.', '미뤄 둔 공부나 계획을 딱 10분만 시작해 보세요.', '굽은 나무도 햇빛 쪽으로 자라요. 마음이 가는 쪽으로 한 걸음만 옮겨 보세요.', '초록 잎을 가까이 두면 생각이 맑아져요. 화분 하나, 풀 한 줄기도 좋아요.', '오늘은 새로 만나는 사람에게 먼저 인사를 건네 보세요.'],
    ['작은 불씨가 방 전체를 데워요. 오늘은 내 마음을 조금 더 표현해 보세요.', '햇볕을 10분만 쬐어도 기운이 차올라요. 점심엔 잠깐 밖으로 나가 보세요.', '고마웠던 사람에게 짧은 메시지 하나를 보내 보세요.', '불은 나눌수록 꺼지지 않아요. 내가 아는 것을 하나 알려 주는 날이에요.', '몸을 가볍게 움직이면 마음도 따라 밝아져요. 계단 한 층이라도 걸어 보세요.', '오늘의 칭찬은 아끼지 마세요. 돌아오는 말이 하루를 데워 줘요.'],
    ['땅은 서두르지 않아도 모든 것을 키워요. 오늘은 한 가지를 끝까지 마무리하세요.', '책상이나 가방 한 칸을 정리하면 마음의 자리도 넓어져요.', '끼니를 제때 챙기는 것이 오늘의 가장 좋은 처방이에요.', '흔들릴 때는 발밑을 보세요. 이미 해낸 일을 하나 떠올려 보세요.', '약속은 작게 하고 꼭 지키세요. 믿음이 쌓이는 날이에요.', '오늘 쓴 돈을 한 번 적어 보세요. 새는 곳이 보이면 채울 곳도 보여요.'],
    ['쇠는 다듬을수록 빛나요. 오늘은 필요 없는 것 하나를 덜어 내 보세요.', '할 일 목록을 세 줄로 줄이면 오늘이 훨씬 가벼워져요.', '결정은 기준을 먼저 적고 하세요. 마음보다 기준이 오늘을 지켜 줘요.', '맑은 소리는 빈 종에서 나요. 잠깐의 조용한 시간을 꼭 가져 보세요.', '끝맺음이 좋은 날이에요. 미뤄 둔 답장이나 정산을 마무리해 보세요.', '오늘은 말을 아끼고 잘 들어 주세요. 필요한 답이 그 안에 있어요.'],
    ['물은 막히면 돌아가요. 오늘 안 풀리는 일은 다른 길로 가 보세요.', '물 한 잔을 천천히 마시며 하루를 시작해 보세요.', '생각이 많을 땐 적어 보세요. 글로 흐르면 마음도 흘러가요.', '깊은 물은 소리가 없어요. 오늘은 조용히 실력을 쌓는 날이에요.', '잠을 조금 일찍 청해 보세요. 충분한 쉼이 내일의 운을 채워요.', '흐르는 음악 한 곡이 막힌 기분을 풀어 줘요. 좋아하는 노래를 틀어 보세요.']
  ];
  function adviceOf(me, r, el){
    var rnd = mulberry32(seedHash(entryISO(me, r) + '|' + todayStr() + '|advice'));
    var L = ADVICE[el]; return L[Math.floor(rnd() * L.length)];
  }
  function talismanHTML(me, r, luck, shown){
    var f = luck.f, lEl = luck.el, elc = EL_CLASS[lEl], nums = luck.nums.map(function(o){ return o.n; });
    var now = nowD(), md = (now.getMonth() + 1) + '월 ' + now.getDate() + '일';
    var cell = function(k, v){ return '<div class="tl-row"><span class="k">' + k + '</span><b>' + v + '</b></div>'; };
    return '<div id="numReveal" class="num-reveal"' + (shown ? '' : ' hidden') + '>' +
      '<div class="card talisman ' + elc + '"><div class="tl-k">' + md + ' · ' + MS.EL_K[lEl] + '(' + MS.EL_H[lEl] + ') 기운을 채우는 날</div>' +
      '<h2 class="tl-head">' + esc(f.head) + '</h2>' +
      '<blockquote class="tl-quote"><small>오늘의 한마디</small><p>' + adviceOf(me, r, lEl) + '</p></blockquote>' +
      '<div class="tl-rows">' +
        cell('행운의 색', f.tip.color) + cell('행운의 방향', EL_TEXT[lEl].dir) +
        cell('행운 아이템', f.tip.item) + cell('행운 음식', f.tip.food) +
        cell('좋은 시간', luckTime(me, r)) + cell('행운의 숫자', nums.join(' · ')) +
      '</div>' +
      '<p class="helper">행운의 숫자는 ' + MS.EL_K[lEl] + ' 기운의 끝자리(' + EL_TEXT[lEl].num.map(function(n){ return n % 10; }).join('·') + ')로 골랐어요. 약속 시간이나 자리를 고를 때 가볍게 참고해 보세요.</p>' +
      '<div class="row"><button class="btn-primary grow sheen" id="btnNumSave">' + SAVE_IC + '보관함에 저장</button><button class="btn-soft grow" id="btnNumCopy">공유하기</button></div>' +
      '<p class="disclaimer">재미로 즐기는 운세 콘텐츠예요. 내 사주에 필요한 기운을 바탕으로 매일 새로 만들어요.</p></div>' +
      adSlotHTML('행운 부적을 열어 본 뒤') + '</div>';
  }
  function revealNums(){
    var el = $('numReveal'); if (!el || !el.hidden) return;
    el.hidden = false; if ($('numWait')) $('numWait').hidden = true; if ($('pouchAd')) $('pouchAd').hidden = true;
    if (!reduceMotion){ el.classList.remove('nr-in'); void el.offsetWidth; el.classList.add('nr-in'); }
    if (typeof fillAds === 'function') try { fillAds(el); } catch (e){}
  }
  function renderNumToday(){
    var me = getMe(), box = $('numToday');
    var title = me ? esc(me.name) + '님의 오늘 행운 부적' : '매일 열어보는 나만의 행운 부적';
    var head = '<div class="num-head"><h1 class="num-title">' + title + '</h1></div>';
    if (!me){
      box.innerHTML = head + '<div class="card pouch-card"><div class="pouch-fig">' + uniImg('u-pouch') + '</div>' +
        '<p class="helper" style="text-align:center">내 사주를 등록하면 복주머니에서 오늘의 행운 색, 방향, 숫자가 나와요. 매일 새로 바뀌어요.</p>' +
        '<button class="btn-primary btn-block sheen" id="btnNumOnb">내 사주 등록하고 복주머니 열기</button></div>';
      $('btnNumOnb').onclick = function(){ startOnboarding('new'); };
      return;
    }
    var r = compute(me); if (r.error){ box.innerHTML = ''; return; }
    var luck = todayLuck(me, r), lEl = luck.el, nums = luck.nums.map(function(o){ return o.n; });
    var opened = store('unsu_drawn') === todayStr();
    var h = head + '<div class="card pouch-card ' + EL_CLASS[lEl] + '" id="numWait"' + (opened ? ' hidden' : '') + '>' +
      '<div class="pouch-fig" id="pouchFig">' + uniImg('u-pouch') + '</div>' +
      '<p class="helper" style="text-align:center">복주머니를 열면 오늘 ' + esc(me.name) + '님께 필요한 행운의 색, 방향, 숫자가 나와요.</p>' +
      '<button class="btn-primary btn-block sheen" id="btnPouch">복주머니 열기</button></div>';
    h += talismanHTML(me, r, luck, opened);
    if (!opened) h += '<div id="pouchAd">' + adSlotHTML('복주머니를 열기 전') + '</div>';
    box.innerHTML = h;
    if ($('btnPouch')) $('btnPouch').onclick = function(){
      var fig = $('pouchFig'), btn = this; btn.disabled = true; FX.vib(10);
      if (fig && !reduceMotion){ fig.classList.add('shake'); }
      setTimeout(function(){
        markTodo('drawn'); revealNums(); FX.vib([18, 40, 24]);
        var tl = document.querySelector('.talisman');
        if (tl){ FX.confetti(tl, 46); setTimeout(function(){ FX.confetti(tl, 30); }, 260); }
        toast('오늘의 행운 부적이 나왔어요'); setTimeout(function(){ bond('num'); }, 1600);
      }, reduceMotion ? 0 : 650);
    };
    $('btnNumSave').onclick = function(){
      if (saveToBox({ id:'b' + Date.now().toString(36), t:Date.now(), d:todayStr(), who:me.name, kind:'행운 부적', nums:nums.slice() })){ toast('보관함에 저장했어요'); bumpTab('box'); }
    };
    $('btnNumCopy').onclick = function(){
      var f = luck.f;
      openShare({ sheetTitle:'행운 부적 공유', title:me.name + '님의 오늘 행운 부적', desc:'행운의 색 ' + f.tip.color + ' · 방향 ' + EL_TEXT[lEl].dir + ' · 숫자 ' + nums.join(' · '),
        fig:figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
        text:'[우니조아] ' + me.name + '님의 오늘 행운 부적\n행운의 색 ' + f.tip.color + '\n행운의 방향 ' + EL_TEXT[lEl].dir + '\n행운의 숫자 ' + nums.join(' · '),
        cta:'내 사주로 열어보는 행운 부적 →', link:resultLink('n', todayStr(), [me]), shareEntries:[me],
        card:{ kicker:me.name + '님의 오늘 행운 숫자', head:'우니가 전하는 오늘의 행운 부적', nums:nums } });
    };
  }

  /* =========================================================
     보관함 (005) — 저장한 번호, 꿈 기록, 사주 목록, 내 정보
     ========================================================= */
  var SAVE_IC = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-3px;margin-right:6px"><path d="M6 3.5h12v17l-6-4-6 4z"/></svg>';
  function bumpTab(t){ var b = document.querySelector('.tab[data-tab="' + t + '"]'); if (!b || reduceMotion) return; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
  /* ---- 오늘 하면 좋은 것 0/3 (005) ---- */
  var TODO_COINS = 30;
  var TODOS = [['peek','우니 꾹 눌러 오늘 선물 받기'],['drawn','복주머니 열어 행운 부적 받기'],['shared','운세나 행운 부적 공유하기']];
  function todoDone(k){ return store('unsu_' + k) === todayStr(); }
  function markTodo(k){
    if (todoDone(k)) return; store('unsu_' + k, todayStr());
    var n = TODOS.filter(function(t){ return todoDone(t[0]); }).length;
    if (n === TODOS.length && store('unsu_todo') !== todayStr()){
      store('unsu_todo', todayStr());
      if (!isGuest()){ addCoins(TODO_COINS, '오늘 할 일 3/3'); setTimeout(function(){ toast('오늘 할 일 3개 완료! 엽전 +' + TODO_COINS); }, 400); }
    }
    if (currentView === 'today' && $('todoCard')) $('todoCard').outerHTML = todoCardHTML();
  }
  function todoCardHTML(){
    var n = TODOS.filter(function(t){ return todoDone(t[0]); }).length;
    return '<div class="card lt todo-card" id="todoCard"><div class="sec-head"><h2 class="sec-title">오늘 하면 좋은 것</h2><span class="todo-n' + (n === 3 ? ' all' : '') + '">' + n + '/3</span></div>' +
      '<ul class="todo-list">' + TODOS.map(function(t){ var d = todoDone(t[0]); return '<li class="' + (d ? 'done' : '') + '"><button type="button" class="todo-go" data-todo="' + t[0] + '"><i aria-hidden="true">' + (d ? OK_SVG : '') + '</i><span>' + t[1] + '</span></button></li>'; }).join('') + '</ul>' +
      '<p class="helper">' + (n === 3 ? '오늘 몫을 다 했어요. 내일 또 만나요' : '세 개를 다 하면 엽전 ' + TODO_COINS + '닢을 드려요' + (isGuest() ? ' (로그인 필요)' : '')) + '</p></div>';
  }
  /* 할 일을 누르면 그 기능으로 이동 */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.todo-go'); if (!b) return;
    var k = b.dataset.todo;
    if (k === 'peek'){ var pc = $('peekCard'); if (pc){ pc.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); pc.classList.remove('todo-hint'); void pc.offsetWidth; pc.classList.add('todo-hint'); } }
    else if (k === 'drawn'){ go('num'); window.scrollTo(0, 0); }
    else if (k === 'shared'){ var sb = $('btnTodayShare'); if (sb){ sb.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); setTimeout(function(){ sb.click(); }, reduceMotion ? 0 : 350); } }
  });
  /* ---- 우니 꾹 뽑기: 하루 한 번, 꾹 누르면 오늘의 선물 하나 (색·아이템·시간·한마디, 가끔 엽전) ---- */
  var GIFT_COLORS = [['연보라','#b9a8ff'],['살구','#ffb38a'],['민트','#8fe3d0'],['하늘','#9fc8ff'],['레몬','#ffe27a'],['로즈','#ff9aa5'],['크림','#fff1cf']];
  var GIFT_ITEMS = ['손수건','머그컵','작은 노트','핸드크림','동전 지갑','책갈피','텀블러','향초'];
  var GIFT_TIMES = ['아침 7~9시','오전 10~12시','점심 12~2시','오후 3~5시','저녁 6~8시','밤 9~11시'];
  var GIFT_WORDS = ['오늘은 먼저 웃는 사람이 이겨요.','미뤄 둔 연락 하나가 좋은 소식을 데려와요.','작은 정리가 큰 여유를 만들어요.','좋아하는 노래 한 곡이 하루를 바꿔요.','오늘 들은 칭찬은 오래 기억해 두세요.','천천히 가도 방향만 맞으면 괜찮아요.'];
  var GIFT_COIN = 20;
  var GIFT_IC = {
    item:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S9 9 12 9zm0 0c2-4 6-4 6-1.5S15 9 12 9z"/></svg>',
    time:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    word:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 6h14v9H10l-4 3v-3H5z"/></svg>'
  };
  function todayGift(me){
    var rnd = mulberry32(seedHash((me.name || '') + '|' + (me.y || '') + (me.m || '') + (me.d || '') + '|' + todayStr() + '|gift'));
    var roll = rnd(), pick = function(a){ return a[Math.floor(rnd() * a.length)]; };
    if (roll < .16 && !isGuest()) return { t:'coin', label:'엽전 +' + GIFT_COIN, msg:'엽전 <b>' + GIFT_COIN + '닢</b>이 나왔어요! 바로 넣어 드렸어요.' };
    var kinds = ['color','item','time','word'], k = kinds[Math.floor(rnd() * 4)];
    if (k === 'color'){ var c = pick(GIFT_COLORS); return { t:'color', c:c[1], label:'행운 색', msg:'오늘의 행운 색은 <b>' + c[0] + '</b>이에요. 옷이나 소품에 한 가지만 더해 보세요.' }; }
    if (k === 'item'){ var it = pick(GIFT_ITEMS); return { t:'item', label:'행운 아이템', msg:'오늘의 행운 아이템은 <b>' + it + '</b>예요. 곁에 두면 마음이 든든해져요.' }; }
    if (k === 'time'){ var tm = pick(GIFT_TIMES); return { t:'time', label:'행운 시간', msg:'오늘은 <b>' + tm + '</b>가 좋아요. 중요한 연락은 이때 해 보세요.' }; }
    return { t:'word', label:'우니의 한마디', msg:'“' + pick(GIFT_WORDS) + '”' };
  }
  function giftTokenHTML(g){
    var inner = g.t === 'color' ? '' : g.t === 'coin' ? '<i class="gt-hole"></i>' : GIFT_IC[g.t];
    return '<div class="peek-ball gt-' + g.t + '"' + (g.t === 'color' ? ' style="--gc:' + g.c + '"' : '') + '>' + inner + '<small>' + g.label + '</small></div>';
  }
  function peekCardHTML(me, nums, elc){
    var opened = todoDone('peek'), g = todayGift(me);
    var sparks = ''; for (var k = 0; k < 10; k++) sparks += '<i class="pk-spark" style="--a:' + (8 + k * 9) + 'deg;--d:' + (60 + (k % 3) * 26) + 'px;--w:' + (k * .03).toFixed(2) + 's"></i>';
    var fw = '', spots = [[16,24],[84,20],[26,74],[78,66],[52,30],[60,82]];
    spots.forEach(function(p, si){ fw += '<span class="pk-fw" style="left:' + p[0] + '%;top:' + p[1] + '%;--w:' + (.22 + si * .14).toFixed(2) + 's">'; for (var q = 0; q < 8; q++) fw += '<i style="--a:' + (q * 45 + si * 11) + 'deg"></i>'; fw += '</span>'; });
    return '<div class="card peek-card ' + elc + (opened ? ' open' : '') + '" id="peekCard"><div class="pk-fws" aria-hidden="true">' + fw + '</div>' +
      '<div class="sec-head"><h2 class="sec-title">우니 꾹 뽑기</h2><span class="sec-meta">하루 한 번</span></div>' +
      '<div class="peek-stage">' +
        '<div class="peek-pop" aria-hidden="true"><span class="pk-flash"></span>' + sparks + '</div>' +
        '<div class="peek-tok" aria-live="polite">' + (opened ? giftTokenHTML(g) : '') + '</div>' +
        '<button type="button" class="peek-btn" id="peekBtn" aria-label="우니를 꾹 눌러 오늘의 선물 받기"' + (opened ? ' disabled' : '') + '>' +
        '<svg class="peek-ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54"/></svg>' +
        '<span class="peek-fig">' + uniImg(opened ? 'u-gift' : 'u-calm') + '</span></button>' +
      '</div>' +
      '<p class="helper peek-msg">' + (opened ? g.msg : '우니를 <b>꾹</b> 누르고 있으면 오늘의 선물을 하나 꺼내 줘요. 가끔 엽전도 나와요!') + '</p>' +
      '<button class="btn-primary btn-block sheen" id="btnGoNum" style="margin-top:12px">오늘의 행운 부적 열어 보기</button></div>';
  }
  function bindPeek(me, nums){
    var btn = $('peekBtn'); if (!btn || btn.disabled) return;
    var g = todayGift(me), t = null, card = $('peekCard');
    function done(){
      t = null; card.classList.remove('hold'); btn.disabled = true;
      card.querySelector('.peek-tok').innerHTML = giftTokenHTML(g);
      card.querySelector('.peek-fig').innerHTML = uniImg('u-gift');
      card.classList.add('open');
      if (!reduceMotion){ card.classList.add('burst'); setTimeout(function(){ card.classList.remove('burst'); }, 2000); }
      card.querySelector('.peek-msg').innerHTML = '짠! ' + g.msg;
      if (g.t === 'coin') addCoins(GIFT_COIN, '우니 꾹 뽑기');
      if (navigator.vibrate) try { navigator.vibrate([12, 40, 24]); } catch (e){}
      markTodo('peek');
    }
    function start(e){ if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return; if (t) return; e.preventDefault(); if (reduceMotion){ done(); return; } card.classList.add('hold'); card.querySelector('.peek-fig img').src = 'img/u-pressed.webp'; t = setTimeout(done, 750); }
    function cancel(){ if (t){ clearTimeout(t); t = null; card.classList.remove('hold'); card.querySelector('.peek-fig img').src = 'img/u-calm.webp'; } }
    btn.addEventListener('pointerdown', start); btn.addEventListener('keydown', start);
    ['pointerup','pointerleave','pointercancel','keyup'].forEach(function(ev){ btn.addEventListener(ev, cancel); });
    btn.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  }
  function renderBox(){
    var me = getMe(), box = getBox(), dreams = getDreams(), h = NS ? demoBarHTML() : '';
    h += '<div class="num-head"><h1 class="num-title">보관함</h1></div>';
    h += saveStateHTML();
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">저장한 행운 부적</h2><span class="sec-meta">' + box.length + '장</span></div>';
    if (!box.length) h += '<div class="bx-empty">' + uniImg('u-empty') + '<p class="helper">아직 비어 있어요. 행운 탭에서 ‘보관함에 저장’을 누르면 여기에 모여요.</p></div><button class="btn-primary btn-block" id="bxGoNum" style="margin-top:12px">복주머니 열러 가기</button>';
    else h += '<div class="bx-list">' + box.map(function(b){
      return '<div class="bx-row"><div class="bx-meta"><b>' + esc(b.kind) + '</b><small>' + b.d.replace(/-/g, '.') + (b.who ? ' · ' + esc(b.who) : '') + '</small></div>' +
        luckChips(b.nums, 'sm') +
        '<button class="bx-del" data-bx="' + b.id + '" aria-label="이 부적 지우기">✕</button></div>';
    }).join('') + '</div>';
    h += '</div>';
    /* 열어 둔 리포트 (GPT 검토 P0-5: 산 결과를 다시 찾는 길) */
    var opened = liveOrders(), nyO = store('unsu_ny_open') || {}, list = getList ? getList() : [];
    var rep = opened.map(function(o){ return '<button class="row-link" data-rp="' + o.id + '" data-gk="' + esc(o.ghKey || '') + '"><span class="ic">' + TIP_IC.star + '</span><span>' + esc(o.name) + '<br><span class="helper">' + fmtDate(o.at) + ' · ' + (o.coin ? o.coin + '닢' : '') + '</span></span><span class="chev">›</span></button>'; });
    Object.keys(nyO).forEach(function(id){ var e = list.filter(function(x){ return x.id === id; })[0]; if (e) rep.push('<button class="row-link" data-rpny="' + id + '"><span class="ic">' + TIP_IC.star + '</span><span>2027 신년운세 전체 · ' + esc(e.name) + '<br><span class="helper">' + fmtDate(nyO[id]) + ' · 광고로 열림</span></span><span class="chev">›</span></button>'); });
    Object.keys(tkOpenMap()).forEach(function(k){ var id = k.split('|')[0], pp = k.split('|')[1], e = list.filter(function(x){ return x.id === id; })[0], Q = TAEKIL.PURPOSES[pp]; if (e && Q) rep.push('<button class="row-link" data-rptk="' + esc(k) + '"><span class="ic">' + TK_IC[pp] + '</span><span>중요한 날 잡기 · ' + Q.short + ' · ' + esc(e.name) + '<br><span class="helper">' + fmtDate(tkOpenMap()[k]) + ' · ' + COST.tk + '닢</span></span><span class="chev">›</span></button>'); });
    if (rep.length) h += '<div class="card"><div class="sec-head"><h2 class="sec-title">열어 둔 리포트</h2><span class="sec-meta">' + rep.length + '개</span></div>' + rep.join('') + '</div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">꿈해몽 기록</h2><span class="sec-meta">' + dreams.length + '개</span></div>';
    if (!dreams.length) h += '<div class="bx-empty">' + uniImg('u-sleep') + '<p class="helper">꿈을 풀면 해몽 기록이 여기에 남아요.</p></div><button class="btn-soft btn-block" id="bxGoDream" style="margin-top:12px">꿈 해몽 하러 가기</button>';
    else h += dreams.slice(0, 10).map(function(d){ return '<button class="row-link" data-dm="' + d.id + '"><span class="ic">' + TIP_IC.star + '</span><span>' + esc(d.title || d.catName) + '<br><span class="helper">' + fmtDate(d.at) + ' · ' + (d.free ? '무료 해몽' : '꿈 풀이 리포트') + '</span></span><span class="chev">›</span></button>'; }).join('');
    h += '</div>';
    h += '<div class="card"><button class="row-link" id="bxList"><span class="ic">' + FEAT_IC.saju + '</span>저장한 사주 목록<span class="chev">›</span></button>' +
      (me ? '<button class="row-link" id="bxMy"><span class="ic">' + FEAT_IC.today + '</span>내 정보 · 엽전 기록<span class="chev">›</span></button>' : '<button class="row-link" id="bxStart"><span class="ic">' + FEAT_IC.today + '</span>내 사주 등록하기<span class="chev">›</span></button>') + '</div>';
    h += adSlotHTML('보관함을 본 뒤');
    $('boxBody').innerHTML = h;
    bindDemoBar(); bindSaveState();
    if ($('bxGoNum')) $('bxGoNum').onclick = function(){ go('num'); };
    if ($('bxGoDream')) $('bxGoDream').onclick = function(){ openDream(); };
    if ($('bxMy')) $('bxMy').onclick = function(){ openMy(); };
    if ($('bxStart')) $('bxStart').onclick = function(){ startOnboarding('new'); };
    $('bxList').onclick = function(){ renderList(); show('list'); };
    document.querySelectorAll('[data-bx]').forEach(function(b){ b.onclick = function(){ store('unsu_numbox', getBox().filter(function(x){ return x.id !== b.dataset.bx; })); renderBox(); toast('지웠어요'); }; });
    document.querySelectorAll('[data-rp]').forEach(function(b){ b.onclick = function(){ var me = getMe(); if (b.dataset.rp === 'gh') go('gunghap'); else if (me) openResult(me, compute(me), true); }; });
    document.querySelectorAll('[data-rptk]').forEach(function(b){ b.onclick = function(){ var k = b.dataset.rptk.split('|'), e = getList().filter(function(x){ return x.id === k[0]; })[0]; if (e) openTaekil(e, compute(e), k[1]); }; });
    document.querySelectorAll('[data-rpny]').forEach(function(b){ b.onclick = function(){ var e = getList().filter(function(x){ return x.id === b.dataset.rpny; })[0]; if (e) openNYSheet(e, compute(e)); }; });
    document.querySelectorAll('[data-dm]').forEach(function(b){ b.onclick = function(){ var d = getDreams().filter(function(x){ return x.id === b.dataset.dm; })[0]; if (d){ show('dream'); renderDreamResult(d, false); } }; });
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
    var h = '<div class="card gh-box">' + (!(A && B) || gh.edit ? '<div class="gh-duo">' + duoSVG('hug') + '<p>우니와 조아처럼, 두 사람은 얼마나 잘 맞을까요?</p></div>' : '') + '<div class="gh-pair">' + slotHTML(A, 'a', getMe() ? '첫 번째 사람' : '나') + '<div class="gh-amp">合</div>' + slotHTML(B, 'b', '상대') + '</div>';
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
    var key = ghKey(A, B), open = getUnlocks().indexOf(key) > -1 || liveOrders().some(function(o){ return (o.id === 'gh' || o.id === 'set') && o.ghKey === key; });
    if (!open){
      h += '<div class="card locked"><div class="sec-head"><h2 class="sec-title">상세 궁합 리포트</h2><span class="sec-meta">잠김</span></div>' +
        '<ul class="lock-list">' + ['두 사람의 기질 비교','관계에서 빛나는 점','부딪히기 쉬운 점과 대화 팁','올해 두 사람의 흐름','함께하면 좋은 활동'].map(function(t){ return '<li>' + LOCK_SVG + t + '</li>'; }).join('') + '</ul>' +
        '<div class="locked-preview" aria-hidden="true"><div style="width:92%"></div><div style="width:78%"></div><div style="width:85%"></div></div>' +
        '<div class="lock-cta"><button class="btn-primary" id="btnGhBuy">' + (passActive() ? '우니 패스로 상세 리포트 열기' : COIN_SVG + '엽전 ' + COST.gh + '닢으로 상세 리포트 열기') + '</button>' +
        '<p class="helper" style="text-align:center">한 번 열면 이 두 사람의 리포트는 계속 볼 수 있어요.</p></div></div>';
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
    h += adSlotHTML('궁합 요약을 본 뒤');
    h += '<p class="disclaimer">궁합은 일간·일지·띠·오행 구성을 비교한 재미용 풀이예요.</p>';
    box.innerHTML = h;
    bindGh();
    var unlock = function(){ var u = getUnlocks(); if (u.indexOf(key) < 0){ u.push(key); store('unsu_unlock', u); } renderGunghap(); toast('상세 궁합 리포트를 열었어요'); };
    $('btnGhShare').onclick = function(){
      var me = getMe();
      openShare({ sheetTitle:'궁합 결과 공유', title:A.name + ' × ' + B.name + ' 궁합 ' + m.score + '점', desc:m.grade + ' · ' + m.summary,
        fig:figSVG(ra.animal, ANIMAL_EL[ra.animal], 'mini'),
        text:'[우니조아] ' + A.name + ' × ' + B.name + ' 궁합 ' + m.score + '점 · ' + m.grade + '\n“' + m.summary + '”',
        cta:'우리 궁합 결과 보러 가기 →', link:resultLink('g', todayStr(), [A, B]), shareEntries:[A, B],
        card:{ kicker:A.name + ' × ' + B.name + ' 궁합', head:'“' + m.summary + '”', rows:[['궁합 점수', m.score]], tag:m.grade } });
    };
    if ($('btnGhInvite')) $('btnGhInvite').onclick = openInvite;
    if (!open){
      $('btnGhBuy').onclick = function(){ openPaySheet('gh', { ghKey:key, who:esc(A.name) + ' × ' + esc(B.name), onPaid:renderGunghap }); };
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
  var CLOUD_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.3 3.3 0 0 0 7 18.5z"/><path d="M9.5 14l2 2 3.5-3.6"/></svg>';
  var PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.8" width="11" height="18.4" rx="2.6"/><path d="M10.5 18h3"/></svg>';
  /* 저장 상태 한 줄 (보관함 맨 위): 비회원 = 이 기기에만 · 회원 = 계정에 저장됨 */
  function saveStateHTML(){
    if (NS) return '';
    var auth = store('unsu_auth'), pend = pendingMergeCount();
    if (srvUser() || auth) return '<div class="save-state on"><span class="ss-ic">' + CLOUD_SVG + '</span><span class="ss-t"><b>계정에 저장됨</b><small>' + (PROV[auth.provider] || '') + ' 계정 · 어느 기기에서나 그대로예요</small></span>' +
      (pend ? '<button class="ss-btn" id="ssMerge">기기 기록 ' + pend + '개 가져오기</button>' : '<button class="ss-btn ghost" id="ssAcct">계정 관리</button>') + '</div>';
    return '<div class="save-state"><span class="ss-ic">' + PHONE_SVG + '</span><span class="ss-t"><b>이 기기에만 저장 중</b><small>기기를 바꾸거나 방문 기록을 지우면 사라질 수 있어요</small></span><button class="ss-btn" id="ssLogin">계정에 백업</button></div>';
  }
  function bindSaveState(){
    if ($('ssLogin')) $('ssLogin').onclick = function(){ openLoginSheet('보관함의 행운 부적·꿈 기록·저장한 사주를 계정에 옮겨 둘게요. 계정에 이미 있는 기록은 덮어쓰지 않아요.', { tab:'box' }); };
    if ($('ssAcct')) $('ssAcct').onclick = openSettings;
    if ($('ssMerge')) $('ssMerge').onclick = function(){ openMergeSheet(); };
  }
  var SHIELD_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z"/></svg>';

  function updateTopbar(){
    var me = getMe(), auth = store('unsu_auth');
    $('coinChip').hidden = !me;
    $('avatarBtn').hidden = !me;
    if (me) $('avatarTxt').textContent = me.name.charAt(0);
    $('syncDot').hidden = !(auth && !NS);
    /* 상단 우측(2026-11-19 로그인 동선 개편): 비회원 = [로그인] + 설정, 로그인 = 이니셜 아바타(계정·설정) */
    var member = !NS && !!auth;
    $('startChip').hidden = true;
    $('loginChip').hidden = NS || member;
    $('acctBtn').hidden = !member;
    if (member) $('acctTxt').textContent = ((me && me.name) || auth.nick || '나').charAt(0);
    $('setBtn').hidden = member || !me;
    $('setDot').hidden = true;
    renderCoin();
  }
  $('startChip').onclick = function(){ startOnboarding('new'); };
  $('loginChip').onclick = function(){ openLoginSheet(getMe() ? '지금 기록은 이 기기에만 있어요. 로그인하면 계정에 보관돼서 기기를 바꿔도 그대로예요.' : '이미 쓰던 계정이 있으면 로그인해서 기록을 불러오세요. 처음이면 로그인하면서 바로 가입돼요.'); };
  $('acctBtn').onclick = openSettings;
  $('avatarBtn').onclick = function(){ openMy(); };
  /* ---- 설정 시트: 상단 오른쪽 버튼 하나로 내 정보·엽전·우니·쿠폰·글자 크기·앱 정보 ---- */
  var SET_IC = {
    coin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="8.5"/><rect x="9.5" y="9.5" width="5" height="5"/></svg>',
    ticket:TICKET_SVG,
    info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></svg>',
    doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4M10 12h5M10 15.5h5"/></svg>',
    bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0" stroke-linecap="round"/></svg>',
    help:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4.5 12a7.5 7.5 0 1 1 3.2 6.1L4 19.5l1.3-3.4A7.4 7.4 0 0 1 4.5 12z" stroke-linejoin="round"/><path d="M10 10a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.7M12 16h.01"/></svg>',
    user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="9" r="3.6"/><path d="M5.5 19.5c1.2-3.2 3.7-4.8 6.5-4.8s5.3 1.6 6.5 4.8" stroke-linecap="round"/></svg>'
  };
  function openSettings(){
    var me = getMe();
    if (!me && srvUser()){   /* 로그인은 했는데 아직 내 사주가 없을 때(새 기기·새 계정) */
      var au = store('unsu_auth');
      openSheet('<h3 id="sheetTitle">내 계정</h3><div class="save-state on"><span class="ss-ic">' + CLOUD_SVG + '</span><span class="ss-t"><b>' + esc(au.nick || '우니조아 사용자') + '</b><small>' + PROV[au.provider] + ' 계정으로 로그인됨 · 엽전 ' + getCoins().toLocaleString() + '닢</small></span></div>' +
        '<p class="body-text" style="margin:12px 0 16px">아직 내 사주가 없어요. 생년월일을 넣으면 오늘의 운세와 행운 부적이 시작되고, 계정에 바로 보관돼요.</p>' +
        '<div class="view" style="gap:8px"><button class="btn-primary" id="stStart">내 사주 등록하기</button><button class="btn-ghost" id="stLogout">로그아웃</button></div>' + bizFootHTML());
      $('stStart').onclick = function(){ startOnboarding('new'); };
      $('stLogout').onclick = function(){ closeSheet(); doLogout(); };
      return;
    }
    if (!me){ startOnboarding('new'); return; }
    var p = getPet(), cps = getCoupons().length, guest = isGuest(), auth = store('unsu_auth');
    var row = function(id, ic, label, val, cls){ return '<button class="st-row' + (cls ? ' ' + cls : '') + '" id="' + id + '"><span class="st-ic">' + ic + '</span><span class="st-l">' + label + '</span><span class="st-v">' + val + '</span><span class="chev">›</span></button>'; };
    var h = '<h3 id="sheetTitle" class="sr-only">설정</h3>' +
      '<button class="st-prof" id="stProf"><span class="st-av">' + esc(me.name.charAt(0)) + '</span><span class="st-pn"><b>' + esc(me.name) + '</b><small>' + (NS ? '예시 모드' : guest ? '게스트 · 이 기기에만 저장 중' : PROV[auth.provider] + ' 계정으로 로그인됨') + '</small></span><span class="chev">›</span></button>' +
      '<button class="st-pet" id="stPet">' + petSVG(petMood(p.g), p.lv, 'mini') + '<span class="st-pn"><b>우니 <small>Lv.' + p.lv + ' · ' + petStage(p.lv) + '</small></b><span class="pet-gauge"><i style="width:' + p.g + '%"></i></span><small>교감 ' + p.g + '/100' + (p.g >= 100 ? ' · 선물을 받을 수 있어요' : '') + '</small></span><span class="chev">›</span></button>' +
      '<div class="st-group">' +
        row('stCoins', SET_IC.coin, '엽전', guest && !NS ? '<em>가입하면 ' + SIGNUP_COINS.toLocaleString() + '닢</em>' : getCoins().toLocaleString() + '닢', 'gold') +
        row('stCoupons', SET_IC.ticket, '쿠폰함', cps + '장') +
        row('stMy', SET_IC.user, '내 정보', '사주·계정 관리') +
        row('stOrders', SET_IC.doc, '구매 내역', getOrders().length + '건') +
      '</div>' +
      '<div class="st-group">' +
        row('stNotif', SET_IC.bell, '알림 설정', getNotif().mkt ? '혜택 알림 켬' : '') +
        row('stHelp', SET_IC.help, '고객센터', '공지·자주 묻는 질문·문의') +
      '</div>' +
      '<div class="st-group st-fs"><div class="st-cap">글자 크기</div>' + fsSegHTML() + '</div>' +
      '<div class="st-group st-fs"><div class="st-cap">화면 효과 <small>끊기면 ‘가볍게’로 바꿔 보세요</small></div><div class="fs-seg fx-seg" role="group" aria-label="화면 효과">' +
        [['auto', '자동', '기기에 맞춤'], ['full', '풍부하게', '유리·오로라'], ['lite', '가볍게', '빠르고 선명']].map(function(o){ return '<button type="button" data-fxv="' + o[0] + '" aria-pressed="' + (PERF.pref() === o[0]) + '"><b>' + o[1] + '</b><span>' + o[2] + '</span></button>'; }).join('') + '</div></div>' +
      '<div class="st-group">' +
        row('stAbout', SET_IC.info, '앱 정보', '우니조아 v1.0') +
      '</div>' +
      (guest && !NS ? '<button class="btn-primary btn-block" id="stLogin" style="margin-top:14px">로그인하고 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢 받기</button>' : '') +
      bizFootHTML();
    openSheet(h);
    var sb = $('sheetBody'); sb.classList.add('st-sheet'); bindFsSeg(sb);
    sb.querySelectorAll('[data-fxv]').forEach(function(b){ b.onclick = function(){ PERF.set(b.dataset.fxv); sb.querySelectorAll('[data-fxv]').forEach(function(x){ x.setAttribute('aria-pressed', String(x === b)); }); }; });
    $('stProf').onclick = $('stMy').onclick = $('stCoupons').onclick = function(){ closeSheet(); openMy(); };
    $('stOrders').onclick = openOrdersSheet;
    $('stNotif').onclick = openNotifSheet;
    $('stHelp').onclick = openHelpSheet;
    $('stAbout').onclick = openAboutSheet;
    $('stCoins').onclick = function(){ closeSheet(); setTimeout(openCoinSheet, 260); };
    $('stPet').onclick = function(){ closeSheet(); go('today'); setTimeout(function(){ var c = $('petCard'); if (c) c.scrollIntoView({ behavior:'smooth', block:'center' }); }, 120); };
    if ($('stLogin')) $('stLogin').onclick = function(){ closeSheet(); setTimeout(function(){ openLoginSheet('처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요.'); }, 260); };
  }
  $('setBtn').onclick = openSettings;

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
    delete document.body.dataset.mood;
    var now = new Date(), pd = PUBLIC_DAY.today(now), P = pd.pillars;
    var an = MS.BR_ANIMAL[P.year.br];
    var acc = store('unsu_account');
    var h = INVITE ? inviteHeroHTML() : '<div class="wel-hero">' +
      '<div class="today-date">' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 ' + WD[now.getDay()] + '요일 · ' + P.day.hanja + '日</div>' +
      '<h1 class="hero-title">매일 열어보는<br>나만의 행운 부적</h1>' +
      '<div class="wel-fig" id="welFig">' + uniImg('u-pouch', '', '행운 복주머니를 든 우니') + '</div>' +
      '<div class="wel-sample" aria-label="예시 부적 카드"><span class="ws-badge">예시</span><div class="ws-top"><b>김운수님의 오늘 행운 부적</b><small>수(水) 기운 · 행운의 색 검정, 남색 · 방향 북쪽</small></div>' +
        luckChips([6, 11, 21], 'el-water soft') + '</div>' +
      '<ol class="wel-steps"><li><b>1</b>생년월일 입력</li><li><b>2</b>복주머니 열기</li><li><b>3</b>보관함에 저장</li></ol>' +
      '<div class="wel-cta"><button class="btn-primary btn-block sheen" id="btnWelStart">내 행운 부적 무료로 열기</button><button class="text-btn" id="btnWelDemo">예시로 먼저 둘러보기</button>' +
        (isGuest() ? '<p class="wel-login">이미 쓰던 계정이 있나요? <button type="button" id="btnWelLogin">로그인</button></p>' : '') + '</div></div>';
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
      '<button id="ftToday"><span class="ic">' + FEAT_IC.star + '</span><b>꿈 해몽 무료</b><small>해몽은 무료 · 길흉 판정과 오늘의 처방</small></button>' +
      '<button id="ftSaju"><span class="ic">' + FEAT_IC.saju + '</span><b>만세력 풀이</b><small>원국·대운·세운까지 로그인 없이</small></button>' +
      '<button id="ftGh"><span class="ic">' + FEAT_IC.gh + '</span><b>궁합</b><small>두 사람의 일간·일지·오행 비교</small></button>' +
      '<button id="ftZ"><span class="ic">' + FEAT_IC.star + '</span><b>별자리 운세</b><small>12성좌 오늘의 기운과 행운 숫자</small></button></div>';
    h += adSlotHTML('띠별 운세를 본 뒤');
    h += '<p class="disclaimer">운세는 전통 명리 이론을 바탕으로 한 재미용 콘텐츠예요.</p>';
    $('todayBody').innerHTML = h;
    drawOn($('welFig'));
    updateTopbar();
    $('btnWelMore').onclick = function(){ startOnboarding('new', 'today'); };
    $('ftToday').onclick = function(){ openDream(); };
    if ($('btnWelStart')) $('btnWelStart').onclick = function(){ startOnboarding('new'); };
    if ($('btnWelDemo')) $('btnWelDemo').onclick = function(){ enterDemo('today'); };
    if ($('btnWelLogin')) $('btnWelLogin').onclick = function(){ openLoginSheet('이전에 쓰던 계정으로 로그인하면 사주·행운 부적·엽전을 그대로 불러와요.'); };
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
  function startOnboarding(mode, after){
    var fromDemo = !!NS && mode !== 'edit';
    var me = fromDemo ? null : getMe();
    ob = { mode:mode || 'new', step:1, back4:false, name:'', cal:'solar', leap:false, birth:'', unknown:false, h:null, m:null, gender:null, fromDemo:fromDemo, after:after || 'num', ret:currentTab || 'today' };
    if (ob.mode === 'edit' && me){
      ob.name = me.name; ob.cal = me.cal; ob.leap = !!me.leap; ob.birth = me.y + pad2(me.m) + pad2(me.d);
      ob.unknown = !!me.unknown; ob.h = me.unknown ? null : me.hour; ob.m = me.unknown ? null : me.minute; ob.gender = me.gender; ob.step = 4; ob.editId = me.id;
    }
    closeSheet(); show('onboard'); renderOb();
  }
  function obEntry(){
    var b = parseBirth(ob.birth);
    return { name:ob.name.trim() || obAutoName(), gender:ob.gender, cal:ob.cal, leap:ob.cal === 'lunar' && ob.leap, y:b.y, m:b.m, d:b.d,
      unknown:ob.unknown, hour:ob.unknown ? null : ob.h, minute:ob.unknown ? null : ob.m, corr:true };
  }
  /* 이름을 비워 두면 띠로 부른다(예: 돼지띠님) — 닉네임은 선택(2026-11-19 소율) */
  function obAutoName(){ var b = parseBirth(ob.birth); if (!b) return '나'; var r = compute({ name:'_', gender:ob.gender || 'F', cal:ob.cal, leap:ob.cal === 'lunar' && ob.leap, y:b.y, m:b.m, d:b.d, unknown:true, hour:null, minute:null, corr:true }); return r.error ? '나' : r.animal + '띠'; }
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
    var prog = st >= 4 ? 100 : ((st - 1) / 3) * 100 + 8;
    var q = '', sub = '', inner = '', next = '다음';
    if (st === 0){
      q = '뭐라고 불러 드릴까요?'; sub = '풀이와 오늘의 운세에서 부를 이름이에요. 별명도 괜찮아요.';
      inner = '<input class="ob-input" id="obName" maxlength="12" placeholder="이름 또는 별명" autocomplete="off" value="' + esc(ob.name) + '">';
    } else if (st === 1){
      q = ob.mode === 'edit' ? '생년월일을 알려 주세요' : '내 행운 부적을 열려면<br>생년월일이 필요해요'; sub = '사주 계산에만 써요. 음력 생일이면 음력과 윤달 여부를 골라 주세요.';
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
      q = ob.mode === 'edit' ? '내 정보를 확인해 주세요' : '이 정보로<br>행운 부적을 열게요';
      next = ob.mode === 'edit' ? '수정 완료' : (ob.after === 'num' ? '행운 부적 열기' : '이 정보로 시작하기');
      var auto = obAutoName();
      inner = '<div class="field ob-name"><label for="obName">부를 이름 <span class="helper">선택 · 비워 두면 ‘' + esc(auto) + '님’</span></label><input class="text-input" id="obName" maxlength="12" placeholder="이름 또는 별명" autocomplete="off" value="' + esc(ob.name) + '"></div>' + '<div class="card cf-card">' + (r.error ? '' : figSVG(r.animal, MS.EL_KEY[r.pillars.day.sEl]) +
        '<div class="poster-name" id="obPosterName">' + esc(e.name) + '</div><div class="poster-sub">' + r.pillars.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · <span style="font-family:var(--font-hanja);color:#fff">' + r.pillars.day.hanja + '</span>일주</div>') +
        '<div class="cf-rows">' +
        '<div class="cf-row"><span class="k">생년월일</span><span class="v">' + (e.cal === 'lunar' ? '음력 ' + (e.leap ? '윤달 ' : '') : '양력 ') + e.y + '.' + pad2(e.m) + '.' + pad2(e.d) + '<small>' + (r.error ? '' : e.cal === 'lunar' ? '양력 ' + r.solar.y + '.' + pad2(r.solar.m) + '.' + pad2(r.solar.d) : (r.lunar ? '음력 ' + r.lunar.y + '.' + pad2(r.lunar.m) + '.' + pad2(r.lunar.d) + (r.lunar.leap ? ' (윤달)' : '') : '')) + '</small></span><button data-ej="1">수정</button></div>' +
        '<div class="cf-row"><span class="k">태어난 시간</span><span class="v">' + (e.unknown ? '모름' : pad2(e.hour) + ':' + pad2(e.minute)) + '<small>' + (e.unknown ? '시주 없이 6글자로 풀이' : (r.error || !r.pillars.hour ? '' : '진태양시 ' + pad2(r.corr.lmH) + ':' + pad2(r.corr.lmMi) + ' · ' + r.pillars.hour.bk + '시(' + r.pillars.hour.bh + '時)')) + '</small></span><button data-ej="2">수정</button></div>' +
        '<div class="cf-row"><span class="k">성별</span><span class="v">' + (e.gender === 'M' ? '남자' : '여자') + '</span><button data-ej="3">수정</button></div>' +
        '</div></div>' +
        '<p class="privacy">' + SHIELD_SVG + '<span>입력한 정보는 이 기기의 브라우저에만 저장돼요. 로그인하면 계정에 안전하게 보관할 수 있어요.</span></p>';
    }
    body.innerHTML = '<div class="ob-top"><button id="obBack" aria-label="이전">‹</button><div class="ob-prog" role="progressbar" aria-valuenow="' + Math.round(prog) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + prog + '%"></i></div><button class="x" id="obClose" aria-label="닫기">✕</button></div>' +
      (st < 4 ? '<div class="ob-step">STEP ' + st + ' / 3</div>' : '<div class="ob-step">CONFIRM</div>') +
      '<h1 class="ob-q">' + q + '</h1>' + (sub ? '<p class="helper" style="margin-top:-8px">' + sub + '</p>' : '') +
      '<div class="ob-body">' + inner + '</div>' +
      '<div class="ob-cta"><button class="btn-primary btn-block" id="obNext"' + (obValid() ? '' : ' disabled') + '>' + next + '</button>' + (st === 4 && ob.mode !== 'edit' ? '<button type="button" class="btn-ghost btn-block" id="obSave" style="margin-top:8px">부적은 나중에, 정보만 저장하기</button>' : '') + '</div>';
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
    $('obBack').onclick = function(){ if (ob.back4){ ob.back4 = false; ob.step = 4; renderOb(); return; } if (st <= 1 || (ob.mode === 'edit' && st === 4)) return closeOb(); ob.step--; renderOb(); };
    $('obClose').onclick = closeOb;
    $('obNext').onclick = obGoNext;
    if (st === 1){
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
      var n = $('obName');
      n.oninput = function(){ ob.name = n.value; $('obPosterName').textContent = ob.name.trim() || obAutoName(); };
      n.onkeydown = function(e){ if (e.key === 'Enter') n.blur(); };
      $('obBody').querySelectorAll('[data-ej]').forEach(function(b){ b.onclick = function(){ ob.step = +b.dataset.ej; ob.back4 = true; renderOb(); }; });
    }
  }
  function closeOb(){ var mode = ob && ob.mode, ret = ob && ob.ret; ob = null; if (mode === 'edit') openMy(); else go(ret === 'num' || ret === 'box' ? ret : 'today'); }
  function finishOb(saveOnly){
    var e = obEntry(), r = compute(e);
    if (r.error){ toast(r.error); ob.step = 1; renderOb(); return; }
    if (ob.mode === 'edit'){
      var id = ob.editId;
      store('unsu_list', getList().map(function(x){ return x.id === id ? Object.assign({}, x, e, { id:id, sample:false }) : x; }));
      ob = null; toast('내 정보를 수정했어요'); openMy(); return;
    }
    if (ob.fromDemo) exitDemo(true);
    var after = ob.after || 'num';
    e.id = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2,5); e.saved = Date.now();
    var list = getList(); list.unshift(e); store('unsu_list', list); setMe(e.id);
    welcomeCoins(); updateSegCount(); ob = null;
    if (saveOnly){ toast(e.name + '님 정보를 저장했어요'); go('today'); return; }
    showGen(r, function(){
      if (INVITE && acceptInviteForMe()) return;
      go(after);
      if (after === 'num') setTimeout(function(){ toast(e.name + '님의 사주를 저장했어요. 복주머니를 열어 보세요'); }, 500);
    }, { name:e.name });
  }
  function showGen(r, cb, o){
    o = o || {};
    var P = r.pillars, g = ['hour','day','month','year'].map(function(k){ return P[k] ? P[k].hanja : '　　'; }).join(' ');
    var steps = ['절기·음력 맞추는 중', '여덟 글자 세우는 중', '오행의 균형 헤아리는 중', '용신 찾는 중'];
    var mx = Math.max.apply(null, r.cnt.concat([1])), bars = '';
    for (var e = 0; e < 5; e++) bars += '<div class="gb ' + EL_CLASS[e] + '"><span>' + MS.EL_H[e] + '</span><i><u data-w="' + Math.max(8, Math.round(r.cnt[e] / mx * 100)) + '"></u></i></div>';
    var withAd = o.ad !== false;
    var el = document.createElement('div'); el.className = 'gen' + (withAd ? ' has-ad' : ''); el.setAttribute('role', 'status');
    /* 분석 화면도 콘텐츠(여덟 글자·오행 막대)를 함께 보여 준다 — 광고만 있는 화면은 애드센스 정책 위반 소지가 있어서 */
    el.innerHTML = '<div class="gen-main"><div class="gen-fig">' + figSVG(r.animal, MS.EL_KEY[P.day.sEl]) + '<span class="gen-ring"></span></div>' +
      (o.name ? '<p class="gen-who">' + esc(o.name) + '님의 ' + (o.what || '사주를') + ' 분석하고 있어요</p>' : '') + '<div class="hj">' + g + '</div>' +
      '<b id="genStep">' + steps[0] + '</b><div class="gen-bars">' + bars + '</div>' +
      '<div class="gen-prog"><i id="genProg"></i></div><p id="genPct">0%</p></div>' +
      (withAd ? '<div class="gen-ad">' + adSlotHTML('사주 분석 중', 'loading') + '</div>' : '');
    document.body.appendChild(el);
    var s = el.querySelector('svg'); s.classList.add('fig'); if (!reduceMotion) s.classList.add('draw');
    if (reduceMotion){ el.querySelectorAll('u').forEach(function(u){ u.style.width = u.dataset.w + '%'; }); setTimeout(function(){ el.remove(); cb(); }, withAd ? 2400 : 500); return; }
    var T = o.quick ? 1700 : withAd ? 3800 : 3200, t0 = Date.now();
    setTimeout(function(){ el.querySelectorAll('u').forEach(function(u, i){ setTimeout(function(){ u.style.width = u.dataset.w + '%'; }, i * (o.quick ? 120 : 380)); }); }, o.quick ? 200 : 900);
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
      (cps.length ? cps.map(function(c){ var d = new Date(c.exp); return '<div class="pet-ticket sm"><small>COUPON</small><b>' + esc(c.name) + '</b><span>' + (d.getMonth()+1) + '월 ' + d.getDate() + '일까지 · 꿈풀이 때 엽전 대신 사용</span></div>'; }).join('')
        : '<div class="pet-mini-row">' + petSVG(petMood(pt.g), pt.lv, 'mini') + '<p class="helper">우니와 교감 ' + pt.g + '/100 · 가득 차면 꿈풀이 1회권을 받아요</p></div>') + '</div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">계정</h2></div>';
    if (NS){
      h += '<p class="body-text">예시 모드에서는 로그인할 수 없어요. 내 사주로 시작하면 기록을 계정에 보관할 수 있어요.</p><button class="btn-primary btn-block" id="btnMyStart">내 사주로 시작하기</button>';
    } else if (!auth){
      h += '<div class="acc-state"><span class="badge guest">게스트</span><span class="helper">지금은 이 기기의 브라우저에만 저장돼 있어요</span></div>' +
        '<ul class="benefits"><li>' + OK_SVG + '기기를 바꾸거나 앱을 지워도 출석·엽전이 그대로예요</li><li>' + OK_SVG + '저장한 사주와 열어 본 궁합 리포트가 보관돼요</li><li>' + OK_SVG + '가족·친구의 사주를 여러 기기에서 볼 수 있어요</li></ul>' +
        loginBtnsHTML() + (srvOn() ? '' : '<p class="mock-note">미리보기 모드예요 · 이 브라우저 안에서만 로그인한 것처럼 동작해요</p>');
    } else {
      var acc = store('unsu_account'), at = new Date(auth.srv ? (store('unsu_syncat') || Date.now()) : acc && acc.at ? acc.at : Date.now());
      h += '<div class="acc-state"><span class="badge member">로그인됨</span><span class="helper">' + PROV[auth.provider] + ' 계정 · ' + esc(auth.nick) + '</span></div>' +
        '<p class="helper">마지막 동기화 ' + (at.getMonth()+1) + '.' + at.getDate() + ' ' + pad2(at.getHours()) + ':' + pad2(at.getMinutes()) + ' · 출석과 엽전이 계정에 보관되고 있어요.</p>';
      if (myConfirm === 'logout') h += '<div class="inline-confirm">로그아웃하면 이 기기에서 내 정보가 지워져요. 같은 계정으로 다시 로그인하면 그대로 돌아와요.<div class="row"><button class="btn-ghost grow" data-mc="cancel">취소</button><button class="btn-ghost btn-danger grow" id="btnLogoutOk">로그아웃</button></div></div>';
      else h += '<button class="btn-ghost btn-block" id="btnLogout">로그아웃</button>';
      h += '<button class="text-btn" id="btnWithdraw" style="align-self:center">회원 탈퇴</button>';
    }
    h += '</div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">글자 크기</h2></div>' + fsSegHTML() + '</div>';
    h += '<div class="card"><div class="set-list">' +
      (NS ? '' : '<button class="set-row" id="setInvite"><span>친구에게 궁합 신청하기</span><span class="s">초대 링크 보내기 ›</span></button>') +
      '<button class="set-row" id="setMe"><span>대표 사주 바꾸기</span><span class="s">저장 목록에서 별 누르기 ›</span></button>' +
      (NS ? '<button class="set-row" id="setDemo"><span>예시 모드 끝내기</span><span class="s">첫 화면으로 ›</span></button>' : '') +
      '<button class="set-row danger" id="setReset"><span>이 기기의 데이터 초기화</span><span class="s">›</span></button>' +
      (myConfirm === 'reset' ? '<div class="inline-confirm">이 기기에 저장된 사주, 출석, 엽전이 모두 지워져요.' + (auth ? ' 계정에 보관된 기록은 남아 있어요.' : ' 로그인하지 않았다면 되돌릴 수 없어요.') + '<div class="row"><button class="btn-ghost grow" data-mc="cancel">취소</button><button class="btn-ghost btn-danger grow" id="btnResetOk">초기화</button></div></div>' : '') +
      '<div class="set-row" style="cursor:default"><span>앱 정보</span><span class="s">우니조아 v1.0 · 재미로 즐기는 콘텐츠</span></div>' +
      '</div></div>';
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
    if ($('btnWithdraw')) $('btnWithdraw').onclick = openWithdrawSheet;
    $('myBody').querySelectorAll('[data-mc]').forEach(function(b){ b.onclick = function(){ myConfirm = null; renderMy(); }; });
    $('myBody').querySelectorAll('[data-login]').forEach(function(b){ b.onclick = function(){ LOGIN_RESUME = null; if (!getConsent() || !getConsent().terms){ openConsentSheet(b.dataset.login); return; } doLogin(b.dataset.login, b); }; });
  }

  /* =========================================================
     로그인 · 로그아웃 (동기화 목업: 계정 스냅샷을 브라우저에 보관)
     ========================================================= */
  function snapshot(){ var o = {}; DATA_KEYS.forEach(function(k){ o[k] = store(k); }); return o; }
  var syncT = 0;
  function writeAccount(){ var a = store('unsu_auth'); if (!a || NS) return; if (a.srv){ pushSnapshot(); return; } store('unsu_account', { provider:a.provider, nick:a.nick, snapshot:snapshot(), at:Date.now() }); }
  syncHook = function(){ if (SRV.applying) return; clearTimeout(syncT); syncT = setTimeout(writeAccount, srvUser() ? 1500 : 60); };
  /* =========================================================
     출시 필수 화면: 가입 약관 동의 · 알림 설정(마케팅·야간 수신 동의) · 구매 내역 · 고객센터(FAQ·문의·공지) · 회원 탈퇴 · 앱 정보
     법적 근거 메모: 정보통신망법 제50조(광고성 정보 사전 동의, 야간 21~08시 별도 동의, 처리 결과 통지, 2년마다 재확인),
     개인정보보호법(필수/선택 동의 분리, 만 14세 미만 법정대리인 동의), 전자상거래법(구매 기록 5년 보관, 청약철회 안내)
     ========================================================= */
  function getConsent(){ var c = store('unsu_consent'); return c && typeof c === 'object' ? c : null; }
  function getNotif(){ var n = store('unsu_notif'); return n && typeof n === 'object' ? n : { daily:true, dailyAt:'08:00', att:true, pet:true, ny:true, mkt:false, night:false }; }
  function fmtDate(t){ var d = new Date(t); return d.getFullYear() + '.' + pad2(d.getMonth() + 1) + '.' + pad2(d.getDate()); }
  function swHTML(id, on, label, sub){
    return '<button type="button" class="nt-row" role="switch" id="' + id + '" aria-checked="' + !!on + '"><span class="nt-t"><b>' + label + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="sw"><i></i></span></button>';
  }
  /* 가입(첫 로그인) 직전 약관 동의 — 필수 3 + 선택 2 */
  function openConsentSheet(provider){
    var st = { age:false, terms:false, privacy:false, mkt:false, night:false };
    var items = [
      ['age', '만 14세 이상이에요', true, null],
      ['terms', '우니조아 이용약관 동의', true, 'terms'],
      ['privacy', '개인정보 수집·이용 동의', true, 'privacy'],
      ['mkt', '혜택·이벤트 알림 받기 (마케팅 정보 수신)', false, 'marketing'],
      ['night', '밤 9시~아침 8시에도 혜택 알림 받기', false, 'marketing']
    ];
    function draw(){
      var all = items.every(function(i){ return st[i[0]]; }), req = items.every(function(i){ return !i[2] || st[i[0]]; });
      $('sheetBody').innerHTML = '<h3 id="sheetTitle">우니조아 시작 전에 확인해 주세요</h3>' +
        '<button type="button" class="cs-all" data-ck="all" aria-pressed="' + all + '"><span class="ck"></span><b>모두 동의하기</b><small>선택 항목 포함 · 선택은 동의하지 않아도 가입할 수 있어요</small></button>' +
        '<div class="cs-list">' + items.map(function(i){
          return '<div class="cs-item"><button type="button" class="cs-ck" data-ck="' + i[0] + '" aria-pressed="' + st[i[0]] + '"><span class="ck"></span><span><em class="' + (i[2] ? 'req' : 'opt') + '">' + (i[2] ? '필수' : '선택') + '</em>' + i[1] + '</span></button>' + (i[3] ? '<button type="button" class="cs-view" data-doc="' + i[3] + '">보기</button>' : '') + '</div>';
        }).join('') + '</div>' +
        '<p class="helper" style="margin-top:6px">만 14세 미만은 보호자 동의가 필요해 지금은 가입할 수 없어요.</p>' +
        '<button class="btn-primary btn-block" id="csGo"' + (req ? '' : ' disabled') + ' style="margin-top:14px">동의하고 ' + PROV[provider] + '로 계속하기</button>' +
        '<button class="text-btn" data-close>취소</button>';
      $('sheetBody').querySelectorAll('[data-ck]').forEach(function(b){ b.onclick = function(){
        var k = b.dataset.ck;
        if (k === 'all'){ var v = !all; items.forEach(function(i){ st[i[0]] = v; }); }
        else { st[k] = !st[k]; if (k === 'night' && st.night) st.mkt = true; if (k === 'mkt' && !st.mkt) st.night = false; }
        draw();
      }; });
      $('csGo').onclick = function(){
        var now = Date.now();
        store('unsu_consent', { terms:now, privacy:now, age:now, mkt:st.mkt ? now : 0, night:st.night ? now : 0, v:'2026-12' });
        var n = getNotif(); n.mkt = st.mkt; n.night = st.night; store('unsu_notif', n);
        if (st.mkt) setTimeout(function(){ toast(fmtDate(now) + ' 혜택 알림 수신에 동의했어요'); }, 2600);
        if (srvUser()) pushConsent();
        doLogin(provider, this);
      };
    }
    openSheet('<div></div>'); draw();
  }
  /* 알림 설정 */
  function openNotifSheet(){
    var n = getNotif(), c = getConsent(), guest = isGuest();
    var times = ['07:00', '08:00', '09:00', '12:00', '18:00', '21:00'];
    openSheet('<h3 id="sheetTitle">알림 설정</h3>' +
      '<div class="st-cap">서비스 알림</div><div class="st-group">' +
        swHTML('ntDaily', n.daily, '오늘의 운세', '매일 정한 시간에 오늘 운세 한 줄') +
        '<div class="nt-time"' + (n.daily ? '' : ' hidden') + '><span>받는 시간</span><select class="sel" id="ntAt">' + times.map(function(t){ return '<option' + (t === n.dailyAt ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
        swHTML('ntAtt', n.att, '출석 알림', '연속 출석이 끊기기 전에 알려 드려요') +
        swHTML('ntPet', n.pet, '우니 알림', '교감이 가득 차서 선물을 받을 수 있을 때') +
        swHTML('ntNy', n.ny, '결제·이용 알림', '꿈풀이 결과 준비, 결제 완료 같은 거래 알림') +
      '</div>' +
      '<div class="st-cap" style="margin-top:14px">혜택 알림 (광고성 정보)</div><div class="st-group">' +
        swHTML('ntMkt', n.mkt, '혜택·이벤트 알림', '할인 쿠폰, 이벤트, 새 콘텐츠 소식') +
        swHTML('ntNight', n.night, '야간 혜택 알림', '밤 9시~아침 8시에도 받기') +
      '</div>' +
      '<p class="helper nt-law">' + (c && c.mkt ? '혜택 알림 동의일 ' + fmtDate(c.mkt) + ' · 2년마다 다시 확인해요. ' : '') + '혜택 알림을 꺼도 출석·결제 같은 서비스 알림은 계속 받아요.' +
      (guest ? ' 알림은 로그인하고 홈 화면에 우니조아를 추가하면 받을 수 있어요(아이폰은 iOS 16.4 이상).' : '') + '</p>' +
      '<button class="btn-primary btn-block" data-close style="margin-top:14px">확인</button>');
    function save(){ store('unsu_notif', n); }
    function bind(id, key, after){ $(id).onclick = function(){ n[key] = !n[key]; this.setAttribute('aria-checked', String(n[key])); if (after) after(n[key]); save(); }; }
    bind('ntDaily', 'daily', function(v){ document.querySelector('.nt-time').hidden = !v; });
    bind('ntAtt', 'att'); bind('ntPet', 'pet'); bind('ntNy', 'ny');
    $('ntAt').onchange = function(){ n.dailyAt = this.value; save(); toast('매일 ' + this.value + '에 알려 드릴게요'); };
    bind('ntMkt', 'mkt', function(v){
      var cs = getConsent() || {}; cs.mkt = v ? Date.now() : 0; if (!v){ cs.night = 0; n.night = false; $('ntNight').setAttribute('aria-checked', 'false'); }
      store('unsu_consent', cs); if (srvUser()) pushConsent(); toast(fmtDate(Date.now()) + ' 혜택 알림 수신에 ' + (v ? '동의했어요' : '동의를 철회했어요'));
    });
    bind('ntNight', 'night', function(v){
      var cs = getConsent() || {};
      if (v && !n.mkt){ n.mkt = true; cs.mkt = Date.now(); $('ntMkt').setAttribute('aria-checked', 'true'); }
      cs.night = v ? Date.now() : 0; store('unsu_consent', cs); if (srvUser()) pushConsent(); toast(fmtDate(Date.now()) + ' 야간 혜택 알림 수신에 ' + (v ? '동의했어요' : '동의를 철회했어요'));
    });
  }
  /* 구매 내역 */
  function getOrders(){ var o = store('unsu_orders'); return Array.isArray(o) ? o : []; }
  /* =========================================================
     유료 상품 (2026-11-15 소율: 맛보기만 무료, 상세는 원화 결제)
     토스 연결 전까지 PAY_READY=false → '준비 중' 안내. 예시 모드는 결제 없이 열어 볼 수 있다.
     ========================================================= */
  function payReady(){ return !!(srvUser() && SRV.cfg && SRV.cfg.pay && SRV.cfg.pay.on); }
  function product(id){
    return ({
      gh:{ id:'gh', name:'궁합 상세 리포트', coin:COST.gh, art:'gh', keep:'이 두 사람의 리포트는 계속 볼 수 있어요', items:['두 사람의 기질 비교','관계에서 빛나는 점과 부딪히기 쉬운 점','대화 팁과 올해 두 사람의 흐름'] },
      ez:{ id:'ez', name:'쉬운 사주 풀이', coin:COST.ez, art:'book', keep:'저장한 모든 사람의 풀이를 계속 볼 수 있어요', items:['십성으로 보는 나의 성향','띠 이야기','대운 흐름과 올해의 운'] }
    })[id];
  }
  function liveOrders(){ return getOrders().filter(function(o){ return o.status !== 'refund'; }); }
  function owns(id){ return liveOrders().some(function(o){ return o.id === id || (o.id === 'set' && (id === 'ny' || id === 'ez')); }); }
  function addOrder(id, extra){
    var P = product(id), o = getOrders();
    var rec = { id:id, name:P.name, coin:P.coin, at:Date.now(), status:'paid', opened:true };
    Object.keys(extra || {}).forEach(function(k){ if (extra[k] != null) rec[k] = extra[k]; });
    o.unshift(rec); store('unsu_orders', o);
  }
  /* 공통 열기 시트(엽전). opt.onPaid: 연 뒤 실행, opt.ghKey: 궁합 쌍, opt.who: 대상 이름 */
  function openPaySheet(id, opt){
    opt = opt || {};
    var P = product(id), guest = isGuest(), coins = getCoins(), short = !guest && !NS && !passActive() && coins < P.coin;
    openSheet('<div class="pay-sheet"><div class="pay-hero">' + tileArtSVG(P.art) + '</div>' +
      '<h3 id="sheetTitle">' + P.name + '</h3>' + (opt.who ? '<p class="pay-who">' + opt.who + '</p>' : '') +
      '<ul class="pay-list">' + P.items.map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ul>' +
      '<div class="pay-price">' + COIN_SVG + '<b>' + P.coin.toLocaleString() + '닢</b></div>' +
      passLinkHTML() + '<button class="btn-primary btn-block" id="payGo">' + (guest ? '로그인하고 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢 받기' : short ? buyLabel(id) : passActive() ? '우니 패스로 열기' : '엽전 ' + P.coin.toLocaleString() + '닢으로 열기') + '</button>' +
      '<p class="helper pay-note">' + (guest ? '처음 로그인하면 받는 엽전으로 바로 열 수 있어요.' : NS ? '예시 모드에서는 엽전 없이 열어 볼 수 있어요.' : short ? '엽전이 ' + (P.coin - coins).toLocaleString() + '닢 부족해요 · 보유 ' + coins.toLocaleString() + '닢' : '보유 ' + coins.toLocaleString() + '닢 · 한 번 열면 ' + P.keep) + '</p><p class="helper pay-note" style="margin-top:2px">연 리포트는 보관함 › 열어 둔 리포트에서 다시 열 수 있어요. ' + (isGuest() || NS ? '' : '지금은 이 기기에 보관되고, 계정 연동이 열리면 기기를 바꿔도 이어져요.') + '</p></div>');
    $('payGo').onclick = function(){
      if (guest){ openLoginSheet('처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요. ' + topic(P.name) + ' ' + P.coin + '닢이에요.'); return; }
      var item = id === 'gh' ? 'gh:' + String(opt.ghKey || '').replace(/\s+/g, '') : id, rs = { k:'pay', pid:id, ghKey:id === 'gh' ? opt.ghKey : null };
      var paid = function(){
        addOrder(id, { ghKey:id === 'gh' ? opt.ghKey : null });
        closeSheet(); setTimeout(function(){ if (opt.onPaid) opt.onPaid(); toast(P.name + ' 열렸어요'); }, 260);
      };
      if (short){ openBuySheet({ cost:P.coin, why:P.name, item:item, rs:rs }); return; }
      spendCoins(P.coin, P.name, item, paid, rs);
    };
  }
  function openOrdersSheet(){
    var o = getOrders(), ch = srvUser() ? SRV.orders : [];
    var ST = { paid:'결제 완료', refunded:'환불 완료', canceled:'취소됨', failed:'결제 실패' };
    openSheet('<h3 id="sheetTitle">구매 내역</h3>' +
      (ch.length ? '<div class="st-cap">결제</div><div class="st-group">' + ch.map(function(x){
        var bk = /^buy:([a-z]+)/.exec(x.pack || ''), bn = bk && ((SRV.cfg && SRV.cfg.wonNames && SRV.cfg.wonNames[bk[1]]) || '콘텐츠');
        return '<div class="od-row"><div><b>' + (bn || (/^pass/.test(x.pack || '') ? PASS.name : '엽전 ' + (x.coins + x.bonus).toLocaleString() + '닢')) + '</b><small>' + fmtDate(Date.parse(x.approved_at || x.created_at)) + ' · ' + (ST[x.status] || x.status) +
          (x.receipt_url ? ' · <a href="' + esc(x.receipt_url) + '" target="_blank" rel="noopener">영수증</a>' : '') + '</small></div><span>' + x.amount.toLocaleString() + '원</span></div>';
      }).join('') + '</div><div class="st-cap" style="margin-top:14px">엽전으로 연 콘텐츠</div>' : '') +
      (o.length ? '<div class="st-group">' + o.map(function(x){
        return '<div class="od-row"><div><b>' + esc(x.name) + '</b><small>' + fmtDate(x.at) + ' · ' + (x.status === 'refund' ? '환불 완료' : x.opened ? '열람함' : '결제 완료 · 열기 전') + '</small></div><span>' + (x.coin ? x.coin.toLocaleString() + '닢' : (x.amount || 0).toLocaleString() + '원') + '</span></div>';
      }).join('') + '</div>'
      : ch.length ? '<p class="helper">아직 엽전으로 연 콘텐츠가 없어요.</p>' : '<div class="empty-box"><b>아직 구매한 리포트가 없어요</b><p class="helper">유료 상품을 결제하면 여기에 보관돼요. 결제 기록은 전자상거래법에 따라 5년 동안 보관해요.</p></div>') +
      '<p class="helper" style="margin-top:12px">콘텐츠 단건 결제는 결제 즉시 열리는 디지털 콘텐츠라 연 뒤에는 환불이 제한돼요. 오류로 열리지 않았다면 전액 환불해요. <button class="link-btn" data-doc="refund">환불 정책</button></p>' +
      '<button class="btn-primary btn-block" data-close style="margin-top:14px">확인</button>');
  }
  /* 고객센터: 공지 · FAQ · 문의 */
  var NOTICES = [
    { d:'2026-12-14', t:'우니조아 정식 오픈 · 2027 신년운세 총평 무료 공개' },
    { d:'2026-12-04', t:'개인정보처리방침·이용약관 시행 안내' }
  ];
  var FAQ = [
    ['태어난 시간을 몰라도 볼 수 있나요?', '네. 시간을 모르면 시주를 빼고 여섯 글자로 풀어요. 정확도는 조금 낮아질 수 있어요.'],
    ['엽전은 무엇인가요?', '출석·가입 선물·우니 선물로 모으는 우니조아의 무료 포인트예요. 꿈 풀이 리포트, 분야별 운세, 궁합 상세, 쉬운 사주 풀이, 중요한 날 잡기를 열 때 써요. 엽전은 돈으로 사고팔 수 없고 현금으로 바꿀 수 없어요. 엽전이 모자라면 그 콘텐츠 하나만 원화로 바로 결제할 수 있어요.'],
    ['신년운세는 유료인가요?', '아니에요. 총평과 1~3월은 바로 무료로 보고, 광고 한 편을 끝까지 보면 4~12월과 2~7장 전체가 무료로 열려요. 한 번 열면 그 사람의 신년운세는 계속 다시 볼 수 있어요.'],
    ['결제한 콘텐츠를 환불할 수 있나요?', '콘텐츠 단건 결제는 결제하자마자 열리는 디지털 콘텐츠라 연 뒤에는 환불이 제한돼요. 결제했는데 오류로 열리지 않았다면 전액 환불해요. 우니 패스는 한 번도 쓰지 않았다면 전액, 쓰기 시작했다면 남은 날짜만큼 환불 정책에 따라 돌려드려요.'],
    ['기기를 바꾸면 기록이 사라지나요?', '로그인하면 사주 목록, 출석, 엽전, 구매한 리포트가 계정에 보관돼요. 게스트로 쓰면 이 기기의 브라우저에만 저장돼요.'],
    ['꿈풀이에 쓴 엽전을 돌려받을 수 있나요?', '꿈풀이는 누르는 순간 바로 풀이가 만들어지는 디지털 콘텐츠라 엽전을 돌려드리지 않아요. 다만 오류로 결과가 나오지 않았다면 고객센터로 알려 주세요. 확인 후 엽전을 다시 넣어 드려요.'],
    ['행운의 숫자는 어떻게 정하나요?', '오늘 나에게 필요한 오행(木火土金水)의 끝자리로 정해요. 목 3·8, 화 2·7, 토 5·0, 금 4·9, 수 1·6이에요. 약속 시간이나 자리를 고를 때 가볍게 참고하는 재미용 힌트예요.'],
    ['알림이 오지 않아요.', '홈 화면에 우니조아를 추가하고 설정 > 알림 설정에서 켜 주세요. 아이폰은 iOS 16.4 이상, 홈 화면에 추가한 경우에만 알림을 받을 수 있어요.']
  ];
  function openHelpSheet(){
    var mail = BIZ.email || '';
    openSheet('<h3 id="sheetTitle">고객센터</h3>' +
      '<div class="st-cap">공지사항</div><div class="st-group">' + NOTICES.map(function(n){ return '<div class="od-row"><div><b>' + esc(n.t) + '</b><small>' + n.d.replace(/-/g, '.') + '</small></div></div>'; }).join('') + '</div>' +
      '<div class="st-cap" style="margin-top:14px">자주 묻는 질문</div><div class="st-group faq">' + FAQ.map(function(f){ return '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div>' +
      '<div class="st-cap" style="margin-top:14px">1:1 문의</div><div class="st-group" style="padding:14px">' +
        '<p class="helper">결제·환불·오류 문의는 메일로 받아요. 평일 10시~18시, 1영업일 안에 답해 드려요.</p>' +
        (mail ? '<a class="btn-soft btn-block" style="margin-top:10px;text-decoration:none" href="mailto:' + esc(mail) + '?subject=' + encodeURIComponent('[우니조아 문의] ') + '">메일로 문의하기</a>' : '<p class="helper" style="margin-top:8px"><span class="todo">출시 전 입력</span> 고객센터 메일 주소</p>') +
      '</div>' + bizFootHTML() +
      '<button class="btn-primary btn-block" data-close style="margin-top:14px">확인</button>');
  }
  /* 앱 정보 · 오픈소스 */
  function openAboutSheet(){
    openSheet('<h3 id="sheetTitle">앱 정보</h3><div class="st-group">' +
      '<div class="od-row"><div><b>버전</b></div><span>우니조아 v1.0</span></div>' +
      '<div class="od-row"><div><b>콘텐츠 안내</b><small>사주·운세·행운 숫자는 전통 명리 이론을 바탕으로 한 재미·참고용 콘텐츠예요.</small></div></div>' +
      '<div class="od-row"><div><b>오픈소스 라이선스</b><small>korean-lunar-calendar v0.4.0 (MIT) · GSAP 3 (Standard License) · QRCode.js (MIT) · Pretendard (OFL)</small></div></div>' +
      '</div>' + bizFootHTML() + '<button class="btn-primary btn-block" data-close style="margin-top:14px">확인</button>');
  }
  /* 회원 탈퇴 */
  function openWithdrawSheet(){
    if (isGuest()) return;
    openSheet('<h3 id="sheetTitle">회원 탈퇴</h3>' +
      '<ul class="benefits wd"><li>저장한 사주, 출석 기록, 엽전, 쿠폰, 우니 성장 기록이 모두 지워지고 되돌릴 수 없어요.</li>' +
      '<li>남은 엽전(충전한 엽전 포함)은 모두 사라져요. 쓰지 않은 충전 엽전이 있으면 탈퇴 전에 고객센터로 환불을 요청해 주세요.</li>' +
      '<li>결제 기록은 전자상거래법에 따라 5년 동안 분리 보관한 뒤 파기해요.</li>' +
      '<li>같은 계정으로 다시 가입해도 가입 선물 엽전은 다시 드리지 않아요.</li></ul>' +
      '<button type="button" class="cs-ck" id="wdAgree" aria-pressed="false" style="margin-top:14px"><span class="ck"></span><span>안내를 모두 확인했어요</span></button>' +
      '<button class="btn-ghost btn-danger btn-block" id="wdGo" disabled style="margin-top:12px">탈퇴하기</button><button class="text-btn" data-close>취소</button>');
    $('wdAgree').onclick = function(){ var v = this.getAttribute('aria-pressed') !== 'true'; this.setAttribute('aria-pressed', String(v)); $('wdGo').disabled = !v; };
    $('wdGo').onclick = function(){
      if (srvUser()){
        var btn = this; btn.disabled = true; btn.textContent = '탈퇴 처리 중…';
        api('/api/me', { method:'DELETE', body:{ confirm:1 } }).then(function(r){
          if (!r.ok) throw 0;
          store('unsu_account', null); store('unsu_auth', null); store('unsu_consent', null); store('unsu_notif', null); try { localStorage.removeItem('unsu_syncat'); } catch(e){} clearData();
          closeSheet(); updateSegCount(); updateTopbar(); go('today'); toast('탈퇴했어요. 그동안 우니조아와 함께해 주셔서 고마워요');
        }).catch(function(){ btn.disabled = false; btn.textContent = '탈퇴하기'; toast('탈퇴를 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요'); });
        return;
      }
      store('unsu_account', null); store('unsu_auth', null); store('unsu_consent', null); store('unsu_notif', null); clearData();
      closeSheet(); updateSegCount(); updateTopbar(); go('today'); toast('탈퇴했어요. 그동안 우니조아와 함께해 주셔서 고마워요');
    };
  }
  function objJosa(w){ var c = String(w).charCodeAt(String(w).length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? '을' : '를'); }
  /* 받침에 따라 은/는 */
  function topic(w){ var c = String(w).charCodeAt(String(w).length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? '은' : '는'); }
  /* 로그인하러 갔다 오면(페이지 이동) 원래 보던 탭과 잠금 화면으로 돌려보낸다: { tab, k:'cat'|'tk'|'coin', … } */
  var LOGIN_RESUME = null;
  function openLoginSheet(reason, resume){
    if (NS){ toast('예시 모드에서는 로그인할 수 없어요'); return; }
    LOGIN_RESUME = resume || null;
    openSheet('<div class="sheet-fig">' + uniImg('u-wave') + '</div><h3 id="sheetTitle">로그인하고 기록 지키기</h3>' + (reason ? '<p class="body-text" style="margin:-6px 0 14px">' + reason + '</p>' : '') +
      '<ul class="benefits"><li>' + OK_SVG + '<span><b>처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢</b>을 바로 드려요</span></li><li>' + OK_SVG + '<span>기기를 바꿔도 출석·엽전이 그대로예요</span></li><li>' + OK_SVG + '<span>저장한 사주와 궁합 리포트가 계정에 보관돼요</span></li></ul>' +
      '<div class="view" style="gap:8px;margin-top:18px">' + loginBtnsHTML() +
      '<button class="text-btn" data-close>나중에 할게요</button>' + (srvOn() ? '' : '<p class="mock-note">미리보기 모드예요 · 이 브라우저 안에서만 로그인한 것처럼 동작해요</p>') + '</div>');
    $('sheetBody').querySelectorAll('[data-login]').forEach(function(b){ b.onclick = function(){ if (!getConsent() || !getConsent().terms){ openConsentSheet(b.dataset.login); return; } doLogin(b.dataset.login, b); }; });
  }
  function doLogin(provider, btn){
    if (NS){ toast('예시 모드에서는 로그인할 수 없어요'); return; }
    if (srvOn()){   /* 실제 로그인: 동의 화면 → /auth/<provider>/callback → /?login=<provider> 로 돌아온다 */
      if (btn){ btn.disabled = true; btn.textContent = PROV[provider] + '로 이동 중…'; }
      var rs = Object.assign({}, LOGIN_RESUME || {}); rs.tab = rs.tab || currentTab || 'today'; LOGIN_RESUME = null;
      try { sessionStorage.setItem('wj_back', JSON.stringify(rs)); } catch(e){}
      location.href = '/auth/' + (provider === 'google' ? 'google' : 'kakao');
      return;
    }
    if (btn){ btn.disabled = true; btn.textContent = '연결 중…'; }
    setTimeout(function(){
      var acc = store('unsu_account'), restored = false;
      if (acc && acc.provider === provider && acc.snapshot && acc.snapshot.unsu_me && !getMe()){
        DATA_KEYS.forEach(function(k){ var v = acc.snapshot[k]; if (v !== null && v !== undefined) store(k, v); });
        restored = true;
      }
      var me = getMe();
      store('unsu_auth', { provider:provider, nick:me ? me.name : (acc && acc.nick) || '우니조아 사용자', at:Date.now() });
      var gift = !store('unsu_gift');
      if (gift){ store('unsu_gift', 1); addCoins(SIGNUP_COINS, '가입 환영 선물'); }
      writeAccount(); closeSheet(); updateSegCount(); updateTopbar();
      toast(gift ? PROV[provider] + ' 계정으로 로그인했어요 · 가입 선물 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 받았어요' : restored ? '다시 오셨네요! 계정의 기록을 불러왔어요' : PROV[provider] + ' 계정으로 로그인했어요 · 기록이 동기화돼요');
      if (currentView === 'my') renderMy();
      else if (currentView === 'dream' && $('dmInput') && !$('dmInput').hidden){ renderDreamInput(); }  /* 꿈해몽 입력 중 로그인하면 작성하던 내용 그대로 유지 */
      else go('today');
    }, 900);
  }
  function doLogout(){
    if (srvUser()){
      var prov = (store('unsu_auth') || {}).provider;
      pushSnapshot(true).then(function(){ return api('/api/auth?a=logout', { method:'POST', body:{} }); }).catch(function(){}).then(function(){
        store('unsu_auth', null); try { localStorage.removeItem('unsu_syncat'); localStorage.removeItem('wj_merge'); } catch(e){} clearData();
        updateSegCount(); updateTopbar(); go('today'); toast('로그아웃했어요. ' + (PROV[prov] || '같은 계정') + '로 다시 로그인하면 기록이 돌아와요');
      });
      return;
    }
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
    var done = function(){ if (el.hidden) return; el.classList.add('out'); setTimeout(function(){ el.hidden = true; }, 800); };
    el.onclick = done;
    setTimeout(done, reduceMotion ? 900 : 3400);  /* 로고가 다 그려진 뒤 한 박자 쉬고 넘어가도록 */
  })();

  /* =========================================================
     공유 · 초대 링크
     - Claude 아티팩트 안: 공개 아티팩트 링크(+ #토큰)로 공유
     - 직접 배포한 주소: 그 주소(+ ?i=초대코드)로 공유
     ========================================================= */
  var APP_URL = 'https://claude.ai/artifact/NNHb2ZK2F9wc6rpagwoEhm';
  function inFrame(){ try { return window.top !== window.self; } catch(e){ return true; } }
  function isHosted(){ return /^https?:$/.test(location.protocol) && !inFrame(); }
  var IS_LOCAL = /^(localhost|127\.|192\.168\.|10\.)/.test(location.hostname);
  function basePath(){ return /^\/s\//.test(location.pathname) ? '/' : location.pathname; }   /* /s/코드 로 들어왔어도 앱 주소는 루트 */
  function shareBase(){ return isHosted() ? location.origin + basePath() : APP_URL; }
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
  /* ---- 결과 공유 링크 (?r=…) ----
     입력값(이름·성별·양/음력·생년월일·시간·보정)과 공유한 날짜를 링크에 그대로 담는다.
     계산은 전부 seed 기반이라 같은 입력 + 같은 날짜면 어느 폰에서 열어도 숫자 하나까지 같다.
     형식: r1|타입|YYYYMMDD|추가값|사람1(7칸)|사람2(7칸)  타입 s 사주 · d 오늘 운세 · n 행운 숫자 · g 궁합 · z 별자리 · c 분야별 운세(추가값=분야) */
  var EF = 7;
  function encEntry(e){
    return [String(e.name || '').replace(/\|/g, ' ').slice(0, 12), e.gender === 'M' ? 'M' : 'F', e.cal === 'lunar' ? 'l' : 's', e.leap ? '1' : '0',
      '' + e.y + pad2(e.m) + pad2(e.d), e.unknown ? '' : pad2(e.hour) + pad2(e.minute), e.corr === false ? '0' : '1'].join('|');
  }
  function decEntry(p){
    if (!p || p.length < EF || !/^\d{8}$/.test(p[4])) return null;
    var t = /^\d{4}$/.test(p[5]) ? p[5] : '';
    var e = { name:(p[0] || '친구').slice(0, 12), gender:p[1] === 'M' ? 'M' : 'F', cal:p[2] === 'l' ? 'lunar' : 'solar', leap:p[3] === '1',
      y:+p[4].slice(0, 4), m:+p[4].slice(4, 6), d:+p[4].slice(6, 8), unknown:!t, hour:t ? +t.slice(0, 2) : null, minute:t ? +t.slice(2, 4) : null, corr:p[6] !== '0' };
    if (t && (e.hour > 23 || e.minute > 59)) return null;
    return compute(e).error ? null : e;
  }
  function encodeShare(type, date, entries, extra){
    return b64u(['r1', type, String(date).replace(/-/g, ''), String(extra || '').replace(/\|/g, '')].concat(entries.map(encEntry)).join('|'));
  }
  function decodeShare(code){
    var S = SHARE.decode(code);
    if (S && S.type === 'z' && !zByName(S.extra.split('~')[0])) return null;
    return S;
  }
  function resultLink(type, date, entries, extra){
    var c = encodeShare(type, date, entries, extra);
    if (!isHosted()) return APP_URL + '#r.' + c;
    /* 배포 주소: /s/코드 → 서버가 결과 카드 미리보기(og 이미지)를 붙여 준다. 로컬 미리보기(serve)에는 그 경로가 없어 ?r= 로 */
    return IS_LOCAL ? shareBase() + '?r=' + c : location.origin + '/s/' + c;
  }
  function shortUrl(u){ u = u.replace(/^https?:\/\//, ''); return u.length > 42 ? u.slice(0, 30) + '…' + u.slice(-8) : u; }


  var shareState = null;
  function currentLink(){ var o = shareState; return o.inviteEntry ? inviteLink(o.inviteEntry, o.withTime) : o.link; }
  function fullMsg(){ return shareState.text + '\n\n' + shareState.cta + '\n' + currentLink(); }
  /* ---- 공유 카드 이미지 (1080×1350): 결과만 깔끔하게 ---- */
  var DL_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  function makeShareCard(o, cb){
    var W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d'), c = o.card || { kicker:o.title, head:o.desc };
    var FONT = '"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif';
    function rr(X, Y, w, h, r){ x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
    function wrap(t, maxW, maxL){ var out = [], line = ''; t.split(' ').forEach(function(wd){ var tt = line ? line + ' ' + wd : wd; if (x.measureText(tt).width <= maxW || !line){ line = tt; } else { out.push(line); line = wd; } while (x.measureText(line).width > maxW && line.length > 1){ var k = line.length; while (k > 1 && x.measureText(line.slice(0, k)).width > maxW) k--; out.push(line.slice(0, k)); line = line.slice(k); } }); if (line) out.push(line);
      if (out.length > maxL){ out = out.slice(0, maxL); out[maxL - 1] = out[maxL - 1].slice(0, -1) + '…'; } return out; }
    function draw(uni){
      var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#120d36'); g.addColorStop(.55, '#2b2170'); g.addColorStop(1, '#4b3b9c');
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      var rg = x.createRadialGradient(540, 360, 20, 540, 360, 520); rg.addColorStop(0, 'rgba(185,168,255,.35)'); rg.addColorStop(1, 'rgba(185,168,255,0)'); x.fillStyle = rg; x.fillRect(0, 0, W, H);
      var rnd = mulberry32(seedHash(c.kicker || 'w'));
      for (var i = 0; i < 90; i++){ x.globalAlpha = .25 + rnd() * .6; x.fillStyle = '#fff'; x.beginPath(); x.arc(rnd() * W, rnd() * H, rnd() * 2.6 + .6, 0, 7); x.fill(); }
      x.globalAlpha = 1;
      x.textBaseline = 'middle';
      x.font = '700 46px ' + FONT; x.fillStyle = '#fff'; x.textAlign = 'left'; x.fillText('우니', 80, 100);
      var ww = x.measureText('우니').width; x.fillStyle = '#b3a8ff'; x.fillText('조아', 80 + ww, 100);
      var d = new Date(); x.font = '500 32px ' + FONT; x.fillStyle = '#cfc7f2'; x.textAlign = 'right'; x.fillText(d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(), W - 80, 100);
      /* 유리 패널 */
      rr(70, 330, W - 140, 840, 56); x.fillStyle = 'rgba(255,255,255,.10)'; x.fill(); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.28)'; x.stroke();
      if (uni) x.drawImage(uni, W / 2 - 150, 150, 300, 300);
      x.textAlign = 'center';
      x.font = '600 40px ' + FONT; x.fillStyle = '#d9d1ff'; x.fillText(c.kicker || '', W / 2, 500);
      x.font = '700 66px ' + FONT; x.fillStyle = '#fff';
      var lines = wrap(c.head || '', W - 260, 3), y = 600;
      lines.forEach(function(l){ x.fillText(l, W / 2, y); y += 86; });
      y += 30;
      if (c.tag){ x.font = '700 36px ' + FONT; var tw = x.measureText(c.tag).width + 60; rr(W / 2 - tw / 2, y - 32, tw, 64, 32); x.fillStyle = '#f5d48a'; x.fill(); x.fillStyle = '#2a1c00'; x.fillText(c.tag, W / 2, y); y += 90; }
      if (c.nums){
        var n = c.nums.length, CW = 150, CH = 124, gap = 24, tot = n * CW + (n - 1) * gap, sx = W / 2 - tot / 2;
        c.nums.forEach(function(v, i){ var cx = sx + i * (CW + gap) + CW / 2, cy = y + 60;
          rr(cx - CW / 2, cy - CH / 2, CW, CH, 32); x.fillStyle = 'rgba(245,212,138,.16)'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#f5d48a'; x.stroke();
          x.fillStyle = '#f5d48a'; x.font = '800 58px "Space Grotesk",' + FONT; x.fillText(String(v), cx, cy + 2); });
        y += 170;
      }
      if (c.rows){
        c.rows.forEach(function(rw){
          x.textAlign = 'left'; x.font = '600 38px ' + FONT; x.fillStyle = '#e6e1f7'; x.fillText(rw[0], 160, y);
          x.textAlign = 'right'; x.font = '800 52px "Space Grotesk",' + FONT; x.fillStyle = rw[1] >= 80 ? '#f5d48a' : rw[1] >= 60 ? '#c9b9ff' : rw[1] >= 40 ? '#8fe3d0' : '#ff9aa5'; x.fillText(rw[1] + '점', W - 160, y);
          rr(160, y + 38, W - 320, 12, 6); x.fillStyle = 'rgba(255,255,255,.14)'; x.fill();
          rr(160, y + 38, (W - 320) * Math.max(.04, rw[1] / 100), 12, 6); x.fillStyle = rw[1] >= 80 ? '#f5d48a' : '#b9a8ff'; x.fill();
          y += 120;
        });
      }
      x.textAlign = 'center'; x.font = '500 30px ' + FONT; x.fillStyle = 'rgba(230,225,247,.75)'; x.fillText('재미로 보는 운세예요', W / 2, 1136);
      /* 하단 */
      x.textAlign = 'left'; x.font = '700 40px ' + FONT; x.fillStyle = '#fff'; x.fillText('매일 열어보는 나만의 행운 부적', 80, 1236);
      x.font = '500 30px ' + FONT; x.fillStyle = '#cfc7f2'; x.fillText('생년월일만 넣으면 바로 · 우니조아', 80, 1290);
      x.font = '700 32px ' + FONT; var pw = x.measureText('woonijoa.com').width + 56; rr(W - 80 - pw, 1230, pw, 64, 32); x.fillStyle = '#fff'; x.fill();
      x.fillStyle = '#1b1440'; x.textAlign = 'center'; x.fillText('woonijoa.com', W - 80 - pw / 2, 1263);
      cv.toBlob(function(b){ if (b) cb(b, URL.createObjectURL(b)); }, 'image/png');
    }
    var go = function(){
      var img = new Image(), svg = petSVGVec('love', 2, '').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" ');
      img.onload = function(){ draw(img); }; img.onerror = function(){ draw(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    };
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 66px "IBM Plex Sans KR"'), document.fonts.load('700 48px "Space Grotesk"')]).then(go, go); else go();
  }
  function openShare(o){ shareState = o; o.withTime = true; renderShareSheet(); }
  document.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('#shNative,#shLink,#shMsg')) markTodo('shared'); });
  function renderShareSheet(){
    var o = shareState, link = currentLink();
    var h = '<div class="sheet-fig sm">' + uniImg('u-share') + '</div><h3 id="sheetTitle">' + o.sheetTitle + '</h3>' +
      '<div class="sh-cardimg"><img id="shImg" alt="공유할 결과 카드 미리보기"></div>' +
      '<a class="sc-url sh-link" href="' + esc(link) + '" target="_blank" rel="noopener">' + SH_IC.link + esc(shortUrl(link)) + '</a>';
    if (o.inviteEntry){
      h += '<button type="button" class="unk-btn" id="shTime" aria-pressed="' + !o.withTime + '"' + (o.inviteEntry.unknown ? ' hidden' : '') + '><span>태어난 시간은 빼고 보내기</span><span class="ck">' + (!o.withTime ? OK_SVG : '') + '</span></button>' +
        '<p class="privacy" style="margin-top:10px">' + SHIELD_SVG + '<span>이 링크에는 궁합 계산을 위해 ' + esc(o.inviteEntry.name) + '님의 이름·생년월일' + (o.withTime && !o.inviteEntry.unknown ? '·태어난 시간' : '') + '이 담겨요. 믿을 수 있는 사람에게만 보내 주세요.</span></p>';
    }
    if (!o.inviteEntry && o.shareEntries && o.shareEntries.length){
      h += '<p class="privacy" style="margin-top:10px">' + SHIELD_SVG + '<span>받는 사람도 똑같은 결과를 보도록 이 링크에 ' + o.shareEntries.map(function(e){ return esc(e.name); }).join('·') + '님의 이름·생년월일' +
        (o.shareEntries.some(function(e){ return !e.unknown; }) ? '·태어난 시간' : '') + '이 담겨요. 믿을 수 있는 사람에게만 보내 주세요.</span></p>';
    }
    h += '<div class="share-actions">' +
      '<div class="sh-3"><button class="btn-soft" id="shSave">' + DL_IC + '이미지 저장</button><button class="btn-soft" id="shLink">' + SH_IC.link + '링크 복사</button><button class="btn-primary" id="shNative">' + SH_IC.send + '공유하기</button></div>' +
      '<button class="text-btn" id="shMsg">메시지와 링크만 복사</button></div>' +
      '<details class="sh-qr" id="shQrBox"><summary>QR 코드로 열기 <span class="helper">PC에서 휴대폰으로 넘길 때</span></summary><div id="shQr"></div></details>';
    if (!isHosted()) h += '<p class="mock-note" style="margin-top:12px">지금은 Claude 공유 링크로 연결돼요. 직접 배포한 주소에서 열면 그 주소로 공유돼요.</p>';
    openSheet(h);
    var cardBlob = null;
    makeShareCard(o, function(blob, url){ cardBlob = blob; if ($('shImg')) $('shImg').src = url; });
    $('shSave').onclick = function(){
      if (!cardBlob){ toast('카드를 만드는 중이에요. 잠시 후 다시 눌러 주세요'); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(cardBlob); a.download = 'woonijoa-' + todayStr() + '.png';
      document.body.appendChild(a); a.click(); a.remove(); toast('이미지를 저장했어요'); markTodo('shared');
    };
    $('shNative').onclick = function(){
      var link = currentLink(), data = { title:o.title, text:o.text + '\n\n' + o.cta, url:link };
      /* 링크만 보낸다: 카톡·문자에서 링크 미리보기가 결과 카드 이미지로 뜨고, 누르면 결과 화면으로 이어진다.
         (이미지 파일을 같이 보내면 앱에 따라 링크가 빠져서 카드만 덩그러니 남았다. 이미지는 '이미지 저장'으로 따로) */
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
      text:'[우니조아] ' + me.name + '님이 궁합 신청을 보냈어요\n생년월일만 입력하면 우리 둘의 궁합 점수와 풀이가 바로 나와요. 가입은 필요 없어요.',
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

  /* ---- 공유 링크로 들어온 경우: 보낸 사람이 본 결과를 그 날짜 기준으로 그대로 ---- */
  var SHARED = null;
  function sharedBarHTML(S, who){
    var dt = S.date;
    return '<div class="demo-bar shared-bar"><span>' + (who ? '<b>' + esc(who) + '</b>님이 공유한 결과' : '친구가 공유한 결과') + ' · ' + (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일 기준</span><button type="button" data-shared-mine>내 것도 보기</button></div>';
  }
  /* 공유받은 화면: 하단 메뉴 대신 '내 것 보러 가기' 버튼 하나만 고정한다 */
  var SHARED_CTA = { s:['내 사주 보러 가기', 'saju'], d:['내 오늘 운세 보러 가기', 'today'], n:['내 행운 부적 열어 보기', 'num'], g:['나도 궁합 보러 가기', 'gunghap'], z:['내 운세 보러 가기', 'today'], c:['내 운세 보러 가기', 'today'] };
  function sharedDock(S){
    var d = $('sharedDock'), c = SHARED_CTA[S.type];
    if (!d){ d = document.createElement('div'); d.id = 'sharedDock'; d.className = 'shared-dock'; document.body.appendChild(d); }
    d.innerHTML = '<div class="shared-dock-in"><p>생년월일만 넣으면 30초 · 가입 없이 바로</p><button type="button" class="btn-primary btn-block sheen" id="btnSharedGo">' + c[0] + '</button></div>';
    $('btnSharedGo').onclick = function(){ leaveShared(c[1]); };
    document.body.classList.add('shared-mode');
  }
  function sharedOff(){ SHARED = null; document.body.classList.remove('shared-mode'); var d = $('sharedDock'); if (d) d.remove(); try { history.replaceState(null, '', basePath()); } catch(e){} }
  /* 링크를 열면 잠깐 '분석 중'을 보여 주고 결과로 넘어간다 (짧게, 광고 없이) */
  function sharedLoading(S, cb){
    var A = S.entries[0];
    if (A){ showGen(withDate(S.date, function(){ return compute(A); }), cb, { name:A.name, ad:false, quick:true, what:S.type === 's' ? '사주를' : S.type === 'g' ? '궁합을' : S.type === 'n' ? '행운 부적을' : '운세를' }); return; }
    var el = document.createElement('div'); el.className = 'gen'; el.setAttribute('role', 'status');
    el.innerHTML = '<div class="gen-main"><div class="gen-fig">' + uniImg('u-zodiac') + '</div><p class="gen-who">별자리 운세를 불러오고 있어요</p><div class="gen-prog"><i style="width:0;transition:width 1.1s linear"></i></div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function(){ var i = el.querySelector('.gen-prog i'); if (i) i.style.width = '100%'; });
    setTimeout(function(){ el.remove(); cb(); }, reduceMotion ? 400 : 1300);
  }
  function leaveShared(target){
    sharedOff();
    try { history.replaceState(null, '', basePath()); } catch(e){}
    if (target === 'gunghap'){ go('gunghap'); return; }
    if (!getMe()){ startOnboarding('new'); return; }
    go(target || 'today');
  }
  function bindSharedCta(root, target){
    root.querySelectorAll('[data-shared-mine]').forEach(function(b){ b.onclick = function(){ leaveShared(target); }; });
  }
  function openShared(S){
    var A = S.entries[0], B = S.entries[1];
    if (S.type === 's'){
      var r = withDate(S.date, function(){ return compute(A); });
      withDate(S.date, function(){ openResult(A, r); });
      $('resultBody').insertAdjacentHTML('afterbegin', sharedBarHTML(S, A.name));
      bindSharedCta($('resultBody'), 'saju');
      S.view = 'result'; sharedDock(S);
      return;
    }
    if (S.type === 'z'){
      var zp = S.extra.split('~'), z = zByName(zp[0]);
      withDate(S.date, function(){ openZodiac(z, /^\d{4}-\d{2}-\d{2}$/.test(zp[1] || '') ? zp[1] : ''); });
      $('zHome').hidden = true; $('zResult').hidden = false; show('zodiac');
      var zh = $('zResult').querySelector('.flow-header');
      if (zh) zh.insertAdjacentHTML('afterend', sharedBarHTML(S, '')); else $('zResult').insertAdjacentHTML('afterbegin', sharedBarHTML(S, ''));
      bindSharedCta($('zResult'), 'today');
      S.view = 'zodiac'; sharedDock(S);
      return;
    }
    var box = $('sharedBody'), h = '', dt = S.date, md = (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일';
    withDate(S.date, function(){
      var ra = compute(A);
      if (S.type === 'd' || S.type === 'n'){
        var luck = todayLuck(A, ra), f = luck.f, P = f.pillars, elc = EL_CLASS[f.luckyEl], nums = luck.nums;
        h += sharedBarHTML(S, A.name);
        if (S.type === 'd'){
          $('sharedTtl').textContent = A.name + '님의 ' + md + ' 운세';
          h += '<div class="today-head"><div class="today-date">' + md + ' ' + WD[dt.getDay()] + '요일, ' + esc(A.name) + '님은</div><h1 class="today-title">' + f.head + '</h1>' +
            '<div class="today-ilj">' + P.year.hanja + '年 ' + P.month.hanja + '月 ' + P.day.hanja + '日 · ' + f.ten + '의 날</div></div>' +
            '<div class="today-fig" id="sharedFig">' + figSVG(ra.animal, f.auraEl) + '</div>' +
            '<div class="card score-card">' + scoreRowsHTML(f) + '<div class="divider"></div><p class="body-text">' + esc(A.name) + '님, ' + f.body + '</p></div>';
        } else {
          $('sharedTtl').textContent = A.name + '님의 행운 부적';
        }
        h += '<div class="card ' + elc + '"><div class="sec-head"><h2 class="sec-title">' + md + ' 행운 숫자</h2><span class="sec-meta">' + MS.EL_K[f.luckyEl] + ' 기운의 숫자</span></div>' +
          luckChips(nums.map(function(o){ return o.n; }), elc) +
          '<div class="tl-rows"><div class="tl-row"><span class="k">행운의 색</span><b>' + f.tip.color + '</b></div><div class="tl-row"><span class="k">행운의 방향</span><b>' + EL_TEXT[f.luckyEl].dir + '</b></div></div>' +
          '<p class="disclaimer">재미로 즐기는 운세 콘텐츠예요.</p></div>';
      } else if (S.type === 'c'){
        $('sharedTtl').textContent = A.name + '님의 ' + CATS[S.extra].name;
        h += sharedBarHTML(S, A.name) + '<div class="card cat-sheet"' + (CATS[S.extra].sk ? ' data-tier="' + tierOf(todayLuck(A, ra).f.scores[CATS[S.extra].sk]) + '"' : '') + '>' + catHTML(A, ra, S.extra) + '</div>';
      } else if (S.type === 'g'){
        var rb = compute(B), m = DAILY.match(A, ra, B, rb);
        $('sharedTtl').textContent = A.name + ' × ' + B.name + ' 궁합';
        h += sharedBarHTML(S, A.name) +
          '<div class="poster"><div class="poster-frame"><div class="poster-corner l">宮合<br>MATCH</div><div class="poster-corner r">' + ra.pillars.day.hanja + ' × ' + rb.pillars.day.hanja + '</div>' +
          '<div class="gh-figs">' + figSVG(ra.animal, MS.EL_KEY[ra.pillars.day.sEl]) + '<span class="link"></span>' + figSVG(rb.animal, MS.EL_KEY[rb.pillars.day.sEl]) + '</div>' +
          '<div class="gh-score"><div class="num">' + m.score + '<small>점</small></div><div class="gr">' + m.grade + '</div><p class="poster-sub" style="max-width:20em">' + esc(A.name) + '님과 ' + esc(B.name) + '님은 ' + m.summary + '</p></div></div></div>' +
          '<div class="card"><div class="sec-head"><h2 class="sec-title">궁합 요약</h2></div><div class="gh-badges">' +
          '<div class="gh-badge"><span class="chip">일간</span><p>' + m.stemTxt.t.replace(/A/g, esc(A.name)).replace(/B/g, esc(B.name)) + '</p></div>' +
          '<div class="gh-badge"><span class="chip">일지</span><p>' + m.dTxt + '</p></div></div></div>';
      }
    });
    h += adSlotHTML('공유받은 결과를 본 뒤');
    box.innerHTML = h;
    if ($('sharedFig')) drawOn($('sharedFig'));
    bindSharedCta(box, S.type === 'g' ? 'gunghap' : S.type === 'n' ? 'num' : 'today');
    show('shared', '');
    S.view = 'shared'; sharedDock(S);
  }
  $('btnSharedBack').onclick = function(){ leaveShared('today'); };

  srvInit();

  (function readShared(){
    var code = null;
    try { code = new URLSearchParams(location.search).get('r'); } catch(e){}
    var pm = /^\/s\/([A-Za-z0-9_-]+)\/?$/.exec(location.pathname);
    if (!code && pm) code = pm[1];
    var hs = (location.hash || '').replace('#', '');
    if (!code && hs.indexOf('r.') === 0) code = hs.slice(2);
    if (!code) return;
    var S = null; try { S = decodeShare(code); } catch(err){}
    if (!S){ try { history.replaceState(null, '', basePath()); } catch(err){} toast('링크가 잘렸거나 올바르지 않아요'); return; }
    SHARED = S;
    var intro = $('intro'); if (!intro.hidden) intro.hidden = true;
    store('unsu_intro', 1);
    if (NS) exitDemo(true);
    sharedLoading(S, function(){ openShared(S); });
  })();

  (function readInvite(){
    if (SHARED) return;
    var code = null;
    try { code = new URLSearchParams(location.search).get('i'); } catch(e){}
    var hs = (location.hash || '').replace('#', '');
    if (!code && hs.indexOf('i.') === 0) code = hs.slice(2);
    if (code){
      var e = null; try { e = decodeInvite(code); } catch(err){}
      if (e){ INVITE = e; store('unsu_invite', e); }
      try { history.replaceState(null, '', basePath()); } catch(err){}
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
  var hash = (INVITE || SHARED) ? '' : (location.hash || '').replace('#', '');
  if (hash === 'list'){ renderList(); show('list'); } else if (hash === 'saju') show('input'); else if (hash === 'zodiac') show('zodiac'); else if (hash === 'gunghap') go('gunghap'); else if (hash === 'num') go('num');
})();
