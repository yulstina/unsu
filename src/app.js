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
  var VIEWS = { today:$('v-today'), onboard:$('v-onboard'), my:$('v-my'), input:$('v-input'), result:$('v-result'), list:$('v-list'), zodiac:$('v-zodiac'), gunghap:$('v-gunghap'), fill:$('v-fill'), dream:$('v-dream'), shared:$('v-shared'), box:$('v-box'), ask:$('v-ask') };
  var TAB_OF = { today:'today', onboard:'', my:'', input:'saju', result:'saju', list:'saju', zodiac:'today', gunghap:'today', fill:'today', dream:'dream', shared:'', box:'box', ask:'ask' };   /* 2026-11-22: 부적은 홈의 하위 페이지, 하단에 우니에게 묻기 */
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
    var ti = ['today','saju','ask','dream','box'].indexOf(currentTab), lens = document.querySelector('.tab-lens');
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
    else if (view === 'fill' && me){ }
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
    else if (t === 'ask'){ renderAsk(); show('ask'); }
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
    h += '<div class="kv"><div class="' + EL_CLASS[r.yong] + '"><span class="k">용신 · 나를 살리는 기운</span><span class="v"><b>' + MS.EL_H[r.yong] + '</b>' + MS.EL_K[r.yong] + '</span><span class="s">' + EL_TEXT[r.yong].color + ' · ' + EL_TEXT[r.yong].dir + '</span></div>' +
      '<div class="' + EL_CLASS[r.hee] + '"><span class="k">희신 · 용신을 돕는 기운</span><span class="v"><b>' + MS.EL_H[r.hee] + '</b>' + MS.EL_K[r.hee] + '</span><span class="s">' + EL_TEXT[r.hee].color + ' · ' + EL_TEXT[r.hee].dir + '</span></div></div>';
    var manyEl = r.cnt.indexOf(maxC), minC = Math.min.apply(null, r.cnt), fewEl = r.cnt.indexOf(minC);
    h += '<p class="body-text"><strong>' + EL_TEXT[manyEl].name + ' ' + maxC + '개</strong> — ' + EL_TEXT[manyEl].many + '</p>';
    h += '<p class="body-text"><strong>' + EL_TEXT[fewEl].name + ' ' + minC + '개</strong> — ' + EL_TEXT[fewEl].few + ' 추천 활동: ' + EL_TEXT[r.yong].act + '.</p>';
    h += '</div>';

    h += adSlotHTML('원국과 오행을 본 뒤');
    var ezStart = h.length, ezOpen = owns('ez');
    h += zoneHTML('read', '풀이', '글자들이 말해 주는 것');
    h += bookCoverHTML(entry, true);
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
      h = h.slice(0, ezStart) + zoneHTML('read', '풀이 · 흐름', '쉬운 사주 풀이에서 이어져요') + bookCoverHTML(entry, false);
    }
    h += '<div class="card lt"><div class="sec-head"><h2 class="sec-title">주제별 풀이</h2></div>' + topicListHTML(entry, 'result') + '</div>';
    h += '<div class="card num-cta ' + EL_CLASS[lEl] + '"><div class="num-cta-q">오늘 ' + esc(entry.name) + '님의<br><em>작은 행동</em></div>' +
      '<p class="helper">오늘 ' + esc(entry.name) + '님에게 필요한 ' + MS.EL_K[lEl] + '(' + MS.EL_H[lEl] + ') 기운을 채우는 한 가지예요. 매일 바뀌어요.</p>' +
      '<p class="num-act">' + luck.act + '</p>' +
      '<button class="btn-soft btn-block" id="btnDraw">오늘의 행운 부적 열어 보기</button></div>';

    h += '<div class="row"><button class="btn-ghost grow" id="btnCopyRes">결과 복사</button><button class="btn-soft grow" id="btnShareRes">공유하기</button></div>';
    h += adSlotHTML('사주 풀이를 다 읽은 뒤');
    h += '<p class="disclaimer">전통 명리 이론을 바탕으로 계산한 참고용 풀이예요. 절기가 바뀌는 시각 전후 10분 이내에 태어났다면 월주가 달라질 수 있어요.</p>';

    $('resultBody').innerHTML = h;
    show('result', asTab ? 'saju' : prevView === 'today' ? 'today' : prevView === 'gunghap' ? 'gunghap' : 'saju');
    drawOn($('posterFig'));
    if ($('btnBook')) $('btnBook').onclick = function(){ openStory(entry, r, 0); };
    var du = $('duScroll') && $('duScroll').querySelector('.now');
    if (du) $('duScroll').scrollLeft = du.offsetLeft - 60;
    if (!reduceMotion && window.gsap) gsap.from('#resultBody .el-bar .fill', { scaleX:0, duration:.9, ease:'power2.out', stagger:.06, delay:.2 });

    bindTopics(entry, r, $('resultBody'));
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
    g.fillStyle = '#fff'; g.font = '700 62px ' + F; g.fillText(entry.name + '님', 540, 594);
    g.fillStyle = '#c9d4ff'; g.font = '400 32px ' + F; g.fillText(P.year.name + '년생 ' + r.color + ' ' + r.animal + '띠 · ' + P.day.name + '(' + P.day.hanja + ')일주', 540, 644);
    /* 결과 한 줄: 일간 이미지 + 키워드 (공유 이미지만 봐도 무슨 사람인지 알게) */
    var IG = ILGAN[P.day.stem];
    rr(110, 676, 860, 96, 48); g.fillStyle = 'rgba(246,205,91,.10)'; g.fill(); g.strokeStyle = 'rgba(246,205,91,.45)'; g.lineWidth = 2; g.stroke();
    var one = '“' + IG.img + ' 같은 사람”', ofs = 38;
    g.font = '700 ' + ofs + 'px ' + F; while (ofs > 28 && g.measureText(one).width > 800){ ofs--; g.font = '700 ' + ofs + 'px ' + F; }
    g.fillStyle = '#f6cd5b'; g.fillText(one, 540, 722);
    g.fillStyle = '#e9dfb6'; g.font = '500 25px ' + F; g.fillText(IG.kw.slice(0, 3).join(' · '), 540, 756);
    /* 사주 네 기둥 */
    var keys = ['hour','day','month','year'], lab = {hour:'시주',day:'일주',month:'월주',year:'년주'};
    keys.forEach(function(k, i){
      var x = 120 + i*205, y = 796, p = P[k];
      rr(x, y, 185, 226, 26); g.fillStyle = k === 'day' ? 'rgba(124,86,246,.38)' : 'rgba(255,255,255,.07)'; g.fill();
      g.strokeStyle = k === 'day' ? 'rgba(190,170,255,.8)' : 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#9fb0e8'; g.font = '500 26px ' + F; g.fillText(lab[k], x+92, y+40);
      if (!p){ g.fillStyle = 'rgba(255,255,255,.4)'; g.font = '400 30px ' + F; g.fillText('모름', x+92, y+136); return; }
      g.font = '700 74px ' + H; g.fillStyle = EL_HEX[p.sEl]; g.fillText(p.sh, x+92, y+124);
      g.fillStyle = EL_HEX[p.bEl]; g.fillText(p.bh, x+92, y+205);
    });
    /* 오행 막대 */
    var mx = Math.max.apply(null, r.cnt.concat([1]));
    for (var e = 0; e < 5; e++){
      var y2 = 1066 + e*38;
      g.textAlign = 'left'; g.fillStyle = '#dfe6ff'; g.font = '500 28px ' + F; g.fillText(MS.EL_H[e] + ' ' + MS.EL_K[e], 130, y2+10);
      rr(270, y2-10, 560, 22, 11); g.fillStyle = 'rgba(255,255,255,.1)'; g.fill();
      if (r.cnt[e]){ rr(270, y2-10, Math.max(22, 560*r.cnt[e]/mx), 22, 11); g.fillStyle = EL_HEX[e]; g.fill(); }
      g.fillStyle = '#fff'; g.fillText(String(r.cnt[e]), 860, y2+10);
    }
    g.textAlign = 'center'; g.fillStyle = '#c9d4ff'; g.font = '500 30px ' + F;
    g.fillText('일간 ' + P.day.sh + ' · ' + ILGAN[P.day.stem].t + '  |  용신 ' + MS.EL_H[r.yong] + MS.EL_K[r.yong], 540, 1280);
    g.fillStyle = 'rgba(255,255,255,.5)'; g.font = '400 26px ' + F; g.fillText(shortUrl(linkFor('')), 540, 1322);
    /* 동물 일러스트 */
    var svg = figSVG(r.animal, ANIMAL_EL[r.animal]).replace('<svg ', '<svg width="460" height="460" ');
    var im = new Image();
    im.onload = function(){ g.drawImage(im, 310, 112, 460, 460); done(c); };
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
          navigator.share({ files:[file] }).catch(function(){});   /* 이미지만: 글을 같이 넣으면 카톡에 노란 말풍선이 따로 붙는다 */
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
      '오늘의 작은 행동: ' + todayLuck(e, r).act;
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
    var zAct = SMALL_ACT[ZEL[z.el]][seedHash(seed + '|act') % 6];
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
      '<button class="btn-primary btn-block" id="btnZDraw">오늘의 작은 행동 보기</button>' +
      '<div id="zNums" hidden class="view" style="gap:14px"><p class="num-act">' + zAct + '</p>' +
      '<div class="row"><button class="btn-ghost grow" id="btnZCopy">결과 복사</button><button class="btn-soft grow" id="btnZShare">공유하기</button></div>' +
      '<p class="disclaimer">재미로 즐기는 운세 콘텐츠예요.</p></div></div>';
    h += adSlotHTML('별자리 운세를 본 뒤');
    $('zResult').innerHTML = h;
    $('zHome').hidden = true; $('zResult').hidden = false; window.scrollTo(0, 0);
    drawOn($('zFig'));
    $('btnZBack').onclick = function(){ $('zResult').hidden = true; $('zHome').hidden = false; };
    $('btnZDraw').onclick = function(){ $('zNums').hidden = false; this.hidden = true; };
    var txt = '우니조아 — ' + z.name + '(' + z.en + ') ' + todayStr() + '\n오늘의 작은 행동: ' + zAct;
    $('btnZCopy').onclick = function(){ copyText(txt, '결과를 복사했어요'); };
    $('btnZShare').onclick = function(){
      openShare({ sheetTitle:'별자리 운세 공유', title:'오늘의 ' + z.name + ' (' + z.en + ')', desc:'오늘의 작은 행동 · ' + zAct,
        fig:figSVG(z.name, z.el, 'mini'),
        text:'[우니조아] 오늘의 ' + z.name + '(' + z.en + ') 운세\n오늘의 작은 행동 · ' + zAct,
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
  /* 2026-11-22 소율: 부적 숫자(11-23부터 4개) · 꿈 처방 숫자 2개 다시 넣기. PG 심사 중 숨겨야 하면 서버 LUCKY_NUMS=0 */
  function showNums(){ return !(SRV.cfg && SRV.cfg.nums === false); }
  function todayLuck(entry, r){
    var f = DAILY.today(entry, r, nowD());
    var nums = drawYongNumbers(entryISO(entry, r) + '|' + entryTKey(r) + '|' + todayStr() + '|luck', f.luckyEl, 4);
    var acts = SMALL_ACT[f.luckyEl], act = acts[seedHash(entryISO(entry, r) + '|' + todayStr() + '|act') % acts.length];
    return { f:f, el:f.luckyEl, nums:nums, act:act };
  }
  /* 오늘의 작은 행동 (2026-11-21 GPT 검토 P0: 숫자 추천 대신). 오행마다 바로 해 볼 수 있는 짧은 행동 */
  var SMALL_ACT = [
    ['창문 열고 환기하기', '10분 걷기', '새 계획 한 줄 적기', '화분에 물 주기', '먼저 인사 건네기', '책 한 쪽 읽기'],
    ['햇볕 10분 쬐기', '고마운 사람에게 한 줄 보내기', '칭찬 한 번 하기', '계단으로 한 층 걷기', '좋아하는 옷 입기', '사진 한 장 남기기'],
    ['책상 한 칸 정리하기', '끼니 제때 챙기기', '오늘 쓴 돈 적어 보기', '약속 한 번 더 확인하기', '따뜻한 차 마시기', '미뤄 둔 일 하나 끝내기'],
    ['할 일 세 줄로 줄이기', '필요 없는 것 하나 버리기', '답장 하나 마무리하기', '5분 조용히 앉아 있기', '신발 정리하기', '결정 기준 먼저 적기'],
    ['물 한 잔 천천히 마시기', '생각을 종이에 적기', '30분 일찍 잠들기', '좋아하는 노래 듣기', '샤워하며 쉬어 가기', '안 풀리는 일은 다른 길로']
  ];
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
  var COST = { cat:100, dream:200, gh:100, ez:100, tk:500, tj:100, cal:100, lv:200, chat:100, wl:100, sal:100, gw:100 };   /* 서버 가격표 api/_lib/shop.js PRICES 와 같이 바꾼다 */
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
  var WON = { cat:990, dream:1900, gh:990, ez:990, tk:4900, tj:990, cal:990, lv:1900, chat:990, wl:990, sal:990, gw:990 };
  function wonOf(k){ var w = SRV.cfg && SRV.cfg.won; return (w && w[k]) || WON[k] || 0; }
  function coinSale(){ return !!(SRV.cfg && SRV.cfg.packs); }
  /* 원화로 실제 파는 상품(서버 shop.js WON_SALE). 첫 판매 3종: 사주 이야기책·궁합 상세·중요한 날 잡기. 나머지는 미리보기 + 무료 엽전 */
  var WON_SALE = ['ez', 'gh', 'tk', 'chat'];
  function wonSale(k){ var s = SRV.cfg && SRV.cfg.wonSale; return (s || WON_SALE).indexOf(k) > -1 && !!wonOf(k); }
  function passSale(){ return !!(SRV.cfg && SRV.cfg.passes); }   /* 우니 패스 판매(서버 PASS_SALE=1)일 때만 보인다 */
  /* 잠금 버튼 가격 표시: 원화 판매 상품은 원화, 아니면 엽전 (GPT 검토 P0: 첫 잠금에 원화를 보여 준다) */
  function priceTag(k){ return wonSale(k) ? wonOf(k).toLocaleString() + '원' : COST[k] + '닢'; }   /* 서버 COIN_SALE=1 일 때만 엽전 충전 패키지를 보인다 */
  /* 잠금 화면 버튼: 엽전이 모자랄 때 '990원 바로 열기' */
  function buyLabel(k){ return wonOf(k).toLocaleString() + '원 결제하기'; }
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
      SRV.passUntil = +u.passUntil || 0; SRV.owner = !!u.owner;
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
  function boxSig(b){ return b.d + '|' + (b.who || '') + '|' + (b.nums || []).join(',') + (b.act || ''); }
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
      else if (rs.k === 'chat' && e) open(function(){ store('unsu_chat_unl', todayStr()); openChat(e, compute(e), rs.topic); });
      else if (rs.k === 'pay' && product(rs.pid)) open(function(){ if (!owns(rs.pid) || rs.pid === 'gh') addOrder(rs.pid, { ghKey:rs.ghKey || null }); toast(product(rs.pid).name + ' 열렸어요 · 다시 누르면 바로 보여요'); });
      else toast('결제한 콘텐츠는 다시 누르면 바로 열려요');
    } catch(err){}
  }
  /* 엽전이 모자랄 때: 그 콘텐츠 하나만 원화로 바로 결제 (엽전 충전은 팔지 않는다 — 2026-11-21)
     o: { cost, why, item, rs } — item 은 서버 구매 기록 키, rs 는 결제 뒤 다시 열 곳 */
  function openBuySheet(o){
    if (isGuest()){ openLoginSheet('로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요.'); return; }
    var k = o.item.split(':')[0], w = wonOf(k), coins = getCoins(), ready = payReady();
    if (!wonSale(k)){ openCoinSheet('엽전이 ' + Math.max(1, o.cost - coins).toLocaleString() + '닢 더 필요해요. 이 콘텐츠는 지금 무료 적립 엽전으로만 열 수 있어요.'); return; }
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
    var pc = SRV.cfg && SRV.cfg.pay;
    /* 카카오페이 채널이 있으면 주문서(결제 수단 고르기) 화면을 먼저 연다 — 2026-11-23 소율: '결제하기 버튼이 뭔지 모르겠다' */
    if (pc && pc.provider === 'portone' && pc.kakaoChannelKey && !k.method){ openCheckout(k); return; }
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
        var kp = k.method === 'kakao' && c.kakaoChannelKey;
        return window.PortOne.requestPayment({ storeId:c.storeId, channelKey:kp ? c.kakaoChannelKey : c.channelKey, paymentId:o.orderId, orderName:o.orderName,
          totalAmount:o.amount, currency:'CURRENCY_KRW', payMethod:kp ? 'EASY_PAY' : 'CARD', redirectUrl:location.origin + '/pay/success' }).then(function(r){
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
  /* 주문서: 상품·금액 → 결제 수단(라디오 목록) → 'N원 결제하기' 하나. 다른 쇼핑·콘텐츠 앱의 결제 화면 구조.
     카드는 한국결제네트웍스(KPN) 결제창, 카카오페이는 카카오페이 결제창으로 넘어간다. 마지막에 고른 수단을 기억한다 */
  function checkoutInfo(k){
    if (k.item){ var c = k.item.split(':')[0]; return { name:(SRV.cfg && SRV.cfg.wonNames && SRV.cfg.wonNames[c]) || (k.rs && k.rs.why) || '콘텐츠', won:wonOf(c), sub:'결제 즉시 열리는 디지털 콘텐츠' }; }
    if (k.id === PASS.id) return { name:PASS.name, won:PASS.p, sub:PASS.days + '일 동안 모든 풀이 · 자동 결제 없음' };
    return { name:'엽전 ' + ((k.n || 0) + (k.b || 0)).toLocaleString() + '닢', won:k.p || 0, sub:'엽전 충전' };
  }
  function openCheckout(k){
    var info = checkoutInfo(k), last = store('unsu_pm') === 'kakao' ? 'kakao' : 'card', test = SRV.cfg.pay.test;
    var pm = function(v, icon, t, s){ return '<label class="co-pm' + (v === last ? ' on' : '') + '"><input type="radio" name="copm" value="' + v + '"' + (v === last ? ' checked' : '') + '><span class="co-ic ' + v + '">' + icon + '</span><span class="co-tx"><b>' + t + '</b><small>' + s + '</small></span><i class="co-dot" aria-hidden="true"></i></label>'; };
    openSheet('<div class="co"><h3 id="sheetTitle">결제하기</h3>' +
      '<div class="co-order"><small>주문 상품</small><div><b>' + esc(info.name) + '</b><span>' + info.won.toLocaleString() + '원</span></div><p>' + info.sub + '</p></div>' +
      '<div class="co-h">결제 수단</div><div class="co-pms" role="radiogroup" aria-label="결제 수단">' +
      pm('card', '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/></svg>', '신용·체크카드', '한국결제네트웍스(KPN) 결제창 · 모든 카드사') +
      pm('kakao', '<b>pay</b>', '카카오페이', '카카오톡에서 비밀번호로 간편하게') + '</div>' +
      '<div class="co-sum"><span>최종 결제 금액</span><b>' + info.won.toLocaleString() + '원</b></div>' +
      (test ? '<p class="co-test"><b class="pay-test">테스트 결제</b> 실제로 돈이 나가지 않아요</p>' : '') +
      '<button class="btn-primary btn-block co-go" id="coGo">' + info.won.toLocaleString() + '원 결제하기</button>' +
      '<p class="helper co-note">주문 내용을 확인했고 결제에 동의해요. 결제 즉시 열리는 디지털 콘텐츠라 열린 뒤에는 <button class="link-btn" data-doc="refund">환불</button>이 제한돼요.<br>판매: 실로(SYLO) · 결제 대행: ' + '<span class="co-pg" id="coPg"></span></p>' +
      '<button class="text-btn" data-close>취소</button></div>');
    var body = $('sheetBody');
    var sync = function(){ var v = (body.querySelector('[name=copm]:checked') || {}).value || 'card'; body.querySelectorAll('.co-pm').forEach(function(l){ l.classList.toggle('on', l.querySelector('input').checked); }); $('coPg').textContent = v === 'kakao' ? '카카오페이' : '한국결제네트웍스(KPN)'; $('coGo').classList.toggle('kp', v === 'kakao'); return v; };
    body.querySelectorAll('[name=copm]').forEach(function(x){ x.onchange = sync; });
    sync();
    $('coGo').onclick = function(){ var v = sync(); store('unsu_pm', v); startCharge(Object.assign({}, k, { method:v }), this); };
  }
  function srvInit(){
    var q = {}; try { new URLSearchParams(location.search).forEach(function(v, k){ q[k] = v; }); } catch(e){}
    var back = null, rs = null; try { back = sessionStorage.getItem('wj_back'); sessionStorage.removeItem('wj_back'); } catch(e){}
    if (back && back.charAt(0) === '{'){ try { rs = JSON.parse(back); back = rs.tab || 'today'; } catch(e){ back = null; } }
    if (q.login || q.pay || q.owner){ try { history.replaceState(null, '', location.pathname + location.hash); } catch(e){} }
    if (NS || !/^https?:$/.test(location.protocol)) return;
    api('/api/me' + (q.owner ? '?owner=' + encodeURIComponent(q.owner) : '')).then(function(r){
      if (!r.cfg || !r.cfg.on) return;
      if (q.owner) setTimeout(function(){ toast(r.user && r.user.owner ? '운영자 계정이에요 · 모든 풀이가 결제 없이 열려요' : q.owner === 'off' ? '운영자 모드를 껐어요' : r.user ? '운영자 열쇠가 맞지 않아요' : '로그인한 뒤 다시 열어 주세요'); }, 600);
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
      if (r.err === 'short'){ if (rs && wonSale(item.split(':')[0])) openBuySheet({ cost:cost, why:why, item:item, rs:rs }); else openCoinSheet('엽전이 ' + Math.max(1, cost - getCoins()).toLocaleString() + '닢 더 필요해요.'); }
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
  var HSCROLL = '.hp-car,.tk-months,.ak-recs,.ak-qr,.ft-tabs,.ge-chips,.scroller';
  /* 시트를 손가락으로 아래로 끌어내려 닫기 (맨 위에서 아래로 당기거나, 손잡이 영역을 끌면 동작) */
  (function(){
    var sh = $('sheet'), bd = $('sheetBackdrop'), y0 = 0, x0 = 0, t0 = 0, dy = 0, drag = false, armed = false, lastY = 0, lastT = 0, vel = 0;
    function setY(v){ sh.style.transform = v ? 'translateY(' + v + 'px)' : ''; bd.style.opacity = v ? String(Math.max(0.15, 1 - v / 420)) : ''; }
    sh.addEventListener('touchstart', function(e){
      if (e.touches.length !== 1 || $('sheetWrap').hidden) return;
      var t = e.touches[0], r = sh.getBoundingClientRect();
      var onGrip = t.clientY - r.top < 56, inField = e.target.closest && e.target.closest('input,textarea,select,[contenteditable]');
      var inRow = e.target.closest && e.target.closest(HSCROLL);
      armed = !inField && !inRow && (onGrip || sh.scrollTop <= 0); drag = false; dy = 0; vel = 0;
      y0 = lastY = t.clientY; x0 = t.clientX; t0 = lastT = Date.now();
    }, { passive:true });
    sh.addEventListener('touchmove', function(e){
      if (!armed) return;
      var y = e.touches[0].clientY, d = y - y0;
      if (!drag && Math.abs(e.touches[0].clientX - x0) > Math.abs(d)){ armed = false; return; }   /* 옆으로 미는 건 시트 닫기가 아님 */
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
  /* 가로 카드·칩 줄: PC에서도 마우스로 끌어서 넘기기 (터치는 브라우저 기본 스크롤) */
  (function(){
    var st = null, moved = false;
    document.addEventListener('pointerdown', function(e){
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      var row = e.target.closest && e.target.closest(HSCROLL);
      if (!row || row.scrollWidth <= row.clientWidth + 2) return;
      st = { row:row, x:e.clientX, left:row.scrollLeft, id:e.pointerId }; moved = false;
    });
    document.addEventListener('pointermove', function(e){
      if (!st || e.pointerId !== st.id) return;
      var dx = e.clientX - st.x;
      if (!moved){
        if (Math.abs(dx) < 6) return;
        moved = true; st.row.classList.add('hs-drag');
        try { st.row.setPointerCapture(e.pointerId); } catch(_){}
      }
      st.row.scrollLeft = st.left - dx;
      e.preventDefault();
    });
    function up(){
      if (!st) return;
      var row = st.row; st = null;
      if (moved){
        row.classList.remove('hs-drag');   /* 스냅 다시 켜면 가까운 카드에 붙는다 */
        setTimeout(function(){ moved = false; }, 0);
      }
    }
    document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
    /* 끌고 난 직후의 클릭은 무시 (카드가 열리지 않게) */
    document.addEventListener('click', function(e){ if (moved){ e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    document.addEventListener('dragstart', function(e){ if (e.target.closest && e.target.closest(HSCROLL)) e.preventDefault(); });
  })();
  $('sheetBackdrop').onclick = closeSheet;
  $('sheet').addEventListener('click', function(e){ if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('[data-pass]')) openCoinSheet(); });
  /* 잠금 화면마다 한 줄: 엽전 대신 우니 패스로 전부 열기 */
  function passLinkHTML(){ return passActive() || isGuest() || NS || !passSale() ? '' : '<button type="button" class="pass-link" data-pass>광고 없이 전부 열기 · ' + PASS.name + ' ' + PASS.p.toLocaleString() + '원 ›</button>'; }
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
    if (!passActive() && !passSale()) return '';
    if (SRV.owner) return '<div class="pass-card on"><div class="pc-top"><span class="pc-badge">운영자</span><b>운영자 계정</b></div><p class="pc-sub">모든 풀이를 결제 없이 열어 볼 수 있어요.</p></div>';
    if (passActive()) return '<div class="pass-card on"><div class="pc-top"><span class="pc-badge">이용 중</span><b>' + PASS.name + '</b></div>' +
      '<p class="pc-sub">' + passEndStr() + '까지 엽전 없이 전부 열고, 광고 없이 봐요.</p></div>';
    var full = COST.cat * 4 + COST.dream + COST.gh + COST.ez + COST.tk;
    return '<div class="pass-card"><div class="pc-top"><span class="pc-badge">광고 없이 전체</span><b>' + PASS.name + '</b><span class="pc-price">' + PASS.p.toLocaleString() + '원</span></div>' +
      '<ul class="pc-list"><li>분야별 운세·궁합 상세·쉬운 풀이·중요한 날 잡기를 엽전 없이</li><li>꿈 풀이 리포트 하루 ' + PASS.dream + '번</li><li>신년운세 전체와 결과 화면, 광고 없이</li></ul>' +
      '<p class="pc-sub">' + (coinSale() ? '한 번씩 다 열면 ' + full.toLocaleString() + '닢(약 ' + (Math.round(full * 9 / 100) * 100).toLocaleString() + '원)이에요. ' : '하나씩 결제하면 분야별 운세 ' + wonOf('cat').toLocaleString() + '원, 중요한 날 잡기 ' + wonOf('tk').toLocaleString() + '원이에요. ') + '자동 결제 없이 ' + PASS.days + '일만 써요.</p>' +
      '<button class="btn-primary btn-block" id="csPass"' + (payReady() || NS ? '' : ' disabled') + '>' + (payReady() ? PASS.p.toLocaleString() + '원 결제하고 바로 쓰기' : NS ? '예시 모드에서는 결제할 수 없어요' : '결제 준비 중') + '</button></div>';
  }
  function openCoinSheet(reason){
    var guestC = isGuest();   /* 2026-11-22 소율: 로그인 안 해도 엽전 안내와 가격표는 보이게. 모으기·쓰기만 로그인 */
    var log = store('unsu_coinlog'); if (!Array.isArray(log)) log = [];
    var a = getAtt(), doneToday = !!a.days[todayStr()], left = 7 - (streakOf(a) % 7), used = adCount();
    var won = function(n){ return n.toLocaleString() + '원'; };
    var sale = coinSale(), split = coinSplit();
    /* 2026-11-23 소율: 가격표를 누르면 바로 그 콘텐츠의 결제(상품 상세) 화면으로 — 다른 앱처럼 '가격 → 상세 → 결제' */
    var useRow = function(cls, name, k, small){ return '<button type="button" data-use="' + k + '"' + (cls ? ' class="' + cls + '"' : '') + '><span>' + name + '</span><b>' + COST[k] + '닢</b><small>' + small + (wonSale(k) && !sale ? ' · 또는 ' + wonOf(k).toLocaleString() + '원' : '') + '</small><i class="cs-go" aria-hidden="true">열기 ›</i></button>'; };
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
      useRow('', '사주 이야기책 2~6장', 'ez', '저장한 사람 모두') + useRow('', '2027 토정비결', 'tj', '한 사람 · 계속 보기') +
      useRow('', '월별 운세 달력', 'cal', '12개월 · 달마다 흐름') + useRow('', '연애·결혼 시기', 'lv', '한 사람 · 계속 보기') +
      useRow('', '내 재물 그릇', 'wl', '한 사람 · 계속 보기') + useRow('', '나에게 든 살 풀이', 'sal', '한 사람 · 계속 보기') + useRow('', '나를 돕는 귀인 풀이', 'gw', '한 사람 · 계속 보기') +
      useRow('', '우니에게 묻기 하루 무제한', 'chat', '오늘 자정까지 · 하루 1번은 무료') + '</div>' +
      (guestC ? '<div class="cs-guest"><p>엽전은 로그인한 계정에 쌓여요. 처음 로그인하면 <b>' + SIGNUP_COINS.toLocaleString() + '닢</b>을 바로 드려요.</p><button class="btn-primary btn-block" id="csLogin">로그인하고 ' + SIGNUP_COINS.toLocaleString() + '닢 받기</button></div>' : '') +
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
    if ($('csLogin')) $('csLogin').onclick = function(){ openLoginSheet('처음 로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요.', { k:'coin' }); };
    if ($('csPass')) $('csPass').onclick = function(){ if (NS){ toast('예시 모드에서는 결제할 수 없어요'); return; } if (!payReady()) return; startCharge({ id:PASS.id }, this); };
    $('sheetBody').querySelectorAll('[data-use]').forEach(function(b){ b.onclick = function(){
      var k = b.dataset.use, me = getMe();
      if (!me){ closeSheet(); startOnboarding('new'); return; }
      var r = compute(me); if (r.error) return;
      var A = topicActs(me, r), fn = { dream:A.dream, cat:function(){ openTopics(me, r); }, tk:A.tk, gh:A.gh, ez:A.book, tj:A.tj, cal:A.fc, lv:A.lv, wl:A.wl, sal:A.sal, gw:A.gw, chat:function(){ chatBuy(me, r, askTopic); } }[k];
      if (!fn) return;
      if (k !== 'chat' && k !== 'cat') closeSheet();
      fn();
    }; });
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
      { id:'dpGh', tone:'rose', badge:'', title:'궁합 상세 리포트', sub:'둘의 성향 차이와 잘 맞는 대화법까지', price:priceTag('gh'), cta:'리포트 열기', art:'gh' },
      { id:'dpEz', tone:'mint', badge:'', title:'쉬운 사주 풀이', sub:'어려운 한자 없이, 내 사주를 이야기처럼', price:priceTag('ez'), cta:'풀이 보기', art:'book' }
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
    { t:'2027 행운의 색 · 방향 · 습관', pv:'한 해의 행운의 색, 방향, 습관을 한눈에' }
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
      '<div class="nf-sec"><h4>7장 · 2027 행운 처방</h4><div class="nf-lucky"><span><small>행운의 색</small>' + L.color + '</span><span><small>행운의 방향</small>' + L.dir + '</span><span><small>한 해의 습관</small>' + SMALL_ACT[e][0] + '</span></div>' +
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
     · 엽전 COST.dream: AI 정밀 풀이 + 길몽·흉몽 판정 + 오늘의 처방(조심할 것 · 좋은 방향 · 색 · 해볼 일) (무료 결과에서 바로 이어서 받을 수도 있음)
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
        '<div class="dm-offer"><div class="dmo-fig">' + uniImg('u-thinking') + '</div><div><b>이 꿈으로 오늘의 처방 받기</b><ul><li>AI가 꿈 장면을 하나하나 읽어요</li><li><em>길몽·흉몽 판정</em>과 오늘 조심할 것</li><li>좋은 방향, 색, 오늘 해볼 일까지 한 장으로</li></ul></div></div>' +
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
  /* 오늘의 처방: 길흉 판정 · 오늘 조심할 것 · 좋은 방향 · 좋은 색 · 오늘 해볼 일.
     내 사주가 있으면 오늘 나에게 필요한 오행으로, 없으면 꿈의 성격(분류)에 맞는 오행으로 정한다 */
  function dreamRx(d){
    var X = DREAM.RX[d.cat] || DREAM.RX.x, me = getMe(), el = X.el, mine = false;
    if (me){ var r = compute(me); if (!r.error){ el = todayLuck(me, r).el; mine = true; } }
    var E = EL_TEXT[el];
    var acts = SMALL_ACT[el];
    return { X:X, el:el, mine:mine, color:E.color, dir:E.dir, caution:d.caution || X.c,
      act:acts[seedHash(String(d.id || d.at || '') + '|rx') % acts.length],
      nums:dreamNums(d) };
  }
  /* 2026-11-23 소율: 꿈 숫자는 꿈속 상징 하나마다 하나씩(상징이 하나면 숫자 하나), 최대 3개(4개 이상은 안 씀).
     상징 낱말 + 꿈 id 로 씨앗을 만들어 1~50 에서 고른다 — 같은 꿈은 다시 열어도 같은 숫자 */
  function dreamNums(d){
    var base = String(d.id || d.at || ''), syms = (d.symbols || []).slice(0, 3), out = [], used = {};
    if (!syms.length) syms = [{ word:d.catName || '꿈' }];
    syms.forEach(function(sy){
      var n = 1 + Math.floor(mulberry32(seedHash(base + '|dn|' + sy.word))() * 50), g = 0;
      while (used[n] && g++ < 60) n = n % 50 + 1;
      used[n] = 1; out.push({ n:n, w:sy.word });
    });
    return out;
  }
  function rxCardHTML(d){
    var q = dreamRx(d);
    return '<div class="card talisman dm-rx ' + EL_CLASS[q.el] + '"><div class="tl-k">오늘의 처방' + (q.mine ? ' · 내 사주 기운 반영' : '') + '</div>' +
      '<h2 class="tl-head">' + esc(q.X.v) + '</h2>' +
      '<div class="tl-rows">' +
        '<div class="tl-row tl-wide"><span class="k">오늘 조심할 것</span><b>' + esc(q.caution) + '</b></div>' +
        '<div class="tl-row"><span class="k">좋은 방향</span><b>' + q.dir + '</b></div>' +
        '<div class="tl-row"><span class="k">좋은 색</span><b>' + q.color + '</b></div>' +
        '<div class="tl-row tl-wide"><span class="k">오늘 해볼 일</span><b>' + q.act + '</b></div>' +
        (showNums() ? '<div class="tl-row tl-wide tl-nums"><span class="k">좋은 숫자</span><b class="tl-numtxt">' + q.nums.map(function(o){ return o.n + '<small class="dm-nw"> ' + esc(o.w) + '</small>'; }).join(' · ') + '</b></div>' : '') +
      '</div>' +
      (q.mine ? '' : '<p class="helper">내 사주를 등록하면 방향, 색, 해볼 일이 나에게 필요한 기운으로 바뀌어요.</p>') + '</div>';
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
          '<div class="dmu-lock" aria-hidden="true"><span>길몽 · 흉몽 판정</span><span>오늘 조심할 것</span><span>좋은 방향</span><span>좋은 색</span><span>오늘 해볼 일</span></div>' +
          '<ul class="dmu-list"><li>AI가 꿈 장면을 다시 읽고 더 자세히 풀어요</li><li>길몽·흉몽 판정과 오늘 조심할 것</li><li>좋은 방향, 색, 오늘 해볼 일을 한 장으로</li></ul>' +
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
  var TILE_POSE = { tk:'u-calendar', dream:'u-sleep', zodiac:'u-zodiac', book:'u-book', ny:'u-newyear', gh:'uj-hands', coin:'u-money', dreamnum:'u-sleep' };
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
      if (k === 'zodiac'){ if ($('btnTodayZ')) $('btnTodayZ').click(); return; }
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
    var drawn = todoDone('drawn');
    /* 2026-11-23 헬로우봇 분석 반영(소율 확정): 오늘 카드 → 아이콘 메뉴 2×5 → 2027 캐러셀 → 맞춤 추천 → 깊이 보는 풀이 → 가볍게 해보기 → 우니와 매일 */
    var low = [['w','money'],['l','love'],['j','career']].sort(function(a, b){ return f.scores[a[0]] - f.scores[b[0]]; })[0];
    h += '<section class="home-hero ' + elc + '"><div class="hh-txt"><div class="hh-date">' + (now.getMonth()+1) + '월 ' + now.getDate() + '일 ' + WD[now.getDay()] + '요일 · ' + P.day.hanja + '日 ' + f.ten + '의 날</div>' +
      '<h1 class="hh-title">' + f.head + '</h1></div>' +
      '<span class="hh-uni" aria-hidden="true">' + uniImg(drawn ? 'u-gift' : 'u-pouch') + '</span>' +
      '<div class="hh-acts"><button class="btn-primary hh-cta' + (drawn ? '' : ' sheen') + '" id="btnGoNum">' + (drawn ? '오늘 부적 다시 보기' : '오늘 부적 열기') + '</button><button type="button" class="hh-share" id="btnTodayShare">' + SH_IC.send + '공유</button></div></section>';
    h += '<section class="home-sec ft-sec"><div class="hs-head"><h2 class="sec-title">' + esc(me.name) + '님의 운세</h2></div><div class="ft-box" id="ftBox">' + ftHTML(me, r) + '</div></section>';
    h += homeGridHTML();
    h += '<section class="home-sec"><div class="hs-head"><h2 class="sec-title">' + TJ_YEAR + ' 정미년, 미리 열어 봐요</h2></div><div class="hp-car" role="list">' +
      ['tj', 'sal', 'fc', 'ny'].map(function(k){ return homeCardHTML(k, 'car'); }).join('') + '</div></section>';
    var REC = { w:['wl', '재물', '내 재물 그릇은 얼마나 클까?', '평생 돈 흐름 · 크게 들어오는 시기 3번'], l:['lv', '연애', '인연은 언제 가까워질까?', '10년 연애·결혼 그래프 · ' + TJ_YEAR + '년 인연 달'], j:['job', '일', '나에게 꼭 맞는 일은 뭘까?', '타고난 재능과 잘 맞는 분야'] }[low[0]];
    h += '<section class="home-sec"><div class="hs-head"><h2 class="sec-title">' + esc(me.name) + '님께 지금 필요한 풀이</h2></div>' +
      '<button type="button" class="hp-pick" data-hp="' + REC[0] + '">' + uniImg(HOME_P[REC[0]].pose, 'hpk-uni') + '<span class="hpk-t"><small>오늘 ' + REC[1] + ' ' + f.scores[low[0]] + '점 · ' + (f.scores[low[0]] < 60 ? '조금 약한 날' : '오늘 가장 낮은 분야') + '</small><b>' + REC[2] + '</b><em>' + REC[3] + '</em></span><span class="chev" aria-hidden="true">›</span></button></section>';
    h += '<section class="home-sec"><div class="hs-head"><h2 class="sec-title">깊이 보는 풀이</h2><button type="button" class="hs-link" id="hmTopics">전체 ›</button></div><div class="hp-list">' +
      ['book', 'gh', 'gw', 'tk', 'lv'].map(function(k){ return homeCardHTML(k, 'row'); }).join('') + '</div></section>';
    h += adSlotHTML('오늘의 운세를 본 뒤');
    var z = getZodiac(r.solar.m, r.solar.d);
    h += '<section class="home-sec"><div class="hs-head"><h2 class="sec-title">가볍게 해보기</h2><span class="hs-meta">모두 무료</span></div><div class="hp-free">' +
      '<button type="button" id="btnTodayZ"><span><b>' + z.glyph + ' ' + z.name + '</b><small>오늘의 별자리 운세</small></span>' + uniImg('u-zodiac') + '</button>' +
      '<button type="button" id="hmDream"><span><b>꿈해몽</b><small>길몽일까? 오늘의 처방</small></span>' + uniImg('u-sleep') + '</button>' +
      '<button type="button" id="hmAsk"><span><b>우니에게 묻기</b><small>고민 하나 · 하루 1번</small></span>' + uniImg('u-thinking') + '</button>' +
      '<button type="button" id="dpNY"><span><b>' + TJ_YEAR + ' 내 키워드</b><small>#' + newYear(r).kw.slice(0, 2).join(' #') + '</small></span>' + uniImg('u-newyear') + '</button></div></section>';
    h += dailyBoxHTML(me, nums, elc, att.newly);
    var stNow = streakOf(getAtt());
    if (!NS && !store('unsu_auth') && store('unsu_nudge') !== todayStr() && (stNow >= 3 || getCoins() >= 60 || getUnlocks().length))
      h += '<div class="nudge"><div><b>기록이 쌓이고 있어요</b><p>연속 ' + stNow + '일 출석 · 엽전 ' + getCoins() + '닢. 로그인하면 기기를 바꿔도 그대로 이어져요.</p></div><div class="acts"><button class="btn-primary" id="btnNudgeLogin">로그인</button><button class="btn-ghost" id="btnNudgeClose">닫기</button></div></div>';
    h += '<p class="disclaimer">오늘의 운세는 일진과 사주의 관계로 계산한 재미용 콘텐츠예요.</p>';
    body.innerHTML = h;
    $('dpNY').onclick = function(){ openNYSheet(me, r); };
    $('hmTopics').onclick = function(){ openTopics(me, r); };
    $('hmAsk').onclick = function(){ openChat(me, r); };
    bindHomeP(me, r, body);
    bindFt(me, r);
    bindDailyBox();
    $('hmDream').onclick = function(){ openDream(); };
    $('dpSet').onclick = function(){ openCoinSheet(); };
    $('btnGoNum').onclick = function(){ go('num'); window.scrollTo(0, 0); };
    bindPeek(me, nums);
    renderCoin();
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
    $('btnTodayZ').onclick = function(){ myZ = z.name; renderZGrid(); openZodiac(z, iso); show('zodiac'); };
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
      passLinkHTML() + '<button class="btn-primary btn-block" id="clBuy">' + (guest ? '로그인하고 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢 받기' : short ? (wonSale('cat') ? buyLabel('cat') : '엽전 모으러 가기') : (passActive() ? '우니 패스로 열기' : COIN_SVG + '엽전 ' + CAT_COST + '닢으로 열기')) + '</button>' +
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
        passLinkHTML() + '<button class="btn-primary btn-block sheen" id="tkBuy">' + (passActive() ? '우니 패스로 1년 전체 열기' : '12개월 리포트 보기 · ' + priceTag('tk')) + '</button>' +
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
      var item = 'tk:' + (entry.id || '') + ':' + TK.p, rs = { k:'tk', id:entry.id, p:TK.p };
      openChoice({ k:'tk', name:'중요한 날 잡기 · ' + P.short + ' 12개월', who:esc(nm) + '님', art:'tk', item:item, rs:rs, coin:COST.tk, keep:esc(nm) + '님의 ' + P.short + ' 달력은 계속 볼 수 있어요',
        items:['12개월 달력 전체의 좋은 날·피할 날', '1년 중 베스트 5일과 고른 이유', '달마다 가장 좋은 날과 좋은 시간대', '캘린더 저장 · 공유 카드'],
        onOpen:function(){ setTkOpen(entry, TK.p); var b0 = S.best[0]; if (b0){ TK.mi = b0.mi; TK.sel = b0.key; } openTaekil(entry, r); } });
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
     행운 탭 — 복주머니를 열면 오늘의 행운 부적(색 · 방향 · 아이템 · 음식 · 시간 · 작은 행동)이 나온다
     2026-11-21: 번호 추첨 기능을 없애고 '오늘의 행운 세트'로 바꿨다. 2026-11-21 밤 GPT 검토로 숫자 3개도 뺐다(작은 행동으로 대체).
     ========================================================= */
  /* 2026-11-21 GPT 검토 P0: 예전 번호(nums) 기록은 부적으로 보여 주지 않는다. 저장소에는 남겨 두되 화면에서는 v:2 부적만 */
  function getBoxAll(){ var b = store('unsu_numbox'); return Array.isArray(b) ? b : []; }
  function getBox(){ return getBoxAll().filter(function(x){ return x && x.v === 2; }); }
  function saveToBox(item){
    var b = getBox();
    if (b.some(function(x){ return x.v === 2 && x.d === item.d && x.who === item.who; })){ toast('이미 보관함에 있는 부적이에요'); return false; }
    b = getBoxAll(); b.unshift(item); if (b.length > 80) b.length = 80; store('unsu_numbox', b); return true;
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
    var f = luck.f, lEl = luck.el, elc = EL_CLASS[lEl];
    var now = nowD(), md = (now.getMonth() + 1) + '월 ' + now.getDate() + '일';
    var cell = function(k, v){ return '<div class="tl-row"><span class="k">' + k + '</span><b>' + v + '</b></div>'; };
    return '<div id="numReveal" class="num-reveal"' + (shown ? '' : ' hidden') + '>' +
      '<div class="card talisman ' + elc + '"><div class="tl-k">' + md + ' · ' + MS.EL_K[lEl] + '(' + MS.EL_H[lEl] + ') 기운을 채우는 날</div>' +
      '<h2 class="tl-head">' + esc(f.head) + '</h2>' +
      '<blockquote class="tl-quote"><small>오늘의 한마디</small><p>' + adviceOf(me, r, lEl) + '</p></blockquote>' +
      '<div class="tl-rows">' +
        cell('행운의 색', f.tip.color) + cell('행운의 방향', EL_TEXT[lEl].dir) +
        cell('행운 아이템', f.tip.item) + cell('행운 음식', f.tip.food) +
        cell('좋은 시간', luckTime(me, r)) + cell('작은 행동', luck.act) +
        (showNums() ? '<div class="tl-row tl-wide tl-nums"><span class="k">행운의 숫자</span><b class="tl-numtxt">' + luck.nums.map(function(o){ return o.n; }).join(' · ') + '</b></div>' : '') +
      '</div>' +
      (showNums() ? '<p class="helper tl-numnote">행운의 숫자는 ' + MS.EL_K[lEl] + ' 기운의 끝자리(' + EL_TEXT[lEl].num.map(function(n){ return n % 10; }).join('·') + ')로 골랐어요. 약속 시간이나 자리를 고를 때 가볍게 참고해 보세요.</p>' : '') +
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
    var head = '<div class="flow-header"><button class="icon-back" id="btnNumBack" aria-label="홈으로">‹</button><span class="ttl">오늘의 행운 부적</span></div><div class="num-head"><h1 class="num-title">' + title + '</h1></div>';
    if (!me){
      box.innerHTML = head + '<div class="card pouch-card"><div class="pouch-fig">' + uniImg('u-pouch') + '</div>' +
        '<p class="helper" style="text-align:center">내 사주를 등록하면 복주머니에서 오늘의 행운 색, 방향, 작은 행동이 나와요. 매일 새로 바뀌어요.</p>' +
        '<button class="btn-primary btn-block sheen" id="btnNumOnb">내 사주 등록하고 복주머니 열기</button></div>';
      $('btnNumOnb').onclick = function(){ startOnboarding('new'); };
      $('btnNumBack').onclick = function(){ go('today'); };
      return;
    }
    var r = compute(me); if (r.error){ box.innerHTML = ''; return; }
    var luck = todayLuck(me, r), lEl = luck.el;
    var opened = store('unsu_drawn') === todayStr();
    setTimeout(function(){ if ($('btnNumBack')) $('btnNumBack').onclick = function(){ go('today'); }; }, 0);
    var h = head + '<div class="card pouch-card ' + EL_CLASS[lEl] + '" id="numWait"' + (opened ? ' hidden' : '') + '>' +
      '<div class="pouch-fig" id="pouchFig">' + uniImg('u-pouch') + '</div>' +
      '<p class="helper" style="text-align:center">복주머니를 열면 오늘 ' + esc(me.name) + '님께 필요한 행운의 색, 방향, 작은 행동이 나와요.</p>' +
      '<button class="btn-primary btn-block sheen" id="btnPouch">복주머니 열기</button></div>';
    h += talismanHTML(me, r, luck, opened);
    if (!opened) h += '<div id="pouchAd">' + adSlotHTML('복주머니를 열기 전') + '</div>';
    box.innerHTML = h;
    if ($('btnPouch')) $('btnPouch').onclick = function(){
      var fig = $('pouchFig'), btn = this; btn.disabled = true; FX.vib(10);
      if (fig && !reduceMotion){ fig.classList.add('shake'); }
      /* 흔들린 뒤 주머니가 '열리는' 느낌: 빛이 퍼지고 우니가 활짝 웃는 포즈로 바뀐다 */
      if (fig && !reduceMotion) setTimeout(function(){
        var im = fig.querySelector('img'); if (im) im.src = 'img/u-happy.webp';
        fig.classList.remove('shake'); fig.classList.add('opened');
        fig.insertAdjacentHTML('afterbegin', '<span class="pf-glow" aria-hidden="true"></span><span class="pf-ring" aria-hidden="true"></span>');
        FX.vib(14);
      }, 620);
      setTimeout(function(){
        markTodo('drawn'); revealNums(); FX.vib([18, 40, 24]);
        var tl = document.querySelector('.talisman');
        if (tl){ FX.confetti(tl, 46); setTimeout(function(){ FX.confetti(tl, 30); }, 260); }
        toast('오늘의 행운 부적이 나왔어요'); setTimeout(function(){ bond('num'); }, 1600);
      }, reduceMotion ? 0 : 1250);
    };
    $('btnNumSave').onclick = function(){
      if (saveToBox({ id:'b' + Date.now().toString(36), t:Date.now(), d:todayStr(), who:me.name, kind:'행운 부적', v:2, color:luck.f.tip.color, dir:EL_TEXT[lEl].dir, act:luck.act, nums:showNums() ? luck.nums.map(function(o){ return o.n; }) : [] })){ toast('보관함에 저장했어요'); bumpTab('box'); }
    };
    $('btnNumCopy').onclick = function(){
      var f = luck.f;
      openShare({ sheetTitle:'행운 부적 공유', title:me.name + '님의 오늘 행운 부적', desc:'행운의 색 ' + f.tip.color + ' · 방향 ' + EL_TEXT[lEl].dir + (showNums() ? ' · 숫자 ' + luck.nums.map(function(o){ return o.n; }).join(' · ') : ' · ' + luck.act),
        fig:figSVG(r.animal, ANIMAL_EL[r.animal], 'mini'),
        text:'[우니조아] ' + me.name + '님의 오늘 행운 부적\n행운의 색 ' + f.tip.color + '\n행운의 방향 ' + EL_TEXT[lEl].dir + '\n오늘의 작은 행동 ' + luck.act + (showNums() ? '\n행운의 숫자 ' + luck.nums.map(function(o){ return o.n; }).join(' · ') : ''),
        cta:'내 사주로 열어보는 행운 부적 →', link:resultLink('n', todayStr(), [me]), shareEntries:[me],
        card:{ kicker:me.name + '님의 오늘 행운 부적', head:'우니가 전하는 오늘의 행운 부적', rows:[['행운의 색', f.tip.color], ['행운의 방향', EL_TEXT[lEl].dir]] } });
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
    if (k === 'peek'){ setDailyTab('peek'); var pc = $('peekCard'); if (pc){ pc.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' }); pc.classList.remove('todo-hint'); void pc.offsetWidth; pc.classList.add('todo-hint'); } }
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
      '</div>';
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
  var boxTab = 'saved';
  function renderBox(){
    var me = getMe(), box = getBox(), dreams = getDreams(), h = NS ? demoBarHTML() : '', H = h;
    /* 2026-11-22 GPT 최종 시안: 저장한 기록 / 구매한 리포트 / 엽전 내역 탭 */
    H += '<div class="num-head"><h1 class="num-title">보관함</h1></div>';
    H += saveStateHTML();
    h = '';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">저장한 행운 부적</h2><span class="sec-meta">' + box.length + '장</span></div>';
    if (!box.length) h += '<div class="bx-empty">' + uniImg('u-empty') + '<p class="helper">아직 비어 있어요. 행운 탭에서 ‘보관함에 저장’을 누르면 여기에 모여요.</p></div><button class="btn-primary btn-block" id="bxGoNum" style="margin-top:12px">복주머니 열러 가기</button>';
    else h += '<div class="bx-list">' + box.map(function(b){
      return '<div class="bx-row"><div class="bx-meta"><b>' + esc(b.kind) + '</b><small>' + b.d.replace(/-/g, '.') + (b.who ? ' · ' + esc(b.who) : '') + '</small></div>' +
        '<span class="bx-tl">' + esc(b.color || '') + ' · ' + esc(b.dir || '') + (b.nums && b.nums.length && showNums() ? ' · ' + b.nums.join(' · ') : '') + '<br><b>' + esc(b.act || '') + '</b></span>' +
        '<button class="bx-del" data-bx="' + b.id + '" aria-label="이 부적 지우기">✕</button></div>';
    }).join('') + '</div>';
    h += '</div>';
    /* 열어 둔 리포트 (GPT 검토 P0-5: 산 결과를 다시 찾는 길) */
    var opened = liveOrders(), nyO = store('unsu_ny_open') || {}, list = getList ? getList() : [];
    var rep = opened.map(function(o){ return '<button class="row-link" data-rp="' + o.id + '" data-gk="' + esc(o.ghKey || '') + '"><span class="ic">' + TIP_IC.star + '</span><span>' + esc(o.name) + '<br><span class="helper">' + fmtDate(o.at) + ' · ' + (o.coin ? o.coin + '닢' : '') + '</span></span><span class="chev">›</span></button>'; });
    Object.keys(nyO).forEach(function(id){ var e = list.filter(function(x){ return x.id === id; })[0]; if (e) rep.push('<button class="row-link" data-rpny="' + id + '"><span class="ic">' + TIP_IC.star + '</span><span>2027 신년운세 전체 · ' + esc(e.name) + '<br><span class="helper">' + fmtDate(nyO[id]) + ' · 광고로 열림</span></span><span class="chev">›</span></button>'); });
    Object.keys(tkOpenMap()).forEach(function(k){ var id = k.split('|')[0], pp = k.split('|')[1], e = list.filter(function(x){ return x.id === id; })[0], Q = TAEKIL.PURPOSES[pp]; if (e && Q) rep.push('<button class="row-link" data-rptk="' + esc(k) + '"><span class="ic">' + TK_IC[pp] + '</span><span>중요한 날 잡기 · ' + Q.short + ' · ' + esc(e.name) + '<br><span class="helper">' + fmtDate(tkOpenMap()[k]) + ' · ' + COST.tk + '닢</span></span><span class="chev">›</span></button>'); });
    var bought = rep.length ? '<div class="card"><div class="sec-head"><h2 class="sec-title">구매한 리포트</h2><span class="sec-meta">' + rep.length + '개</span></div>' + rep.join('') + '</div>'
      : '<div class="card"><div class="bx-empty">' + uniImg('u-empty') + '<p class="helper">아직 구매한 리포트가 없어요. 사주 이야기책, 궁합 상세, 중요한 날 잡기를 열면 여기서 다시 볼 수 있어요.</p></div></div>';
    h += '<div class="card"><div class="sec-head"><h2 class="sec-title">꿈해몽 기록</h2><span class="sec-meta">' + dreams.length + '개</span></div>';
    if (!dreams.length) h += '<div class="bx-empty">' + uniImg('u-sleep') + '<p class="helper">꿈을 풀면 해몽 기록이 여기에 남아요.</p></div><button class="btn-soft btn-block" id="bxGoDream" style="margin-top:12px">꿈 해몽 하러 가기</button>';
    else h += dreams.slice(0, 10).map(function(d){ return '<button class="row-link" data-dm="' + d.id + '"><span class="ic">' + TIP_IC.star + '</span><span>' + esc(d.title || d.catName) + '<br><span class="helper">' + fmtDate(d.at) + ' · ' + (d.free ? '무료 해몽' : '꿈 풀이 리포트') + '</span></span><span class="chev">›</span></button>'; }).join('');
    h += '</div>';
    h += '<div class="card"><button class="row-link" id="bxList"><span class="ic">' + FEAT_IC.saju + '</span>저장한 사주 목록<span class="chev">›</span></button>' +
      (me ? '<button class="row-link" id="bxMy"><span class="ic">' + FEAT_IC.today + '</span>내 정보 · 엽전 기록<span class="chev">›</span></button>' : '<button class="row-link" id="bxStart"><span class="ic">' + FEAT_IC.today + '</span>내 사주 등록하기<span class="chev">›</span></button>') + '</div>';
    var clog = store('unsu_coinlog'); if (!Array.isArray(clog)) clog = [];
    var coinH = '<div class="card"><div class="sec-head"><h2 class="sec-title">엽전 내역</h2><span class="sec-meta">보유 ' + (isGuest() ? 0 : getCoins()).toLocaleString() + '닢</span></div>' +
      '<p class="helper" style="margin:-4px 0 10px">엽전은 출석·가입·우니 선물로 모으는 무료 포인트예요. 현금으로 바꾸거나 사고팔 수 없어요.</p>' +
      (isGuest() ? '<div class="bx-empty">' + uniImg('u-attend') + '<p class="helper">로그인하면 출석할 때마다 엽전이 쌓여요.</p></div>'
        : clog.length ? '<ul class="bx-coin">' + clog.slice(0, 30).map(function(x){ return '<li><span>' + esc(x.why || '') + '<small>' + fmtDate(x.t) + '</small></span><b class="' + (x.n < 0 ? 'm' : 'p') + '">' + (x.n > 0 ? '+' : '') + x.n + '닢</b></li>'; }).join('') + '</ul>'
        : '<div class="bx-empty">' + uniImg('u-empty') + '<p class="helper">아직 엽전 기록이 없어요.</p></div>') + '</div>';
    var tabs = [['saved', '저장한 기록'], ['bought', '구매한 리포트'], ['coin', '엽전 내역']];
    H += '<div class="seg bx-seg" role="tablist" aria-label="보관함 메뉴">' + tabs.map(function(t){ return '<button type="button" role="tab" data-bxt="' + t[0] + '" aria-selected="' + (boxTab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    H += boxTab === 'bought' ? bought : boxTab === 'coin' ? coinH : h;
    $('boxBody').innerHTML = H;
    $('boxBody').querySelectorAll('[data-bxt]').forEach(function(b){ b.onclick = function(){ boxTab = b.dataset.bxt; renderBox(); }; });
    bindDemoBar(); bindSaveState();
    if ($('bxGoNum')) $('bxGoNum').onclick = function(){ go('num'); };
    if ($('bxGoDream')) $('bxGoDream').onclick = function(){ openDream(); };
    if ($('bxMy')) $('bxMy').onclick = function(){ openMy(); };
    if ($('bxStart')) $('bxStart').onclick = function(){ startOnboarding('new'); };
    if ($('bxList')) $('bxList').onclick = function(){ renderList(); show('list'); };
    document.querySelectorAll('[data-bx]').forEach(function(b){ b.onclick = function(){ store('unsu_numbox', getBoxAll().filter(function(x){ return x.id !== b.dataset.bx; })); renderBox(); toast('지웠어요'); }; });
    document.querySelectorAll('[data-rp]').forEach(function(b){ b.onclick = function(){ var me = getMe(), id = b.dataset.rp; if (id === 'gh'){ go('gunghap'); return; } if (!me) return; var r = compute(me), O = { wl:openWealth, sal:openSal, gw:openGuin, lv:openLoveTiming, tj:openTojeong }; if (O[id]) O[id](me, r); else if (id === 'cal') openFortuneCal(me, r, 0); else if (id === 'ez') openStory(me, r, 0); else openResult(me, r, true); }; });
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
      '<div class="gh-react">' + (m.score >= 80 ? uniImg('wooni-joa', '', '하이파이브하는 우니와 조아') : m.score < 60 ? uniImg('joa-a', '', '토라진 조아') : uniImg('joa', '', '웃는 조아')) + '</div>' +
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
        '<div class="lock-cta"><button class="btn-primary" id="btnGhBuy">' + (passActive() ? '우니 패스로 상세 리포트 열기' : '상세 리포트 보기 · ' + priceTag('gh')) + '</button>' +
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
    $('loginChip').hidden = member;   /* 2026-11-22 소율: 예시 모드에서도 로그인 버튼이 보이게 */
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
        '<p class="ws-act">작은 행동 · 물 한 잔 천천히 마시기</p></div>' +
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
      '<button id="ftZ"><span class="ic">' + FEAT_IC.star + '</span><b>별자리 운세</b><small>12성좌 오늘의 기운과 작은 행동</small></button></div>';
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
  /* =========================================================
     쉬운 사주 풀이 — 우니가 읽어 주는 이야기책 (6개 장)
     1장은 무료, 2~6장은 쉬운 사주 풀이를 열면 이어진다. 전문 카드(십성·신살·대운)는 결과 화면에 그대로 있다.
     ========================================================= */
  var SB_ROLE = {
    year:{ n:'연주', img:'뿌리', age:'0~15세', who:'조상과 어린 시절, 세상이 처음 보는 나', tail:'어릴 때 집안 분위기와 주변에서 이 기운을 많이 받았고, 처음 만나는 사람에게 이 모습으로 보이기 쉬워요.' },
    month:{ n:'월주', img:'줄기', age:'15~30세', who:'부모와 일하는 환경, 사회 속의 나', tail:'일하고 사람을 만나는 자리에서 이 기운이 가장 힘 있게 드러나요. 사주에서 가장 힘이 센 자리예요.' },
    day:{ n:'일주', img:'꽃', age:'30~45세', who:'나 자신과 가장 가까운 사람', tail:'가장 가까운 사람과 있을 때 이 기운이 편하게 나와요. 내가 나를 어떻게 느끼는지가 여기에 담겨요.' },
    hour:{ n:'시주', img:'열매', age:'45세~', who:'자녀와 말년, 속마음', tail:'나이가 들수록, 그리고 혼자 있을 때 이 기운이 짙어져요. 내가 맺고 싶은 열매의 모습이에요.' }
  };
  var SB_TEN_SHORT = { '비견':'나와 닮은 친구 같은 힘', '겁재':'승부욕과 배짱', '식신':'즐기며 만들어 내는 힘', '상관':'틀을 깨는 재능과 말솜씨', '편재':'크게 벌고 크게 쓰는 감각', '정재':'차곡차곡 모으는 성실함', '편관':'나를 단련시키는 도전과 카리스마', '정관':'질서와 신뢰, 책임감', '편인':'남다른 직관과 영감', '정인':'배움과 어른의 도움' };
  var SB_SS_USE = {
    '천을귀인':'어려울 때 손을 내밀어 주는 사람이 나타나는 별이에요. 도움은 먼저 청하는 사람에게 와요. 혼자 끙끙대지 말고 가까운 어른이나 선배에게 말해 보세요.',
    '문창귀인':'글, 시험, 문서에 강한 별이에요. 자격증, 계약서, 기획서처럼 글로 남는 일에서 실력이 빛나요.',
    '도화살':'사람을 끌어당기는 매력의 별이에요. 좋게 쓰면 인기와 센스, 서비스·콘텐츠 분야의 강점이 돼요. 관계가 복잡해지지 않게 선만 지키면 돼요.',
    '역마살':'움직일수록 운이 트이는 별이에요. 이동, 여행, 이직, 해외와 인연이 있어요. 가만히 있으면 답답한 이유가 이거예요.',
    '화개살':'혼자 깊이 파고드는 별이에요. 예술, 공부, 마음 공부에 재능이 있어요. 혼자만의 시간을 지키는 게 곧 개운법이에요.',
    '양인살':'날이 선 칼 같은 별이에요. 결단력과 승부욕이 강해요. 그 힘을 운동, 전문 기술, 경쟁이 있는 일에 쓰면 든든한 무기가 돼요.',
    '괴강살':'우두머리의 별이에요. 카리스마와 추진력이 강하고 호불호가 분명해요. 말을 한 번 더 고르면 사람이 따라와요.'
  };
  var SB_SS_AT = { year:'어릴 때부터 갖고 있던 기운이에요.', month:'일하는 환경과 사회생활에서 드러나요.', day:'평생 가까이 두고 쓰는 기운이고, 가까운 사람과의 관계에서 보여요.', hour:'나이가 들수록 짙어져요.' };
  var SB_CH = [
    { t:'내 사주는 네 개의 기둥이에요', pose:'u-book', free:true },
    { t:'기둥마다 들여다보기', pose:'u-thinking' },
    { t:'내 안의 다섯 가지 힘', pose:'u-work' },
    { t:'나를 돕는 귀인과 특별한 별', pose:'u-gift' },
    { t:'10년마다 바뀌는 계절', pose:'u-calendar' },
    { t:'올해와 이번 달, 우니의 편지', pose:'u-happy' }
  ];
  var sbCtx = null;
  function sbPillarCard(k, P, ig, full){
    var p = P[k], R = SB_ROLE[k];
    if (!p) return '<div class="sb-pil sb-empty"><div class="sb-ph"><b>' + R.n + '</b><span>' + R.img + ' · ' + R.age + '</span></div><p>태어난 시간을 모르면 시주는 비워 두어요. 시간을 알게 되면 사주를 다시 저장해 보세요.</p></div>';
    var stemTxt = k === 'day' ? '나 자신을 뜻하는 글자예요. ' + esc(ig.t) + ', 곧 ' + ig.img + ' 같은 사람이에요.' : '위 글자는 ' + p.tenStem + '(' + SB_TEN_SHORT[p.tenStem] + ')이에요.';
    return '<div class="sb-pil"><div class="sb-ph"><b>' + R.n + '</b><span>' + R.img + ' · ' + R.age + '</span></div>' +
      '<div class="sb-gl"><span class="' + EL_CLASS[p.sEl] + '">' + p.sh + '</span><span class="' + EL_CLASS[p.bEl] + '">' + p.bh + '</span></div>' +
      '<p class="sb-who">' + R.who + '</p>' +
      '<p>' + stemTxt + ' 아래 글자는 ' + p.tenBr + '(' + SB_TEN_SHORT[p.tenBr] + ')이에요.</p>' +
      (full ? '<p>' + R.tail + '</p>' : '') + '</div>';
  }
  function sbChapter(n, entry, r){
    var P = r.pillars, ig = ILGAN[P.day.stem], name = esc(entry.name), h = '';
    if (n === 0){
      h += '<p class="sb-lead">사주는 태어난 해, 달, 날, 시간을 각각 두 글자로 적은 여덟 글자예요. 이 두 글자씩을 <b>기둥</b>이라고 불러요.</p>' +
        '<div class="sb-tree"><div><b>연주</b><span>뿌리</span></div><div><b>월주</b><span>줄기</span></div><div><b>일주</b><span>꽃</span></div><div><b>시주</b><span>열매</span></div></div>' +
        '<p>나무를 떠올리면 쉬워요. 뿌리(연주)는 집안과 어린 시절, 줄기(월주)는 부모와 일하는 환경, 꽃(일주)은 나 자신과 배우자, 열매(시주)는 자녀와 말년이에요. 나이로는 한 기둥이 대략 15년을 맡아요.</p>' +
        '<h4 class="sb-h">' + name + '님의 연주부터 읽어 볼게요</h4>' + sbPillarCard('year', P, ig, true) +
        '<p class="sb-note">나머지 세 기둥은 다음 장에서 하나씩 풀어 줄게요.</p>';
    } else if (n === 1){
      ['month', 'day', 'hour'].forEach(function(k){ h += sbPillarCard(k, P, ig, true); });
      h += '<p class="sb-h2">일주 ' + P.day.name + '</p><p>' + ig.d + '</p><p><b>강점</b> ' + ig.good + '</p><p><b>조심할 점</b> ' + ig.care + '</p>';
    } else if (n === 2){
      var gCount = { '비겁':0,'식상':0,'재성':0,'관성':0,'인성':0 };
      ['hour','day','month','year'].forEach(function(k){ var p = P[k]; if (!p) return; if (k !== 'day') gCount[TEN_TO_GROUP[p.tenStem]]++; gCount[TEN_TO_GROUP[p.tenBr]]++; });
      var keys = Object.keys(gCount), top = keys.slice().sort(function(a, b){ return gCount[b] - gCount[a]; })[0], none = keys.filter(function(k){ return !gCount[k]; });
      h += '<p class="sb-lead">글자마다 나와의 관계에 따라 이름이 붙어요. 다섯 묶음으로 보면 ' + name + '님이 어떤 힘을 많이 갖고 있는지 보여요.</p><div class="sb-pow">';
      keys.forEach(function(k){ var d = ''; for (var i = 0; i < 5; i++) d += '<i class="' + (i < gCount[k] ? 'on' : '') + '"></i>'; h += '<div><b>' + k + '</b><span>' + TEN_GROUP[k].m.split('.')[0] + '</span><em>' + d + '</em></div>'; });
      h += '</div><h4 class="sb-h">가장 큰 힘은 ' + top + '이에요</h4><p>' + TEN_GROUP[top].hi + '</p>';
      none.forEach(function(k){ h += '<h4 class="sb-h">' + k + '은 비어 있어요</h4><p>' + TEN_GROUP[k].lo + '</p>'; });
      h += '<p class="sb-note">비어 있다고 나쁜 게 아니에요. 그 힘은 사람과 환경에서 빌려 쓰면 돼요.</p>';
    } else if (n === 3){
      var gui = r.shinsal.filter(function(s){ return /귀인/.test(s.name); }), sal = r.shinsal.filter(function(s){ return !/귀인/.test(s.name); });
      h += '<p class="sb-lead"><b>귀인</b>은 나를 도와주는 별, <b>살</b>은 한쪽으로 강하게 쏠린 기운이에요. 살은 나쁜 게 아니라 쓰는 방법에 따라 무기가 돼요.</p>';
      var ssBlock = function(s){ return '<div class="sb-ss"><span class="chip">' + s.name + '</span><p>' + SB_SS_USE[s.name] + '</p><p class="sb-at">' + s.at.map(function(a){ return SB_ROLE[a].n; }).join('·') + '에 있어요. ' + SB_SS_AT[s.at[0]] + '</p></div>'; };
      h += '<h4 class="sb-h">나를 돕는 귀인</h4>';
      h += gui.length ? gui.map(ssBlock).join('') : '<p>원국에 귀인 별이 따로 보이지는 않아요. 대운이나 해마다 들어오는 귀인이 있으니 걱정하지 않아도 돼요. 사람을 대할 때 먼저 베푸는 쪽이 가장 빠른 귀인 운이에요.</p>';
      h += '<h4 class="sb-h">특별한 별, 살</h4>';
      h += sal.length ? sal.map(ssBlock).join('') : '<p>두드러진 살이 없는 담백한 사주예요. 굴곡이 적고 스스로 노력해서 길을 만드는 타입이에요.</p>';
      var gongAt = ['year','month','hour'].filter(function(k){ return P[k] && r.gong.indexOf(P[k].br) > -1; });
      h += '<div class="sb-ss"><span class="chip">공망</span><p>비어 있는 자리예요. ' + (gongAt.length ? gongAt.map(function(a){ return SB_ROLE[a].n; }).join('·') + '에 걸려 있어, 그 기둥이 맡은 인연이나 일이 조금 늦게 채워지는 편이에요. 늦을 뿐 없는 게 아니에요.' : '원국에는 걸린 기둥이 없어요.') + '</p></div>';
    } else if (n === 4){
      var du = r.curDaeun;
      h += '<p class="sb-lead">사주 원국은 타고난 지도이고, <b>대운</b>은 10년마다 바뀌는 계절이에요. 같은 사주도 어느 계절을 지나느냐에 따라 느낌이 달라져요.</p>';
      if (du){
        h += '<div class="sb-now"><span class="sb-tag">지금</span><div class="sb-gl"><span class="' + EL_CLASS[du.sEl] + '">' + du.sh + '</span><span class="' + EL_CLASS[du.bEl] + '">' + du.bh + '</span></div><b>' + du.name + ' 대운 · ' + du.age + '~' + (du.age + 9) + '세</b></div>' +
          '<p>' + TEN_DESC[du.tenStem] + '의 10년이에요. ' + SEUN_TEXT[du.tenStem] + '</p>';
        var next = r.daeun[r.daeun.indexOf(du) + 1];
        if (next) h += '<h4 class="sb-h">다음 계절 · ' + next.age + '세부터</h4><p>' + next.name + ' 대운이 와요. ' + TEN_DESC[next.tenStem] + '의 10년으로 넘어가요. ' + SEUN_TEXT[next.tenStem].split('. ')[0] + '.</p>';
      } else h += '<p>첫 대운(' + r.dNum + '세) 전의 시기예요. 부모님의 기운과 월주의 영향이 가장 커요.</p>';
      h += '<div class="scroller sb-du">' + r.daeun.map(function(p){ var now = r.curDaeun === p; return '<div class="du' + (now ? ' now' : '') + '"><span class="age">' + p.age + '세</span><span class="g"><span class="' + EL_CLASS[p.sEl] + '">' + p.sh + '</span><span class="' + EL_CLASS[p.bEl] + '">' + p.bh + '</span></span></div>'; }).join('') + '</div>';
    } else {
      var S = r.seun, M = r.wolun;
      h += '<h4 class="sb-h">' + S.year + '년 · ' + S.name + '</h4><p>' + SEUN_TEXT[S.tenStem] + '</p><p class="sb-note">' + STAGE_DESC[S.stage] + '</p>' +
        '<h4 class="sb-h">이번 달 · ' + M.name + '월</h4><p>' + TEN_DESC[M.tenStem] + '의 기운이 들어오는 달이에요. ' + SEUN_TEXT[M.tenStem].split('. ').slice(-1)[0] + '</p>' +
        '<div class="sb-letter"><b>우니의 편지</b><p>' + name + '님, 여기까지 읽어 줘서 고마워요. ' + ig.t.split('(')[0] + '의 기운을 타고난 ' + name + '님은 ' + ig.kw.slice(0, 2).join('과 ') + '이 힘이에요. ' + EL_TEXT[r.yong].act + '이 도움이 돼요. 오늘도 복주머니 열러 와요.</p></div>' +
        '<div class="row"><button class="btn-soft grow" id="sbGoTk">중요한 날 잡기</button><button class="btn-soft grow" id="sbGoNum">오늘의 행운 부적</button></div>';
    }
    return h;
  }
  function openStory(entry, r, ch){
    ch = Math.max(0, Math.min(SB_CH.length - 1, ch || 0)); sbCtx = { entry:entry, r:r };
    var ov = $('storyOv');
    if (!ov){ ov = document.createElement('div'); ov.id = 'storyOv'; ov.className = 'story-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); document.body.appendChild(ov); }
    var open = owns('ez'), locked = !open && !SB_CH[ch].free, C = SB_CH[ch], dots = '';
    for (var i = 0; i < SB_CH.length; i++) dots += '<i class="' + (i === ch ? 'on' : i < ch ? 'done' : '') + '"></i>';
    var body;
    if (locked){
            body = '<p class="sb-lead">' + esc(entry.name) + '님의 사주를 이어서 읽어 드릴게요.</p><div class="sb-lock"><div class="sb-blur" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="sb-lockbox">' + LOCK_SVG +
        '<b>' + SB_CH.slice(1).map(function(c, j){ return (j + 2) + '장 ' + c.t; }).join('<br>') + '</b>' +
        '<button class="btn-primary btn-block sheen" id="sbBuy">2~6장 열기 · ' + priceTag('ez') + '</button><p class="helper">구입하면 계정에서 계속 다시 읽을 수 있어요.</p></div></div>';
    } else body = sbChapter(ch, entry, r);
    ov.innerHTML = '<div class="sb-bar"><button class="sb-x" id="sbX" aria-label="닫기">✕</button><div class="sb-dots" aria-label="' + (ch + 1) + '장 / ' + SB_CH.length + '장">' + dots + '</div><span class="sb-no">' + (ch + 1) + '/' + SB_CH.length + '</span></div>' +
      '<div class="sb-page" id="sbPage"><div class="sb-fig">' + uniImg(C.pose) + '</div><div class="sb-chn">' + (ch + 1) + '장</div><h2 class="sb-t">' + C.t + '</h2>' + body + '</div>' +
      '<div class="sb-nav"><button class="btn-ghost" id="sbPrev"' + (ch ? '' : ' disabled') + '>이전</button>' +
      '<button class="btn-primary" id="sbNext">' + (ch === SB_CH.length - 1 ? '책 덮기' : locked ? '이어 읽기' : '다음 장') + '</button></div>';
    ov.hidden = false; document.body.classList.add('sb-on');
    ov.scrollTop = 0; var pg = $('sbPage'); if (pg && !reduceMotion){ pg.classList.remove('sb-turn'); void pg.offsetWidth; pg.classList.add('sb-turn'); }
    var close = function(){ ov.hidden = true; document.body.classList.remove('sb-on'); };
    var buy = function(){ openPaySheet('ez', { who:esc(entry.name) + '님', onPaid:function(){ openResult(entry, r, cur && cur.asTab); openStory(entry, r, ch); } }); };
    $('sbX').onclick = close;
    $('sbPrev').onclick = function(){ openStory(entry, r, ch - 1); };
    $('sbNext').onclick = function(){ if (locked) buy(); else if (ch === SB_CH.length - 1) close(); else openStory(entry, r, ch + 1); };
    if ($('sbBuy')) $('sbBuy').onclick = buy;
    if ($('sbGoTk')) $('sbGoTk').onclick = function(){ close(); openTaekil(sbCtx.entry, sbCtx.r); };
    if ($('sbGoNum')) $('sbGoNum').onclick = function(){ close(); go('num'); };
  }
  function bookCoverHTML(entry, open){
    return '<div class="card sb-cover"><div class="sb-cfig">' + uniImg('u-book') + '</div><div class="sb-ck">사주 이야기책</div>' +
      '<h2 class="sb-ct">우니가 읽어 주는<br>' + esc(entry.name) + '님의 사주 이야기책</h2>' +
      '<ul class="sb-cl"><li>연주·월주·일주·시주가 내 삶에서 하는 일</li><li>나를 돕는 귀인과 특별한 별(살)</li><li>10년 계절(대운)과 올해·이번 달</li></ul>' +
      '<button class="btn-primary btn-block sheen" id="btnBook">' + (open ? '이야기책 다시 읽기' : '1장 무료로 읽어 보기') + '</button>' +
      '<p class="helper" style="text-align:center">' + (open ? '6개 장 모두 열려 있어요' : '1장 무료 · 2~6장 ' + priceTag('ez')) + '</p></div>';
  }
  /* =========================================================
     2027 토정비결 (2026-11-21 소율: "남들 있는 건 다 있어야")
     전통 작괘법: 상괘 = (그해 세는 나이 + 태세수) % 8, 중괘 = (생월 월건수 + 그 달 날수) % 6, 하괘 = (생일 + 생일 일진수) % 3
     태세·월건·일진은 2027 정미년 음력 기준. 간지 수: 천간 갑기9 을경8 병신7 정임6 무계5 / 지지 자오9 축미8 인신7 묘유6 진술5 사해4.
     풀이 글은 우니조아가 새로 쓴 글이다(옛 원문을 옮기지 않는다).
     무료: 괘 번호 · 한 해 총운(상괘) · 1~3월 / 유료(tj): 상반기 · 하반기 · 4~12월 · 좋은 달과 조심할 달 · 한 해 처방
     ========================================================= */
  var TJ_YEAR = 2027, TJ_SNUM = [9,8,7,6,5,9,8,7,6,5], TJ_BNUM = [9,8,7,6,5,4,9,8,7,6,5,4];
  var TJ_SANG = [null,
    { g:'건(乾) · 하늘', head:'높은 곳에서 해가 비치는 해', s:2, d:'하늘이 활짝 열린 괘예요. 미뤄 둔 큰일을 시작하기 좋고, 윗사람의 눈에 띄어 자리가 올라가기 쉬워요. 다만 해가 높을수록 그림자도 길어지니, 잘될 때 말과 자세를 낮추면 복이 오래가요.' },
    { g:'태(兌) · 연못', head:'고인 물에 꽃이 비치는 해', s:1, d:'사람이 모이고 웃음이 많은 괘예요. 말 한마디로 기회가 오고, 모임과 인연에서 좋은 소식이 들려요. 즐거움이 지나치면 지출이 늘어나니 재미와 절약의 선을 정해 두세요.' },
    { g:'리(離) · 불', head:'어둠 속에 등불을 켜는 해', s:2, d:'숨어 있던 재능이 밝게 드러나는 괘예요. 이름이 알려지고, 문서와 계약에서 좋은 결과가 나와요. 불은 빨리 타오르는 만큼 금방 식기도 하니, 시작한 일은 끝까지 지켜보세요.' },
    { g:'진(震) · 우레', head:'천둥 뒤에 새싹이 돋는 해', s:0, d:'놀랄 만한 변화가 찾아오는 괘예요. 처음에는 흔들려도 그 변화가 새 길을 열어 줘요. 겁먹고 피하기보다 한 걸음 먼저 움직이는 쪽이 이기는 해예요.' },
    { g:'손(巽) · 바람', head:'순한 바람이 돛을 미는 해', s:1, d:'부드럽게 스며드는 괘예요. 억지로 밀기보다 흐름을 타면 일이 술술 풀려요. 멀리서 오는 소식, 이동과 거래에 운이 있어요. 마음이 자주 바뀌지 않게 중심만 잡으세요.' },
    { g:'감(坎) · 물', head:'깊은 물을 건너 언덕에 오르는 해', s:-1, d:'건너야 할 물이 보이는 괘예요. 한두 번 막히는 일이 있어도 서두르지 않으면 반드시 건너요. 돈과 보증, 큰 약속은 한 번 더 확인하고, 건강과 잠을 먼저 챙기세요.' },
    { g:'간(艮) · 산', head:'산에 올라 쉬며 멀리 보는 해', s:0, d:'멈추고 다지는 괘예요. 새로 벌이기보다 가진 것을 지키고 실력을 쌓을 때 운이 커져요. 지금 쌓은 것이 다음 해의 발판이 되니 조급해하지 마세요.' },
    { g:'곤(坤) · 땅', head:'너른 땅에 씨앗을 심는 해', s:1, d:'받아들이고 길러 내는 괘예요. 혼자보다 함께할 때, 앞에 나서기보다 뒤에서 받쳐 줄 때 더 큰 몫이 돌아와요. 집과 가족, 부동산과 관련된 일에 좋은 기운이 있어요.' }
  ];
  var TJ_JUNG = [null,
    { t:'봄에 씨를 뿌려 여름에 싹이 트는 형국', d:'상반기는 준비한 일을 꺼내 놓기 좋은 때예요. 새로 만나는 사람이 일을 도와주고, 수입도 조금씩 늘어나요.' },
    { t:'물가에 앉아 고기를 기다리는 형국', d:'상반기는 기다림이 필요한 때예요. 결과가 늦게 와도 방향은 맞으니 꾸준함을 지키세요. 돈은 들어오는 것보다 새는 것을 막는 게 먼저예요.' },
    { t:'귀한 손님이 문을 두드리는 형국', d:'상반기에 반가운 사람이 찾아와요. 소개, 추천, 제안이 들어오면 가볍게 넘기지 말고 들어 보세요. 그 인연이 한 해를 바꿀 수 있어요.' },
    { t:'두 갈래 길 앞에 선 형국', d:'상반기에 선택할 일이 생겨요. 욕심을 덜어 낸 쪽이 결국 맞는 길이에요. 계약과 서류는 날짜와 금액을 꼼꼼히 보세요.' },
    { t:'비 온 뒤 땅이 굳는 형국', d:'상반기 초반에는 흔들림이 있지만 그 덕에 관계와 자리가 단단해져요. 다투더라도 오래 끌지 말고 먼저 손을 내미세요.' },
    { t:'곳간에 곡식이 차오르는 형국', d:'상반기에 노력의 대가가 들어와요. 보너스, 부수입, 오래 기다린 돈이 들어올 수 있어요. 들어온 몫의 일부는 꼭 따로 모아 두세요.' }
  ];
  var TJ_HA = [null,
    { t:'가을 들판에 열매가 익는 형국', d:'하반기는 거두는 때예요. 상반기에 시작한 일이 결실을 맺고, 연말에는 웃으며 한 해를 돌아보게 돼요.' },
    { t:'달이 차면 기우는 형국', d:'하반기는 지키는 때예요. 잘된 일일수록 욕심을 줄이고, 몸과 마음을 쉬게 하면 다음 해의 운까지 이어져요.' },
    { t:'눈 속에서 매화가 피는 형국', d:'하반기 늦게 좋은 소식이 와요. 가을까지 답답해도 겨울 무렵 길이 열리니 끝까지 포기하지 마세요.' }
  ];
  var TJ_MON = {
    '비겁':['사람이 모이는 달이에요. 함께하면 힘이 되지만 돈 거래는 선을 그어요.', '경쟁이 생기는 달이에요. 내 몫을 분명히 말하면 손해가 없어요.'],
    '식상':['아이디어가 술술 나오는 달이에요. 말과 글로 나를 드러내 보세요.', '즐거운 일이 많은 달이에요. 다만 말실수와 충동구매는 조심해요.'],
    '재성':['돈이 움직이는 달이에요. 작은 투자보다 수입을 늘리는 쪽에 힘을 쓰세요.', '실속을 챙기는 달이에요. 미뤄 둔 정산과 계약을 마무리하기 좋아요.'],
    '관성':['책임이 커지는 달이에요. 맡은 일을 해내면 인정이 따라와요.', '규칙과 약속이 중요한 달이에요. 서두르지 말고 순서를 지키세요.'],
    '인성':['도움을 받는 달이에요. 어른이나 선배의 조언에 답이 있어요.', '배우기 좋은 달이에요. 공부, 자격증, 책 한 권이 다음을 열어 줘요.']
  };
  function tjDayNum(y, m, d){ var j = MS.jd(y, m, d, 0) + 0.5, d60 = ((Math.floor(j) + 49) % 60 + 60) % 60; return TJ_SNUM[d60 % 10] + TJ_BNUM[d60 % 12]; }
  function tjCalc(r){
    var L = r.lunar || { y:r.solar.y, m:r.solar.m, d:r.solar.d };
    var age = TJ_YEAR - L.y + 1, ys = (TJ_YEAR - 4) % 10, yb = (TJ_YEAR - 4) % 12;
    var tae = TJ_SNUM[ys] + TJ_BNUM[yb];
    var m = L.m, mStem = ((ys % 5) * 2 + 2 + m - 1) % 10, mBr = (m + 1) % 12;
    var wolgeon = TJ_SNUM[mStem] + TJ_BNUM[mBr];
    var s1 = MS.lunarToSolar(TJ_YEAR, m, 1, false), s2 = m < 12 ? MS.lunarToSolar(TJ_YEAR, m + 1, 1, false) : MS.lunarToSolar(TJ_YEAR + 1, 1, 1, false);
    var days = (s1 && s2) ? Math.round((Date.UTC(s2.y, s2.m - 1, s2.d) - Date.UTC(s1.y, s1.m - 1, s1.d)) / 864e5) : 30;
    var bd = Math.min(L.d, days), sb = MS.lunarToSolar(TJ_YEAR, m, bd, false) || { y:TJ_YEAR, m:m, d:bd };
    var sang = (age + tae) % 8 || 8, jung = (wolgeon + days) % 6 || 6, ha = (L.d + tjDayNum(sb.y, sb.m, sb.d)) % 3 || 3;
    var dS = r.pillars.day.stem, months = [];
    for (var i = 1; i <= 12; i++){
      var st = ((ys % 5) * 2 + 2 + i - 1) % 10, g = TEN_TO_GROUP[MS.tenGod(dS, st)];
      var sc = Math.max(40, Math.min(96, 70 + TJ_SANG[sang].s * 6 + ({ '인성':6, '재성':5, '식상':3, '관성':0, '비겁':-3 })[g] + (((sang * 7 + jung * 5 + ha * 3 + i * 11) % 13) - 6) * 2));
      months.push({ m:i, g:g, sc:sc, line:TJ_MON[g][(sang + jung + ha + i) % 2] });
    }
    return { no:'' + sang + jung + ha, sang:sang, jung:jung, ha:ha, age:age, months:months };
  }
  function openTojeong(me, r){
    setTimeout(function(){ bond('ny'); }, 900);
    var T = tjCalc(r), S = TJ_SANG[T.sang], open = owns('tj') || passActive(), FREE = 3;
    var best = T.months.slice().sort(function(a, b){ return b.sc - a.sc; }), good = best.slice(0, 2), care = best.slice(-2).reverse();
    var mon = T.months.map(function(x){
      var on = open || x.m <= FREE;
      return '<li class="' + (on ? '' : 'lock') + '"><b>' + x.m + '월</b><span>' + (on ? x.line : '<i class="tj-blur" aria-hidden="true">' + x.line + '</i>') + '</span></li>';
    }).join('');
    var E = EL_TEXT[r.yong];
    openSheet('<div class="tj-sheet"><div class="sheet-fig">' + uniImg('u-book') + '</div>' +
      '<h3 id="sheetTitle">' + esc(me.name) + '님의 2027 토정비결</h3>' +
      '<p class="helper" style="margin:-4px 0 12px">정미년 · ' + T.age + '세(세는 나이) · 음력 생일로 지은 괘</p>' +
      '<div class="tj-gwae"><div class="tj-no"><small>나의 괘</small><b>' + T.no + '</b></div><div><span class="tj-g">' + S.g + '</span><h4>' + S.head + '</h4></div></div>' +
      '<div class="tj-sec"><h4>한 해의 흐름</h4><p>' + S.d + '</p></div>' +
      (open
        ? '<div class="tj-sec"><h4>상반기 · ' + TJ_JUNG[T.jung].t + '</h4><p>' + TJ_JUNG[T.jung].d + '</p></div>' +
          '<div class="tj-sec"><h4>하반기 · ' + TJ_HA[T.ha].t + '</h4><p>' + TJ_HA[T.ha].d + '</p></div>'
        : '<div class="tj-sec tj-locked"><h4>상반기 · 하반기 풀이 ' + LOCK_SVG + '</h4><p class="tj-blur" aria-hidden="true">' + TJ_JUNG[T.jung].d + '</p></div>') +
      '<div class="tj-sec"><h4>달마다 한 줄 <small>' + (open ? '1~12월' : '1~3월 무료') + '</small></h4><ul class="tj-mon">' + mon + '</ul></div>' +
      (open
        ? '<div class="tj-sec"><h4>좋은 달과 조심할 달</h4><p><b>좋은 달</b> ' + good.map(function(x){ return x.m + '월'; }).join(', ') + ' · 큰 결정과 새 시작은 이때로 잡아 보세요.</p><p><b>조심할 달</b> ' + care.map(function(x){ return x.m + '월'; }).join(', ') + ' · 약속과 지출을 줄이고 쉬어 가세요.</p></div>' +
          '<div class="tj-sec"><h4>한 해의 처방</h4><p>' + esc(me.name) + '님에게 힘이 되는 ' + MS.EL_K[r.yong] + '(' + MS.EL_H[r.yong] + ') 기운을 가까이 두세요. 색은 ' + E.color + ', 방향은 ' + E.dir + '이에요. ' + E.act + '이 한 해의 운을 받쳐 줘요.</p></div>' + adSlotHTML('토정비결을 다 본 뒤')
        : '<div class="tj-buy"><b>상반기·하반기, 4~12월, 좋은 달과 조심할 달, 한 해 처방까지</b>' + passLinkHTML() + '<button class="btn-primary btn-block sheen" id="btnTjBuy">토정비결 전체 보기 · ' + priceTag('tj') + '</button></div>') +
      '<p class="disclaimer">토정비결은 음력 생년월일과 그해 간지로 괘를 짓는 전통 풀이예요. 풀이 글은 우니조아가 새로 썼고, 재미로 보는 참고용이에요.</p>' +
      '<button class="text-btn" data-close>' + (open ? '닫기' : '나중에 볼게요') + '</button></div>');
    if ($('btnTjBuy')) $('btnTjBuy').onclick = function(){ closeSheet(); setTimeout(function(){ openPaySheet('tj', { who:esc(me.name) + '님', onPaid:function(){ openTojeong(me, r); } }); }, 260); };
  }
  /* =========================================================
     더보기 메뉴: 토정비결 · 월별 운세 달력 · 연애·결혼 시기 · 우니에게 묻기(AI 상담)
     2026-11-21 소율: "연애·결혼 시기, ai 상담이랑 월별 운세 달력은 있어야" (타로는 출시 후)
     ========================================================= */
  /* 주제별 풀이 (2026-11-22 GPT 최종 시안): 관계 · 날짜 · 연간 운세 · 더 깊이 · 가볍게 보기 */
  function topicGroups(){
    return [
      ['관계', [['gh', 'uj-hands', '궁합', '두 사람의 합과 잘 맞는 대화법', '상세 ' + priceTag('gh')], ['lv', 'joa-love', '인연이 오는 해와 달', '10년 연애·결혼 시기', '']]],
      ['날짜', [['fc', 'u-calendar', '사랑·돈·일 골든타이밍', '월별 운세 달력 · 이번 달 좋은 날', '무료'], ['tk', 'u-calendar', '중요한 날 잡기', '이사·개업·계약·면접 날짜', '두 달 무료']]],
      ['연간 운세', [['ny', 'u-newyear', '2027 신년운세', '내 사주 × 정미년 기운 · 12개월 흐름', '총평 무료'], ['tj', 'u-book', '2027 토정비결', '음력 생일로 뽑는 한 해 괘 · 옛 풀이', ''], ['sal', 'u-thinking', '나에게 든 살 풀이', '도화·역마·홍염… 강점과 푸는 법', '1개 무료']]],
      ['사람', [['gw', 'wooni-joa', '나를 돕는 귀인', '어떤 띠·일간이 나를 돕고 언제 올까', '1개 무료']]],
      ['돈', [['wl', 'u-money', '내 재물 그릇', '평생 돈 흐름 · 크게 들어오는 시기 3번', '1장 무료']]],
      ['더 깊이', [['book', 'u-book', '사주 이야기책', '우니가 읽어 주는 내 사주', '1장 무료'], ['chat', 'u-thinking', '우니에게 묻기', '사주 AI 해석 · 고민을 내 사주로 답해요', '하루 1번 무료'], ['job', 'u-work', '나에게 맞는 직업', '타고난 재능과 맞는 분야', '']]],
      ['가볍게 보기', [['zodiac', 'u-zodiac', '별자리 운세', '오늘의 별자리', '무료'], ['dream', 'u-sleep', '꿈해몽', '길몽일까? 오늘의 처방', '무료']]]
    ];
  }
  function topicListHTML(me, where){
    return '<div class="tp-list">' + topicGroups().map(function(g){
      return '<div class="tp-g"><h3>' + g[0] + '</h3>' + g[1].map(function(x){
        return '<button type="button" class="tp-row" data-tp="' + x[0] + '"><span class="tp-ic" aria-hidden="true">' + uniImg(x[1]) + '</span><span class="tp-t"><b>' + x[2] + '</b><small>' + x[3] + '</small></span>' + (x[4] ? '<span class="tp-m">' + x[4] + '</span>' : '') + '<span class="chev" aria-hidden="true">›</span></button>';
      }).join('') + '</div>';
    }).join('') + '</div>';
  }
  function topicActs(me, r){
    return {
      gh:function(){ go('gunghap'); window.scrollTo(0, 0); }, lv:function(){ openLoveTiming(me, r); },
      fc:function(){ openFortuneCal(me, r, 0); }, tk:function(){ openTaekil(me, r); },
      ny:function(){ openNYSheet(me, r); }, tj:function(){ openTojeong(me, r); },
      wl:function(){ openWealth(me, r); }, sal:function(){ openSal(me, r); }, gw:function(){ openGuin(me, r); },
      book:function(){ openStory(me, r, 0); }, chat:function(){ openChat(me, r); }, job:function(){ openCat(me, r, 'job'); },
      zodiac:function(){ var z = getZodiac(r.solar.m, r.solar.d); myZ = z.name; renderZGrid(); openZodiac(z, entryISO(me, r)); show('zodiac'); },
      dream:function(){ openDream(); }
    };
  }
  function bindTopics(me, r, root){
    var A = topicActs(me, r);
    root.querySelectorAll('[data-tp]').forEach(function(b){ b.onclick = function(){ var fn = A[b.dataset.tp]; if (!fn) return; closeSheet(); fn(); }; });
  }
  function openTopics(me, r){
    openSheet('<h3 id="sheetTitle">주제별 풀이</h3><p class="helper" style="margin:-8px 0 14px">' + esc(me.name) + '님 사주로 볼 수 있는 풀이를 주제별로 모았어요.</p>' + topicListHTML(me, 'sheet'));
    bindTopics(me, r, $('sheetBody'));
  }
  /* =========================================================
     오늘의 운세 탭 (2026-11-23 소율: 네이버처럼 기간 탭 + 분야 아이콘을 눌러 바로 보기)
     기간: 오늘 · 내일 · 이번 주 · 이번 달 / 분야: 총운 · 애정 · 금전 · 직장 · 학업 · 건강
     하루 점수는 DAILY.today 그대로(달력·분야별 운세와 같은 값), 학업·건강은 같은 날 기운으로 따로 계산.
     주·달은 그 기간 날마다 점수의 평균 + 기간의 기운(주: 가장 많은 십성, 달: 월주 천간) → 날짜가 같으면 문장도 같다
     ========================================================= */
  /* 분야 아이콘: 우니조아 파스텔 이모티콘 (얼굴 + 볼터치). 네이버 아이콘과 겹치지 않게 직접 그린 모양 */
  function ftFace(x, y){
    var k = '#4b3a63';
    return '<ellipse cx="' + (x - 5.2) + '" cy="' + (y + 1.8) + '" rx="1.7" ry="1" fill="#ff8fa8" opacity=".55"/><ellipse cx="' + (x + 5.2) + '" cy="' + (y + 1.8) + '" rx="1.7" ry="1" fill="#ff8fa8" opacity=".55"/>' +
      '<circle cx="' + (x - 2.9) + '" cy="' + y + '" r="1.15" fill="' + k + '"/><circle cx="' + (x + 2.9) + '" cy="' + y + '" r="1.15" fill="' + k + '"/>' +
      '<path d="M' + (x - 1.5) + ' ' + (y + 1.9) + 'q1.5 1.4 3 0" fill="none" stroke="' + k + '" stroke-width="1.1" stroke-linecap="round"/>';
  }
  var FT_CATS = [
    ['total', '총운', '<path d="M16 3.6l3.4 7 7.6 1.1-5.5 5.3 1.3 7.6L16 21l-6.8 3.6 1.3-7.6L5 11.7l7.6-1.1z" fill="#ffe59a" stroke="#ffd46b" stroke-width="2" stroke-linejoin="round"/>' + ftFace(16, 15.2) + '<circle cx="26.5" cy="5" r="1.3" fill="#fff3c4"/><circle cx="5" cy="24.5" r="1" fill="#fff3c4"/>'],
    ['love', '애정운', '<path d="M16 27.2s-10.5-6.2-10.5-13.4A5.6 5.6 0 0 1 16 10.4a5.6 5.6 0 0 1 10.5 3.4c0 7.2-10.5 13.4-10.5 13.4z" fill="#ffb7c8" stroke="#ff9db5" stroke-width="1.4" stroke-linejoin="round"/>' + ftFace(16, 16.2) + '<path d="M9.4 12.6a3 3 0 0 1 2.4-1.8" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".8"/>'],
    ['money', '금전운', '<circle cx="16" cy="16.5" r="11" fill="#bff0d9" stroke="#93dcbc" stroke-width="1.6"/><rect x="13.8" y="8.4" width="4.4" height="4.4" rx="1" fill="none" stroke="#7ccaa8" stroke-width="1.5"/>' + ftFace(16, 18.2) + '<path d="M8.2 12.4a8.6 8.6 0 0 1 3-3.4" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none" opacity=".8"/>'],
    ['work', '직장운', '<path d="M12.4 10.6V8.8a2.2 2.2 0 0 1 2.2-2.2h2.8a2.2 2.2 0 0 1 2.2 2.2v1.8" fill="none" stroke="#f3ad7f" stroke-width="2" stroke-linecap="round"/><rect x="5" y="10.4" width="22" height="16" rx="4.5" fill="#ffd3b0" stroke="#f9bc92" stroke-width="1.4"/><rect x="14.6" y="20.6" width="2.8" height="2.4" rx=".8" fill="#f3ad7f"/>' + ftFace(16, 16.2)],
    ['study', '학업운', '<rect x="7" y="4.8" width="18.5" height="22.4" rx="3.4" fill="#c4d8ff" stroke="#a9c4fb" stroke-width="1.4"/><path d="M11 4.8v22.4" stroke="#a9c4fb" stroke-width="1.6"/><path d="M21.5 4.8v6.4l-1.8-1.3-1.8 1.3V4.8" fill="#ffb7c8"/>' + ftFace(18.2, 17.4)],
    ['health', '건강운', '<path d="M16 10.4c-3-2.2-9.6-1.4-9.6 6 0 6.2 4.2 11 7.2 11 1.1 0 1.6-.6 2.4-.6s1.3.6 2.4.6c3 0 7.2-4.8 7.2-11 0-7.4-6.6-8.2-9.6-6z" fill="#cdeeb6" stroke="#ade09a" stroke-width="1.4" stroke-linejoin="round"/><path d="M16 10.2c.2-2.8 2.1-4.8 5-5-.2 2.9-2.1 4.8-5 5z" fill="#93d681"/><path d="M15.6 10.4c-.2-1.6-.8-2.8-1.8-3.6" stroke="#b58b6a" stroke-width="1.3" stroke-linecap="round" fill="none"/>' + ftFace(16, 18.4)]
  ];
  var FT_PERIODS = [['d0', '오늘'], ['d1', '내일'], ['wk', '이번 주'], ['mo', '이번 달']];
  var FT_GRP = {
    '비겁':{ total:'나와 비슷한 사람들과 어울리며 힘을 얻는 시기예요. 남과 비교하기보다 내 페이스를 지키는 게 가장 좋은 선택이에요.', love:'친구 같은 편안한 관계가 깊어지는 시기예요. 고집보다 맞장구가 사랑을 지켜요.', money:'지출과 경쟁이 함께 늘어나는 시기예요. 돈거래와 보증은 선을 분명히 그어 두세요.', work:'동료와 함께할 때 성과가 나는 시기예요. 공을 나누면 내 평가도 함께 올라가요.', study:'함께하는 공부가 잘 맞는 시기예요. 경쟁자가 오히려 좋은 자극이 돼요.', health:'체력이 받쳐 주는 시기예요. 다만 승부욕 때문에 무리하지 않게 조심해요.' },
    '식상':{ total:'아이디어와 말솜씨가 살아나는 시기예요. 표현할수록 운이 따라오니 생각만 하지 말고 꺼내 보세요.', love:'매력이 잘 드러나 새 인연이 생기기 쉬운 시기예요. 먼저 말을 거는 쪽이 유리해요.', money:'재능이 돈으로 이어지는 시기예요. 부업이나 작은 판매를 시작하기 좋아요.', work:'기획, 발표, 영업처럼 보여 주는 일에서 빛나는 시기예요.', study:'이해가 빠르고 정리를 잘하는 시기예요. 배운 걸 말로 설명해 보면 오래 남아요.', health:'기운을 많이 쓰는 시기라 쉽게 지칠 수 있어요. 잠을 충분히 챙겨요.' },
    '재성':{ total:'실속을 챙기기 좋은 시기예요. 계획해 둔 일을 숫자로 마무리해 보세요.', love:'마음과 현실이 함께 맞는 인연이 가까워지는 시기예요. 만남 계획을 구체적으로 세워 보세요.', money:'돈이 크게 움직이는 시기예요. 들어오는 만큼 지출 계획을 먼저 세워 두세요.', work:'성과가 숫자로 보이는 시기예요. 협상이나 정산을 하기 좋아요.', study:'공부보다 현실 일에 마음이 가기 쉬운 시기예요. 목표 점수를 정해 두면 집중이 돼요.', health:'바쁘게 움직이다 끼니를 거르기 쉬운 시기예요. 식사 시간을 지켜 주세요.' },
    '관성':{ total:'책임과 인정이 함께 오는 시기예요. 맡은 일을 끝까지 해내면 평가가 올라가요.', love:'관계가 진지해지는 시기예요. 미래 이야기를 꺼내 보기 좋아요.', money:'고정 수입이 안정되는 시기예요. 큰 투자보다 차곡차곡 쌓는 쪽이 이득이에요.', work:'승진, 합격, 발령처럼 자리가 바뀌는 기운이 들어오는 시기예요.', study:'시험과 평가에 강한 시기예요. 기출 문제로 실전 감각을 키워 보세요.', health:'긴장과 스트레스가 쌓이기 쉬운 시기예요. 어깨와 목을 자주 풀어 주세요.' },
    '인성':{ total:'도움과 배움이 들어오는 시기예요. 어른이나 선배의 조언에 답이 있어요.', love:'편안하게 기댈 수 있는 사람이 곁에 있는 시기예요. 조급함만 내려놓으면 돼요.', money:'돈보다 배움에 투자할수록 남는 시기예요. 자격증, 교육비는 아끼지 마세요.', work:'준비해 온 것이 문서로 결과가 나오는 시기예요. 계약과 서류 일에 좋아요.', study:'공부운이 가장 좋은 시기예요. 새 과목이나 자격증을 시작해 보세요.', health:'몸과 마음이 회복되는 시기예요. 푹 자고 잘 먹는 것만으로 충분해요.' }
  };
  var FT_LINE = {
    study:{ hi:['집중력이 좋아 어려운 부분도 술술 풀려요. 미뤄 둔 공부를 시작해 보세요.', '머리에 쏙쏙 들어오는 흐름이에요. 시험이나 발표 준비에 시간을 더 써 보세요.'], mid:['평소만큼 해내면 충분해요. 복습 위주로 차근차근 가요.', '큰 진도보다 정리가 잘 되는 흐름이에요. 노트를 한번 훑어보세요.'], lo:['집중이 쉽게 흩어져요. 25분 공부, 5분 휴식처럼 짧게 끊어 가세요.', '새로운 걸 외우기보다 아는 걸 다지는 게 좋아요.'] },
    health:{ hi:['몸이 가볍고 회복이 빨라요. 미뤄 둔 운동을 시작하기 좋아요.', '컨디션이 좋은 흐름이에요. 다만 무리한 일정은 피해 주세요.'], mid:['무난한 컨디션이에요. 물을 자주 마시고 스트레칭을 챙겨요.', '큰 탈은 없지만 저녁에는 일찍 쉬어 주세요.'], lo:['피로가 쌓이기 쉬워요. 카페인은 줄이고 일찍 자요.', '몸이 보내는 신호에 귀 기울여요. 무거운 운동보다 가벼운 산책이 좋아요.'] }
  };
  var FT_SB = { '비겁':[70, 82], '식상':[78, 68], '재성':[62, 72], '관성':[76, 64], '인성':[88, 80] };
  function ftHash(s){ var h = 2166136261; for (var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; }
  function ftBand(v){ return v >= 85 ? 'hi' : v >= 70 ? 'mid' : 'lo'; }
  var ftCache = {};
  function ftDay(me, r, d){
    var key = me.id + '|' + me.y + me.m + me.d + '|' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    if (ftCache[key]) return ftCache[key];
    var f = DAILY.today(me, r, d), g = TEN_TO_GROUP[f.ten], STR = ['장생','관대','건록','제왕'], WK = ['병','사','묘','절'];
    var st = STR.indexOf(f.stage) > -1 ? 4 : WK.indexOf(f.stage) > -1 ? -4 : 0, j1 = ftHash(key + '|s'), j2 = ftHash(key + '|h');
    var study = Math.max(42, Math.min(99, Math.round(FT_SB[g][0] + st + (f.rel === 'chung' ? -6 : 0) + j1 * 12 - 6)));
    var health = Math.max(42, Math.min(99, Math.round(FT_SB[g][1] + st * 1.5 + (f.rel === 'chung' ? -8 : f.rel === 'hap' ? 3 : 0) + j2 * 12 - 6)));
    var v = { total:f.total, love:f.scores.l, money:f.scores.w, work:f.scores.j, study:study, health:health };
    return (ftCache[key] = { d:d, f:f, g:g, v:v });
  }
  var WDK = ['일','월','화','수','목','금','토'];
  function ftPeriod(me, r, pk){
    var now = nowD(), base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (pk === 'd0' || pk === 'd1'){
      var dd = new Date(base); if (pk === 'd1') dd.setDate(dd.getDate() + 1);
      var x = ftDay(me, r, dd), f = x.f, G = FT_GRP[x.g], day = function(s){ return s.replace(/시기/g, '날'); };
      var pick2 = function(a, k){ return a[Math.floor(ftHash(me.id + '|' + dd.toDateString() + '|' + k) * a.length)]; };
      return { title:(dd.getMonth() + 1) + '월 ' + dd.getDate() + '일 ' + WDK[dd.getDay()] + '요일', sub:f.pillars.day.hanja + '日 · ' + f.ten + '의 날', v:x.v, t:{
        total:f.head + '. ' + f.body, love:f.lines.l + ' ' + day(G.love), money:f.lines.w + ' ' + day(G.money), work:f.lines.j + ' ' + day(G.work),
        study:pick2(FT_LINE.study[ftBand(x.v.study)], 's') + ' ' + day(G.study), health:pick2(FT_LINE.health[ftBand(x.v.health)], 'h') + ' ' + day(G.health) } };
    }
    var days = [], grp, ttl, sub;
    if (pk === 'wk'){
      var mon = new Date(base); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      for (var i = 0; i < 7; i++){ var w = new Date(mon); w.setDate(w.getDate() + i); days.push(ftDay(me, r, w)); }
      var cnt = {}; days.forEach(function(x){ cnt[x.g] = (cnt[x.g] || 0) + 1; });
      grp = Object.keys(cnt).sort(function(a, b){ return cnt[b] - cnt[a]; })[0];
      var sun = days[6].d; ttl = (mon.getMonth() + 1) + '월 ' + mon.getDate() + '일 ~ ' + (sun.getMonth() + 1) + '월 ' + sun.getDate() + '일'; sub = '이번 주는 ' + grp + '의 기운이 많아요';
    } else {
      var Y = base.getFullYear(), M = base.getMonth(), n = new Date(Y, M + 1, 0).getDate();
      for (var dd2 = 1; dd2 <= n; dd2++) days.push(ftDay(me, r, new Date(Y, M, dd2)));
      var mp = MS.calc({ y:Y, m:M + 1, d:15, cal:'solar', unknownTime:true, gender:'M', lonCorr:false }).pillars.month;
      grp = TEN_TO_GROUP[MS.tenGod(r.pillars.day.stem, mp.stem)];
      ttl = Y + '년 ' + (M + 1) + '월'; sub = mp.hanja + '월 · ' + grp + '의 달';
    }
    var v = {}, t = {}, lbl = function(x){ return pk === 'wk' ? WDK[x.d.getDay()] + '요일(' + x.d.getDate() + '일)' : x.d.getDate() + '일'; };
    FT_CATS.forEach(function(c){
      var k = c[0], avg = Math.round(days.reduce(function(s, x){ return s + x.v[k]; }, 0) / days.length);
      var srt = days.slice().sort(function(a, b){ return b.v[k] - a.v[k] || a.d - b.d; });
      var good = pk === 'wk' ? [srt[0]] : srt.slice(0, 3).sort(function(a, b){ return a.d - b.d; }), bad = srt[srt.length - 1];
      v[k] = avg;
      t[k] = (pk === 'wk' ? '이번 주는 ' : '이번 달은 ') + FT_GRP[grp][k] +
        ' ' + c[1] + '이 가장 좋은 날은 ' + good.map(lbl).join(', ') + '이고, 한 박자 쉬어 갈 날은 ' + lbl(bad) + '이에요.';
    });
    return { title:ttl, sub:sub, v:v, t:t };
  }
  var ftSel = { p:'d0', c:'total' };
  function ftHTML(me, r){
    var P = ftPeriod(me, r, ftSel.p), C = FT_CATS.filter(function(c){ return c[0] === ftSel.c; })[0];
    var more = ftSel.p === 'd0' && { love:'love', money:'money', work:'career' }[ftSel.c];
    return '<div class="ft-tabs" role="tablist" aria-label="운세 기간">' + FT_PERIODS.map(function(p){ return '<button type="button" role="tab" data-ftp="' + p[0] + '" aria-selected="' + (p[0] === ftSel.p) + '">' + p[1] + '</button>'; }).join('') + '</div>' +
      '<div class="ft-cats" role="tablist" aria-label="운세 분야">' + FT_CATS.map(function(c, i){ return '<button type="button" role="tab" class="ftc-' + c[0] + '" data-ftc="' + c[0] + '" aria-selected="' + (c[0] === ftSel.c) + '"><i aria-hidden="true"><svg viewBox="0 0 32 32">' + c[2] + '</svg></i><span>' + c[1] + '</span></button>'; }).join('') + '</div>' +
      '<div class="ft-body" aria-live="polite"><div class="ft-head"><span><small>' + P.title + ' · ' + P.sub + '</small><b>' + C[1] + '</b></span><em data-tier="' + tierOf(P.v[ftSel.c]) + '">' + P.v[ftSel.c] + '<small>점</small></em></div>' +
      '<p>' + (ftSel.c === 'total' && ftSel.p === 'd0' ? esc(me.name) + '님, ' : '') + P.t[ftSel.c] + '</p>' +
      (more ? '<button type="button" class="ft-more" data-cat="' + more + '">' + C[1] + ' 자세히 보기 · 타고난 그릇과 올해 흐름 ›</button>' : '') + '</div>';
  }
  function bindFt(me, r){
    var box = $('ftBox'); if (!box) return;
    var re = function(){ box.innerHTML = ftHTML(me, r); bindFt(me, r); };
    box.querySelectorAll('[data-ftp]').forEach(function(b){ b.onclick = function(){ ftSel.p = b.dataset.ftp; re(); }; });
    /* 분야 버튼은 다시 그리지 않고 선택만 바꾼다 → 커지고 양옆이 밀리는 전환이 보인다. 아래 본문만 새로 */
    var bindMore = function(){ var m = box.querySelector('.ft-more'); if (m) m.onclick = function(){ openCat(me, r, m.dataset.cat); }; };
    box.querySelectorAll('[data-ftc]').forEach(function(b){ b.onclick = function(){
      if (ftSel.c === b.dataset.ftc) return;
      ftSel.c = b.dataset.ftc;
      box.querySelectorAll('[data-ftc]').forEach(function(x){ x.setAttribute('aria-selected', String(x === b)); });
      var t = document.createElement('div'); t.innerHTML = ftHTML(me, r);
      var nb = t.querySelector('.ft-body'), ob = box.querySelector('.ft-body'); if (nb && ob) ob.replaceWith(nb);
      bindMore();
    }; });
    bindMore();
  }
  /* =========================================================
     홈 상품 카드 (2026-11-23 헬로우봇 분석 → 기능 이름 대신 궁금해지는 제목 + 썸네일로 다시 포장)
     별점·이용자 수는 실데이터가 없어서 쓰지 않는다. 가격 옆에는 무료로 보이는 범위를 적는다
     ========================================================= */
  var HOME_P = {
    tj:{ k:TJ_YEAR + ' · 丁未', t:'내 한 해<br>토정비결', s:'열두 달 괘로 보는 ' + TJ_YEAR + '년', pose:'u-newyear', th:'red', free:'총평 무료', p:'tj' },
    sal:{ k:'NEW · ' + TJ_YEAR, t:'나에게 든<br>살(煞) 풀이', s:'내 사주 속 살과 푸는 법', pose:'u-thinking', th:'plum', free:'1개 무료', p:'sal', tag:'도화·역마·홍염…' },
    fc:{ k:TJ_YEAR + ' 달력', t:'사랑·돈·일<br>골든타이밍', s:'좋은 달과 조심할 달 찾기', pose:'u-calendar', th:'blue', free:'이번 달 무료', p:'cal' },
    ny:{ k:TJ_YEAR + ' 신년운세', t:'정미년<br>내 한 해', s:'12개월 흐름 · 키워드', pose:'u-newyear', th:'gold', free:'총평 무료', p:'' },
    wl:{ k:'NEW · 평생 리포트', t:'내 재물<br>그릇', s:'평생 돈 흐름 · 들어오는 시기 3번', pose:'u-money', th:'gold', free:'1장 무료', p:'wl' },
    gw:{ k:'NEW · 귀인', t:'나를 돕는 귀인 풀이', s:'도와줄 띠·일간 · 2027 귀인 오는 달', pose:'wooni-joa', th:'teal', free:'1개 무료', p:'gw', tag:'천을·천덕·문창…' },
    book:{ t:'사주 이야기책', s:'내 사주를 6장 이야기로', pose:'u-book', th:'violet', free:'1장 무료', p:'ez' },
    gh:{ t:'우리 둘 3단 궁합', s:'성격 · 연애 · 결혼 궁합', pose:'wooni-joa', th:'rose', free:'점수 무료', p:'gh' },
    tk:{ t:'중요한 날 잡기', s:'개업 · 이사 · 계약 좋은 날', pose:'u-work', th:'gold', free:'두 달 무료', p:'tk' },
    lv:{ t:'인연이 오는 해와 달', s:'10년 연애·결혼 시기', pose:'joa-love', th:'navy', free:'요약 무료', p:'lv' },
    job:{ t:'나에게 맞는 일', s:'타고난 재능과 분야', pose:'u-work', th:'teal', free:'', p:'cat' }
  };
  function homeCardHTML(k, kind){
    var P = HOME_P[k], price = P.p ? priceTag(P.p) : '';
    if (kind === 'car') return '<button type="button" class="hp-card" role="listitem" data-hp="' + k + '"><span class="hp-th th-' + P.th + '"><em>' + P.k + '</em><strong>' + P.t + '</strong>' + uniImg(P.pose) + (P.tag ? '<i class="hp-tag">' + P.tag + '</i>' : '') + '</span>' +
      '<span class="hp-s">' + P.s + '</span><span class="hp-pr"><span class="f">' + P.free + '</span>' + (price ? ' · <b>' + price + '</b>' : '') + '</span></button>';
    return '<button type="button" class="hp-row" data-hp="' + k + '"><span class="hp-th sm th-' + P.th + '">' + uniImg(P.pose) + '</span><span class="hp-rt"><b>' + P.t + '</b><small>' + P.s + '</small></span>' +
      '<span class="hp-pz">' + (price ? '<b>' + price + '</b>' : '') + (P.free ? '<span>' + P.free + '</span>' : '') + '</span></button>';
  }
  /* 아이콘 메뉴 2×5: 고민 단위로 바로 들어가기 */
  var HOME_GRID = [
    ['saju', '사주 풀이', '<rect x="3.5" y="4" width="17" height="16" rx="3"/><path d="M8 4v16M12 4v16M16 4v16M3.5 12h17"/>'],
    ['lv', '연애·결혼', '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>'],
    ['gh', '궁합', '<circle cx="9" cy="12" r="5.2"/><circle cx="15" cy="12" r="5.2"/>'],
    ['wl', '재물 그릇', '<ellipse cx="12" cy="7.5" rx="7" ry="3"/><path d="M5 7.5v4.2c0 1.7 3.1 3 7 3s7-1.3 7-3V7.5M5 11.7v4.2c0 1.7 3.1 3 7 3s7-1.3 7-3v-4.2"/>', 'NEW'],
    ['sal', '살 풀이', '<path d="M12 3.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.8l5-.7z"/><path d="M12 19v2"/>', 'NEW'],
    ['tj', '토정비결', '<path d="M6.5 3.5h11v17l-5.5-3-5.5 3z"/><path d="M9.5 8h5M9.5 11h5"/>'],
    ['fc', '운세 달력', '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'],
    ['tk', '중요한 날', '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'],
    ['job', '맞는 일', '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17"/>'],
    ['all', '전체 보기', '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>']
  ];
  function homeGridHTML(){
    return '<nav class="hp-grid" aria-label="풀이 바로가기">' + HOME_GRID.map(function(x){
      return '<button type="button" data-hp="' + x[0] + '">' + (x[3] ? '<em class="hp-new">' + x[3] + '</em>' : '') + '<i aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + x[2] + '</svg></i><span>' + x[1] + '</span></button>';
    }).join('') + '</nav>';
  }
  function bindHomeP(me, r, root){
    var A = {
      saju:function(){ go('saju'); window.scrollTo(0, 0); }, lv:function(){ openLoveTiming(me, r); }, gh:function(){ go('gunghap'); window.scrollTo(0, 0); },
      wl:function(){ openWealth(me, r); }, sal:function(){ openSal(me, r); }, gw:function(){ openGuin(me, r); }, tj:function(){ openTojeong(me, r); }, fc:function(){ openFortuneCal(me, r, 0); },
      tk:function(){ openTaekil(me, r); }, job:function(){ openCat(me, r, 'job'); }, all:function(){ openTopics(me, r); },
      ny:function(){ openNYSheet(me, r); }, book:function(){ openStory(me, r, 0); }
    };
    /* 아이콘 메뉴는 바로 열고, 상품 카드(캐러셀·목록·추천)는 상세 시트를 먼저 */
    root.querySelectorAll('[data-hp]').forEach(function(b){ b.onclick = function(){ var k = b.dataset.hp, fn = A[k]; if (!fn) return; if (b.closest('.hp-grid')) fn(); else openHomeDetail(k, me, r, fn); }; });
  }
  /* 상품 상세 시트: 홈에서 유료 콘텐츠를 누르면 결제 전에 '무엇이 들어 있는지'(구성·무료 범위·목차)를 먼저 보여 준다.
     이미 산 콘텐츠·패스 기간에는 바로 연다 */
  var HOME_PD = {
    wl:{ h:'내 재물 그릇은 얼마나 클까?', d:'사주 속 재물·재능의 별과 10년마다 바뀌는 대운으로 평생 돈 흐름을 읽어요. 돈이 모이는 방식과 크게 들어오는 시기 3번을 알려 드려요.', m:['6장', '구성'], fr:['1장', '무료로 읽기'], toc:['내 재물 그릇의 모양', '돈이 들어오는 길 · 새는 길', '평생 재물 흐름 그래프', '크게 들어오는 시기 3번', '나에게 맞는 돈 버는 방식', TJ_YEAR + '년 재물 처방'], nf:1, cta:'1장 무료로 읽어 보기' },
    sal:{ h:'내 사주에는 어떤 살이 들었을까?', d:'도화·홍염·역마·화개·백호·괴강·양인·원진까지 내 사주에 든 살을 찾고, 살마다 강점과 조심할 점, 복으로 바꾸는 살풀이를 알려 드려요.', m:['8가지', '살 확인'], fr:['1개', '무료로 읽기'], toc:['내 사주에 든 살 한눈에', '첫 번째 살 풀이', '나머지 살의 강점 · 조심할 점', '살마다 살풀이', TJ_YEAR + '년 정미년에 들어오는 살'], nf:2, cta:'무료로 내 살 확인하기' },
    gw:{ h:'나를 돕는 귀인은 누구일까?', d:'천을·천덕·월덕·문창·학당·태극·암록·금여 가운데 내 사주에 든 귀인을 찾아 옛풀이와 요즘풀이로 읽어요. 나를 돕는 띠·일간·성향과 ' + TJ_YEAR + '년 귀인이 오는 달까지 알려 드려요.', m:['8가지', '귀인 확인'], fr:['1개', '무료로 읽기'], toc:['내 사주에 든 귀인 한눈에', '첫 번째 귀인 풀이', '나머지 귀인 · 옛풀이와 요즘풀이', '나를 돕는 사람 · 띠·일간·성향', TJ_YEAR + '년 귀인이 오는 달 · 방향·장소'], nf:2, cta:'무료로 내 귀인 확인하기' },
    tj:{ h:TJ_YEAR + '년 내 한 해 토정비결', d:'음력 생년월일과 ' + TJ_YEAR + '년 간지로 괘를 지어 한 해를 풀어요. 총평과 1~3월은 무료예요.', m:['12달', '구성'], fr:['총평', '무료로 읽기'], toc:['한 해 괘와 총평', '1~3월 달마다 한 줄', '상반기 · 하반기 풀이', '4~12월 달마다 한 줄', '좋은 달 · 조심할 달 · 한 해 처방'], nf:2, cta:'총평 무료로 보기' },
    fc:{ h:'사랑·돈·일 골든타이밍', d:'오늘의 운세와 같은 계산으로 날마다 점수를 매겨 달력에 담았어요. 이번 달은 무료, 다음 달부터 12개월은 잠금이에요.', m:['12개월', '달력'], fr:['이번 달', '무료로 보기'], toc:['이번 달 날마다 점수', '좋은 날 · 조심할 날', '다음 달부터 12개월', '달마다 흐름 한 줄'], nf:2, cta:'이번 달 무료로 보기' },
    lv:{ h:'인연은 언제 가까워질까?', d:'해마다 들어오는 기운과 배우자 자리(일지)로 10년 동안 연애운·결혼운을 그래프로 보여 드려요.', m:['10년', '그래프'], fr:['요약', '무료로 읽기'], toc:['나의 연애 스타일', '배우자 자리', '올해 인연운', '10년 연애·결혼 그래프', '인연이 가장 가까운 해 · ' + TJ_YEAR + '년 인연 달', '나와 잘 맞는 사람'], nf:3, cta:'요약 무료로 보기' },
    book:{ h:'우니가 읽어 주는 사주 이야기책', d:'어려운 한자 없이 내 사주를 여섯 장의 이야기로 풀어 드려요. 1장은 무료로 읽을 수 있어요.', m:['6장', '이야기'], fr:['1장', '무료로 읽기'], toc:['1장 나의 하늘 · 원국과 일간', '2장 기둥마다 들여다보기', '3장 내 안의 다섯 가지 힘', '4장 나를 돕는 귀인과 특별한 별', '5장 10년 계절(대운)', '6장 올해와 이번 달'], nf:1, cta:'1장 무료로 읽어 보기' },
    gh:{ h:'우리 둘 3단 궁합', d:'두 사람의 생년월일로 성격·연애·결혼 궁합을 봐요. 궁합 점수는 무료, 상세 리포트는 한 쌍마다 열려요.', m:['3단', '궁합'], fr:['점수', '무료로 보기'], toc:['궁합 점수와 한 줄', '두 사람의 기질 비교', '빛나는 점 · 부딪히기 쉬운 점', '대화 팁과 올해 두 사람의 흐름'], nf:1, cta:'궁합 보러 가기' },
    tk:{ h:'중요한 날 잡기', d:'개업·이사·계약·면접처럼 중요한 일정을 내 사주와 맞는 날로 골라 드려요. 이번 달과 다음 달은 무료예요.', m:['12개월', '달력'], fr:['두 달', '무료로 보기'], toc:['목적 고르기', '이번 달 · 다음 달 길한 날', '12개월 전체 달력', '1년 베스트 5일과 시간대', '캘린더 저장 · 공유 카드'], nf:2, cta:'두 달 무료로 보기' }
  };
  function openHomeDetail(k, me, r, go2){
    var P = HOME_P[k], D = HOME_PD[k];
    if (!D || (P.p && (owns(P.p) || passActive()))){ go2(); return; }
    openSheet('<div class="pd-sheet"><div class="hp-th pd-hero th-' + P.th + '"><em>' + (P.k || '우니조아 풀이') + '</em><strong>' + (P.t.indexOf('<br>') > -1 ? P.t : P.t.replace(' ', '<br>')) + '</strong>' + uniImg(P.pose) + '</div>' +
      '<h3 id="sheetTitle" class="pd-h">' + D.h + '</h3><p class="pd-d">' + D.d + '</p>' +
      '<div class="pd-meta"><div><b>' + D.m[0] + '</b>' + D.m[1] + '</div><div><b>' + D.fr[0] + '</b>' + D.fr[1] + '</div><div><b>' + (P.p ? priceTag(P.p) : '무료') + '</b>' + (P.p ? '전체 열기' : '') + '</div></div>' +
      '<ul class="pd-toc">' + D.toc.map(function(t, i){ return '<li><em>' + (i + 1) + '</em>' + t + '<span class="' + (i < D.nf ? 'f' : '') + '">' + (i < D.nf ? '무료' : '잠금') + '</span></li>'; }).join('') + '</ul>' +
      '<button class="btn-primary btn-block sheen" id="pdGo">' + D.cta + '</button><button class="text-btn" data-close>나중에 볼게요</button></div>');
    $('pdGo').onclick = function(){ closeSheet(); setTimeout(go2, 260); };
  }
  /* 우니와 매일: 출석 줄 + [오늘 할 일 · 꾹 뽑기 · 우니 키우기] 탭 한 장. 모든 부품은 DOM 에 그대로 두고 보이기만 바꾼다(바인딩 유지) */
  var dailyTab = 'todo';
  function dailyBoxHTML(me, nums, elc, newly){
    var T = [['todo', '오늘 할 일'], ['peek', '꾹 뽑기'], ['pet', '우니 키우기']];
    return '<section class="home-sec daily-box"><div class="hs-head"><h2 class="sec-title">우니와 매일</h2><button type="button" class="hs-link" id="dpSet">엽전 ' + (isGuest() ? '0' : getCoins().toLocaleString()) + '닢 ›</button></div>' +
      '<div class="db-card">' + attStripHTML(newly) +
      '<div class="db-tabs" role="tablist">' + T.map(function(t){ return '<button type="button" role="tab" data-db="' + t[0] + '" aria-selected="' + (t[0] === dailyTab) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="db-pane" data-dbp="todo"' + (dailyTab === 'todo' ? '' : ' hidden') + '>' + todoCardHTML() + '</div>' +
      '<div class="db-pane" data-dbp="peek"' + (dailyTab === 'peek' ? '' : ' hidden') + '>' + peekCardHTML(me, nums, elc) + '</div>' +
      '<div class="db-pane" data-dbp="pet"' + (dailyTab === 'pet' ? '' : ' hidden') + '>' + petCardHTML() + '</div></div></section>';
  }
  function setDailyTab(t){
    dailyTab = t;
    document.querySelectorAll('[data-db]').forEach(function(b){ b.setAttribute('aria-selected', b.dataset.db === t); });
    document.querySelectorAll('[data-dbp]').forEach(function(p){ p.hidden = p.dataset.dbp !== t; });
  }
  function bindDailyBox(){ document.querySelectorAll('[data-db]').forEach(function(b){ b.onclick = function(){ setDailyTab(b.dataset.db); }; }); }
  function moreMenuHTML(me, home){
    var M = [
      ['btnTj', 'u-book', '토정비결', '음력 생일로 뽑는 한 해 괘', 'NEW'],
      ['btnFc', 'u-calendar', '월별 운세 달력', '이번 달 좋은 날 무료', ''],
      ['btnLv', 'joa-love', '연애·결혼 시기', '인연이 오는 해 찾기', ''],
      ['btnChat', 'u-thinking', '우니에게 묻기', '사주 AI 해석 · 하루 1번 무료', 'AI']
    ];
    if (home) M = M.concat([['btnMmGh', 'uj-hands', '궁합', '둘의 합은 몇 점일까?', ''], ['btnMmJob', 'u-work', '나에게 맞는 직업', '타고난 재능과 분야', '']]);
    return '<div class="more-menu">' + M.map(function(x){
      return '<button type="button" class="mm-tile" id="' + x[0] + '"><span class="mm-ic" aria-hidden="true">' + uniImg(x[1]) + '</span><span class="mm-t"><b>' + x[2] + (x[4] ? '<em>' + x[4] + '</em>' : '') + '</b><small>' + x[3] + '</small></span></button>';
    }).join('') + '</div>';
  }
  function bindMoreMenu(me, r, root){
    var q = function(id){ return root.querySelector('#' + id); }, on = function(id, fn){ var b = q(id); if (b) b.onclick = fn; };
    on('btnTj', function(){ openTojeong(me, r); });
    on('btnFc', function(){ openFortuneCal(me, r, 0); });
    on('btnLv', function(){ openLoveTiming(me, r); });
    on('btnChat', function(){ openChat(me, r); });
    on('btnMmGh', function(){ go('gunghap'); window.scrollTo(0, 0); });
    on('btnMmJob', function(){ openCat(me, r, 'job'); });
  }

  /* ---------- 월별 운세 달력 (cal) ----------
     하루하루 점수는 오늘의 운세와 같은 DAILY.today 로 계산 → 달력과 오늘 화면의 점수가 항상 같다.
     무료: 이번 달 전체 / 유료(cal): 다음 달부터 11개월 + 달마다 흐름 한 줄 */
  var FC_MON = {
    '비겁':'친구·동료와 함께 움직이면 힘이 붙는 달이에요. 돈 거래와 보증은 선을 그어 두세요.',
    '식상':'아이디어와 말솜씨가 살아나는 달이에요. 기획, 발표, 새 취미를 시작하기 좋아요.',
    '재성':'돈과 실속이 움직이는 달이에요. 정산, 협상, 부수입을 챙기기 좋아요.',
    '관성':'책임과 인정이 함께 오는 달이에요. 맡은 일을 끝까지 해내면 평가가 올라가요.',
    '인성':'도움과 배움이 들어오는 달이에요. 공부, 자격증, 어른의 조언에 답이 있어요.'
  };
  var fcCache = {};
  function fcMonth(me, r, y, m){
    var key = me.id + '|' + y + '-' + m;
    if (fcCache[key]) return fcCache[key];
    var n = new Date(y, m, 0).getDate(), days = [];
    for (var d = 1; d <= n; d++){ var f = DAILY.today(me, r, new Date(y, m - 1, d)); days.push({ d:d, f:f, t:f.total }); }
    var mp = MS.calc({ y:y, m:m, d:15, cal:'solar', unknownTime:true, gender:'M', lonCorr:false }).pillars.month;
    var g = TEN_TO_GROUP[MS.tenGod(r.pillars.day.stem, mp.stem)];
    var sorted = days.slice().sort(function(a, b){ return b.t - a.t; });
    /* 점수 구간은 그달 안에서 상대적으로: 위 20% 금색, 아래 15% 쉬어 갈 날 */
    var hiT = sorted[Math.floor(n * .2)].t, loT = sorted[n - Math.ceil(n * .15)].t, avg = Math.round(days.reduce(function(s, x){ return s + x.t; }, 0) / n);
    days.forEach(function(x){ x.tier = x.t > hiT || (x.t === hiT && x.t >= avg + 4) ? 'gold' : x.t <= loT ? 'rose' : x.t >= avg ? 'violet' : 'mint'; });
    /* 이번 달은 남은 날 중에서 좋은 날·조심할 날을 고른다 */
    var nd = nowD(), left = (nd.getFullYear() === y && nd.getMonth() + 1 === m) ? sorted.filter(function(x){ return x.d >= nd.getDate(); }) : sorted;
    if (left.length < 6) left = sorted;
    return (fcCache[key] = { y:y, m:m, days:days, mp:mp, g:g, best:left.slice(0, 3), care:left.slice(-3).reverse(), avg:avg });
  }
  function openFortuneCal(me, r, off, selD){
    setTimeout(function(){ bond('today'); }, 900);
    var open = owns('cal') || passActive(), now = nowD(), base = new Date(now.getFullYear(), now.getMonth() + off, 1);
    var y = base.getFullYear(), m = base.getMonth() + 1, locked = off > 0 && !open;
    var C = fcMonth(me, r, y, m), first = new Date(y, m - 1, 1).getDay();
    var isNow = off === 0, today = now.getDate();
    if (selD == null) selD = isNow ? today : C.best[0].d;
    var tabs = '';
    for (var i = 0; i < 12; i++){
      var bd = new Date(now.getFullYear(), now.getMonth() + i, 1), lk = i > 0 && !open;
      tabs += '<button type="button" data-fcm="' + i + '"' + (i === off ? ' aria-selected="true"' : '') + (lk ? ' class="lk"' : '') + '><b>' + (bd.getMonth() + 1) + '월</b>' + (lk ? '<i>' + LOCK_SVG + '</i>' : i === 0 ? '<i>무료</i>' : '') + '</button>';
    }
    var cells = '';
    for (var k = 0; k < first; k++) cells += '<span></span>';
    C.days.forEach(function(x){
      var best = C.best.some(function(b){ return b.d === x.d; });
      cells += '<button type="button" class="fc-d' + (best ? ' best' : '') + (x.d === selD && !locked ? ' sel' : '') + (isNow && x.d === today ? ' now' : '') + '" data-fcd="' + x.d + '" data-tier="' + x.tier + '"><b>' + x.d + '</b><small>' + x.t + '</small></button>';
    });
    var S = C.days[selD - 1], sf = S.f, wd = new Date(y, m - 1, selD).getDay();
    var dayBox = locked ? '' : '<div class="fc-day"><div class="fc-day-h"><b>' + m + '월 ' + selD + '일 ' + WD[wd] + '요일</b><span class="tier-tag" data-tier="' + S.tier + '">' + S.t + '점 · ' + ({ gold:'좋은 날', violet:'괜찮은 날', mint:'보통인 날', rose:'쉬어 갈 날' })[S.tier] + '</span></div>' +
      '<h4>' + sf.head + '</h4><p class="helper">' + sf.pillars.day.hanja + '日 · ' + sf.ten + '의 날</p>' + scoreRowsHTML(sf) + '</div>';
    var list = function(a){ return a.map(function(x){ return m + '/' + x.d + '(' + WD[new Date(y, m - 1, x.d).getDay()] + ')'; }).join(', '); };
    openSheet('<div class="fc-sheet"><div class="sheet-fig">' + uniImg('u-calendar') + '</div>' +
      '<h3 id="sheetTitle">' + esc(me.name) + '님의 월별 운세 달력</h3>' +
      '<p class="helper" style="margin:-4px 0 12px">날마다 일진과 내 사주의 관계로 매긴 점수예요. 날짜를 누르면 그날 풀이가 보여요.</p>' +
      '<p class="fc-trust">점수는 날짜마다 정해져 있어 언제 다시 봐도 같고, 그날 홈의 오늘 운세 점수와도 같아요.' + (isNow ? ' ★ 추천은 이번 달 남은 날 중에서 골라요.' : '') + '</p>' +
      '<div class="tk-months fc-months" role="tablist">' + tabs + '</div>' +
      '<div class="fc-msum"><b>' + y + '년 ' + m + '월 · ' + C.mp.hanja + '月</b>' +
        (locked ? '<p class="tj-blur" aria-hidden="true">' + FC_MON[C.g] + '</p>' : '<p>' + FC_MON[C.g] + ' 이달 평균 ' + C.avg + '점.</p>') + '</div>' +
      '<div class="tk-cal fc-cal' + (locked ? ' locked' : '') + '"><div class="tk-wd"><span class="sun">일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span class="sat">토</span></div>' +
        '<div class="tk-grid">' + cells + '</div>' +
        (locked ? '<div class="tk-cal-lock">' + LOCK_SVG + '<b>' + m + '월 달력은 잠겨 있어요</b><small>이번 달은 무료, 12개월 전체는 한 번 결제로 계속 봐요</small></div>' : '') + '</div>' +
      '<div class="tk-legend"><span data-tier="gold"><i></i>아주 좋은 날</span><span data-tier="rose"><i></i>쉬어 갈 날</span><span class="star"><i>★</i>추천 3일</span></div>' +
      (locked ? '' : '<div class="fc-picks"><p><b>좋은 날</b> ' + list(C.best) + '</p><p><b>조심할 날</b> ' + list(C.care) + '</p></div>') +
      dayBox +
      (locked || (!open && isNow) ? '<div class="tj-buy"><b>다음 달부터 12개월 달력과 달마다 흐름까지</b>' + passLinkHTML() + '<button class="btn-primary btn-block sheen" id="btnFcBuy">12개월 달력 열기 · ' + priceTag('cal') + '</button></div>' : adSlotHTML('운세 달력을 본 뒤')) +
      '<p class="disclaimer">운세 달력은 사주와 일진으로 계산한 재미용 참고 콘텐츠예요. 중요한 일은 직접 판단해 주세요. 큰일 날짜를 고를 땐 ‘중요한 날 잡기’를 써 보세요.</p>' +
      '<button class="text-btn" data-close>닫기</button></div>');
    document.querySelectorAll('[data-fcm]').forEach(function(b){ b.onclick = function(){ openFortuneCal(me, r, +b.dataset.fcm); }; });
    if (!locked) document.querySelectorAll('[data-fcd]').forEach(function(b){ b.onclick = function(){ var st = $('sheet').scrollTop; openFortuneCal(me, r, off, +b.dataset.fcd); $('sheet').scrollTop = st; }; });
    if ($('btnFcBuy')) $('btnFcBuy').onclick = function(){ closeSheet(); setTimeout(function(){ openPaySheet('cal', { who:esc(me.name) + '님', onPaid:function(){ openFortuneCal(me, r, off || 1); } }); }, 260); };
  }

  /* ---------- 연애·결혼 시기 (lv) ----------
     그해 세운의 천간이 내 일간에게 무엇인지(여성: 관성=남자·결혼 별, 남성: 재성=여자·결혼 별),
     세운 지지와 배우자 자리(일지)의 합·충, 도화(인연 끌림) 해를 더해 해마다 연애운·결혼운을 매긴다. 랜덤 없음. */
  var LV_STYLE = [
    '큰 나무처럼 곧은 사랑을 해요. 한번 마음을 주면 오래가고, 상대에게 믿음직한 기둥이 되어 줘요. 자존심 때문에 먼저 연락을 못 하는 게 아쉬운 점이에요.',
    '덩굴꽃처럼 다정하게 스며드는 사랑을 해요. 작은 배려를 잘 알아채고 분위기를 부드럽게 만들어요. 상대에게 맞추다 내 마음을 숨기지 않게 조심하세요.',
    '한여름 햇살처럼 화끈하고 솔직한 사랑을 해요. 좋으면 바로 표현하고 데이트도 늘 즐거워요. 빨리 뜨거워진 만큼 식지 않게 속도를 맞춰 보세요.',
    '촛불처럼 은은하고 깊은 사랑을 해요. 상대의 마음을 섬세하게 읽고 따뜻하게 감싸 줘요. 혼자 서운함을 쌓지 말고 말로 꺼내는 연습이 필요해요.',
    '큰 산처럼 듬직하고 변함없는 사랑을 해요. 화려하진 않아도 곁에 있으면 편안한 사람이에요. 표현이 적어 오해받기 쉬우니 가끔은 말로 마음을 전해 주세요.',
    '기름진 밭처럼 챙겨 주고 길러 주는 사랑을 해요. 상대의 생활까지 살뜰히 돌봐요. 다 해 주다 지치지 않게 받는 연습도 해 보세요.',
    '단단한 쇠처럼 분명하고 의리 있는 사랑을 해요. 약속을 지키고 아닌 건 아니라고 말해요. 날카로운 말이 상처가 되지 않게 부드럽게 다듬으면 좋아요.',
    '빛나는 보석처럼 섬세하고 취향이 분명한 사랑을 해요. 센스 있는 연애를 하고 특별한 순간을 잘 만들어요. 완벽을 바라다 스스로 지치지 않게 조심하세요.',
    '넓은 바다처럼 자유롭고 품이 넓은 사랑을 해요. 대화가 잘 통하고 상대를 크게 품어 줘요. 마음이 넓은 만큼 한곳에 머무는 약속이 중요해요.',
    '이슬비처럼 조용히 젖어 드는 사랑을 해요. 눈치가 빠르고 공감을 잘해 상대가 편하게 기대요. 걱정이 많아질 땐 혼자 상상하지 말고 직접 물어보세요.'
  ];
  var LV_SPOUSE = ['자기 생각이 뚜렷하고 앞장서는 사람','다정하고 손재주 좋은 사람','밝고 에너지가 넘치는 사람','따뜻하고 감성이 풍부한 사람','듬직하고 믿음직한 사람','자상하고 살림 감각이 좋은 사람','의리 있고 결단력 있는 사람','깔끔하고 센스 있는 사람','시원시원하고 마음이 넓은 사람','차분하고 배려 깊은 사람'];
  var LV_PALACE = ['자(子) · 생각이 깊고 밤에 대화가 잘 통하는 짝','축(丑) · 성실하고 묵묵히 곁을 지키는 짝','인(寅) · 추진력 있고 함께 도전하는 짝','묘(卯) · 다정하고 말이 잘 통하는 짝','진(辰) · 꿈이 크고 스케일 있는 짝','사(巳) · 똑똑하고 계획적인 짝','오(午) · 밝고 열정적인 짝','미(未) · 온순하고 가정적인 짝','신(申) · 재치 있고 일 잘하는 짝','유(酉) · 깔끔하고 취향이 분명한 짝','술(戌) · 의리 있고 책임감 강한 짝','해(亥) · 마음 넓고 낙천적인 짝'];
  var LV_DOHWA = [9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3, 0];   /* 지지별 도화: 申子辰→酉, 巳酉丑→午, 寅午戌→卯, 亥卯未→子 */
  function lvCalc(me, r){
    var dS = r.pillars.day.stem, dB = r.pillars.day.br, yB = r.pillars.year.br, F = me.gender === 'F';
    var dEl = MS.STEM_EL[dS], spEl = F ? (dEl + 3) % 5 : (dEl + 2) % 5;   /* 여: 나를 극하는 오행(관성), 남: 내가 극하는 오행(재성) */
    var dh = [LV_DOHWA[dB], LV_DOHWA[yB]];
    var y0 = Math.max(TJ_YEAR, r.solar.y + 18), years = [];
    for (var Y = y0; Y < y0 + 10; Y++){
      var p = MS.calc({ y:Y, m:6, d:15, cal:'solar', unknownTime:true, gender:'M', lonCorr:false }).pillars.year;
      var tg = MS.tenGod(dS, p.stem), rel = DAILY.brRel(p.br, dB), lov = 58, mar = 56, why = [];
      var star = F ? { '정관':'mar', '편관':'lov' } : { '정재':'mar', '편재':'lov' };
      if (star[tg] === 'mar'){ mar += 22; lov += 10; why.push(tg + ' 해 · 결혼의 별이 들어와요'); }
      else if (star[tg] === 'lov'){ lov += 20; mar += 9; why.push(tg + ' 해 · 설레는 인연의 별이 들어와요'); }
      else if (tg === '식신' || tg === '상관'){ lov += 8; why.push('매력이 드러나는 해예요'); }
      else if (tg === '정인' || tg === '편인'){ mar += 5; why.push('주변 소개와 어른 인연이 이어지는 해예요'); }
      else if (tg === '비견' || tg === '겁재'){ lov -= 4; mar -= 6; why.push('경쟁자가 생기기 쉬운 해예요'); }
      if (rel === 'hap'){ mar += 12; lov += 8; why.push('배우자 자리와 합 · 관계가 단단해져요'); }
      else if (rel === 'samhap'){ mar += 6; lov += 6; why.push('배우자 자리와 삼합 · 함께하는 목표가 생겨요'); }
      else if (rel === 'chung'){ mar -= 8; lov += 4; why.push('배우자 자리와 충 · 만남과 이별이 모두 빨라져요'); }
      else if (rel === 'wonjin'){ mar -= 5; lov -= 5; why.push('원진 · 사소한 서운함을 조심해요'); }
      if (dh.indexOf(p.br) > -1){ lov += 12; why.push('도화의 해 · 사람을 끄는 힘이 커져요'); }
      years.push({ y:Y, age:Y - r.solar.y, p:p, tg:tg, rel:rel, lov:clamp(lov, 40, 98), mar:clamp(mar, 40, 98), why:why });
    }
    var byL = years.slice().sort(function(a, b){ return b.lov - a.lov; }), byM = years.slice().sort(function(a, b){ return b.mar - a.mar; });
    /* 2027년 달마다: 월운 천간이 결혼·인연의 별이거나 월지가 배우자 자리와 합이면 좋은 달 */
    var mons = [];
    for (var mm = 1; mm <= 12; mm++){
      var mp = MS.calc({ y:TJ_YEAR, m:mm, d:20, cal:'solar', unknownTime:true, gender:'M', lonCorr:false }).pillars.month;
      var mt = MS.tenGod(dS, mp.stem), mr = DAILY.brRel(mp.br, dB), sc = 60;
      if (star[mt]) sc += 20; if (mr === 'hap' || mr === 'samhap') sc += 12; if (mr === 'chung') sc -= 6; if (dh.indexOf(mp.br) > -1) sc += 10;
      mons.push({ m:mm, sc:sc });
    }
    mons.sort(function(a, b){ return b.sc - a.sc || a.m - b.m; });
    return { years:years, bestL:byL.slice(0, 2), bestM:byM.slice(0, 2), care:years.filter(function(x){ return (x.rel === 'chung' || x.rel === 'wonjin') && byL.slice(0, 2).indexOf(x) < 0 && byM.slice(0, 2).indexOf(x) < 0; }).slice(0, 2), mons:mons.slice(0, 3).sort(function(a, b){ return a.m - b.m; }), spEl:spEl, star:F ? '관성(남자·결혼의 별)' : '재성(여자·결혼의 별)' };
    function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  }
  function openLoveTiming(me, r){
    setTimeout(function(){ bond('gh'); }, 900);
    var L = lvCalc(me, r), open = owns('lv') || passActive(), dS = r.pillars.day.stem, dB = r.pillars.day.br, now = L.years[0];
    var chart = L.years.map(function(x){
      return '<li><span class="lv-y"><b>' + x.y + '</b><small>' + x.age + '세</small></span><span class="lv-bars"><i class="l" style="--v:' + (x.lov / 100) + '"></i><i class="m" style="--v:' + (x.mar / 100) + '"></i></span><span class="lv-n">' + x.lov + ' · ' + x.mar + '</span></li>';
    }).join('');
    var yl = function(a){ return a.map(function(x){ return '<b>' + x.y + '년</b>(' + x.age + '세)'; }).join(', '); };
    openSheet('<div class="lv-sheet"><div class="sheet-fig">' + uniImg('joa-marry', '', '반지를 든 조아') + '</div>' +
      '<h3 id="sheetTitle">' + esc(me.name) + '님의 연애·결혼 시기</h3>' +
      '<p class="helper" style="margin:-4px 0 12px">해마다 들어오는 기운과 배우자 자리(일지)로 본 인연의 흐름이에요.</p>' +
      '<div class="tj-sec"><h4>나의 연애 스타일 · ' + MS.STEM_K[dS] + '(' + MS.STEM_H[dS] + ') 일간</h4><p>' + LV_STYLE[dS] + '</p></div>' +
      '<div class="tj-sec"><h4>배우자 자리 · ' + LV_PALACE[dB] + '</h4><p>일지는 사주에서 배우자가 앉는 자리예요. ' + esc(me.name) + '님 곁에는 ' + LV_PALACE[dB].split(' · ')[1].replace(/ 짝$/, '') + ' 사람이 오래 머물기 쉬워요.</p></div>' +
      '<div class="tj-sec"><h4>' + now.y + '년 인연운</h4><div class="lv-now"><span><small>연애운</small><b>' + now.lov + '</b></span><span><small>결혼운</small><b>' + now.mar + '</b></span></div><p>' + now.why.slice(0, 2).join(' · ') + '</p></div>' +
      (open
        ? '<div class="tj-sec"><h4>10년 인연 그래프 <small>연애 · 결혼</small></h4><ul class="lv-chart">' + chart + '</ul><div class="tk-legend"><span class="lv-lg l"><i></i>연애운</span><span class="lv-lg m"><i></i>결혼운</span></div></div>' +
          '<div class="tj-sec"><h4>인연이 가장 가까운 해</h4><p><b>연애</b> ' + yl(L.bestL) + ' · ' + L.bestL[0].why[0] + '</p><p><b>결혼</b> ' + yl(L.bestM) + ' · ' + L.bestM[0].why[0] + '</p>' + (L.care.length ? '<p><b>천천히 갈 해</b> ' + yl(L.care) + ' · 큰 결정은 한 번 더 생각해요.</p>' : '') + '</div>' +
          '<div class="tj-sec"><h4>' + TJ_YEAR + '년 인연 달</h4><p>' + L.mons.map(function(x){ return x.m + '월'; }).join(', ') + '에 소개팅, 고백, 상견례 같은 일을 잡아 보세요.</p></div>' +
          '<div class="tj-sec"><h4>나와 잘 맞는 사람</h4><p>' + esc(me.name) + '님의 ' + L.star + '은 ' + MS.EL_K[L.spEl] + '(' + MS.EL_H[L.spEl] + ') 기운이에요. ' + LV_SPOUSE[L.spEl * 2 + (dB % 2)] + '에게 마음이 가고, 함께할 때 서로를 키워 줘요. ' + EL_TEXT[L.spEl].color + ' 계열 옷을 입은 날 인연을 만나기 쉬워요.</p></div>' + adSlotHTML('연애·결혼 시기를 본 뒤')
        : '<div class="tj-sec tj-locked"><h4>10년 인연 그래프 ' + LOCK_SVG + '</h4><ul class="lv-chart tj-blur" aria-hidden="true">' + chart + '</ul></div>' +
          '<div class="tj-buy"><b>10년 연애·결혼 그래프, 인연이 오는 해, ' + TJ_YEAR + '년 인연 달, 잘 맞는 사람까지</b>' + passLinkHTML() + '<button class="btn-primary btn-block sheen" id="btnLvBuy">연애·결혼 시기 전체 보기 · ' + priceTag('lv') + '</button></div>') +
      '<p class="disclaimer">연애·결혼 시기는 사주의 흐름으로 본 재미용 참고 콘텐츠예요. 인연은 결국 두 사람의 마음이 만들어요.</p>' +
      '<button class="text-btn" data-close>' + (open ? '닫기' : '나중에 볼게요') + '</button></div>');
    if ($('btnLvBuy')) $('btnLvBuy').onclick = function(){ closeSheet(); setTimeout(function(){ openPaySheet('lv', { who:esc(me.name) + '님', onPaid:function(){ openLoveTiming(me, r); } }); }, 260); };
  }

  /* =========================================================
     2026-11-23 헬로우봇 분석 → 새 콘텐츠 2종 (소율 결정: 출시 전에 넣기)
     - 내 재물 그릇 (wl): 원국 십성 + 신강약 + 대운 10년 흐름. 1장 무료, 2~6장 잠금
     - 나에게 든 살 풀이 (sal): 신살 표 계산 + 2027 정미년에 들어오는 살. 하나 무료, 나머지 잠금
     둘 다 계산만 쓰고 AI 는 쓰지 않는다. 가격은 COST·WON 과 서버 api/_lib/shop.js 를 같이 바꾼다
     ========================================================= */
  function wlClamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  var WL_BOWL = {
    jar:{ n:'큰 항아리', t:'많이 담고 오래 지키는 그릇', d:'재물의 별(재성)을 감당할 힘이 있는 사주예요. 들어온 돈을 붙잡아 두는 힘이 좋아서, 한 번 흐름을 타면 크게 불어나요. 욕심을 한 번에 채우기보다 해마다 조금씩 넓혀 가는 쪽이 잘 맞아요.' },
    tray:{ n:'넓은 쟁반', t:'많이 들어오지만 넘치기 쉬운 그릇', d:'돈이 들어올 길은 여러 갈래로 열려 있는데, 그릇이 넓고 얕아서 담아 두는 힘이 조금 약해요. 버는 재주보다 지키는 습관이 재물운을 완성해요. 통장을 나누고 자동 저축을 걸어 두면 그릇이 깊어져요.' },
    spring:{ n:'마르지 않는 샘', t:'재능이 곧 재산인 그릇', d:'원국에 재능의 별(식상)이 강해서, 손재주·말솜씨·기획처럼 내가 만들어 내는 것이 돈으로 흘러가요. 돈을 쫓을 때보다 잘하는 일을 꾸준히 보여 줄 때 수입이 따라와요. 재능을 돈으로 바꾸는 통로(판매처·단골)를 하나 만들어 두세요.' },
    stream:{ n:'흐르는 물동이', t:'재능에서 돈으로 이어지는 그릇', d:'재능의 별과 재물의 별이 함께 있어 ‘잘하는 일 → 돈’으로 이어지는 길이 이미 나 있어요. 부업이나 작업물 판매처럼 내 손으로 만든 결과가 바로 수입이 되는 구조가 가장 잘 맞아요.' },
    safe:{ n:'단단한 금고', t:'자리와 신용으로 쌓는 그릇', d:'관성(자리·책임)이 받쳐 주는 사주라 월급, 직함, 계약처럼 정해진 틀 안에서 돈이 안정적으로 들어와요. 큰 한 방보다 꾸준히 쌓이는 쪽이고, 신용이 곧 재산이 돼요.' },
    well:{ n:'깊은 우물', t:'천천히 차올라 오래 가는 그릇', d:'인성(배움·문서)이 깊은 사주라 돈이 빠르게 들어오진 않아도 한 번 차오르면 오래 가요. 자격증, 계약서, 부동산처럼 ‘문서’로 남는 재산과 인연이 깊어요.' },
    pot:{ n:'함께 쓰는 큰 솥', t:'사람이 모이면 돈도 모이는 그릇', d:'비겁(나와 같은 사람)이 많아 사람을 모으는 힘이 커요. 함께하는 사람이 곧 영업망이 되지만, 그만큼 나눠 쓰는 돈도 많아요. 동업이나 돈거래는 문서로 선을 그어 두면 그릇이 지켜져요.' },
    bowl:{ n:'균형 잡힌 사발', t:'들어오고 나가는 균형이 좋은 그릇', d:'어느 한쪽으로 치우치지 않은 담백한 그릇이에요. 크게 넘치지도, 크게 새지도 않아서 계획만 세우면 꾸준히 불어나요. 들어오는 시기를 알고 그때 힘을 모으는 게 핵심이에요.' }
  };
  var WL_IN = { '식상':'재능과 손재주 · 만들고 말하고 기획한 것이 돈이 돼요', '재성':'거래와 감각 · 사고팔고 굴리는 데서 돈이 붙어요', '관성':'자리와 신용 · 월급, 직함, 계약이 수입의 뿌리예요', '인성':'자격과 문서 · 자격증, 계약서, 지원금, 부동산과 인연이 깊어요', '비겁':'사람과 발품 · 내 몸과 인맥이 곧 영업망이에요' };
  var WL_OUT = { '비겁':'사람 때문에 새는 돈 · 밥값, 빌려준 돈, 동업 정산을 조심해요', '식상':'기분 따라 쓰는 돈 · 취미, 충동구매, 새로 벌이는 일에 지출이 커져요', '재성':'벌인 일이 많아 새는 돈 · 관리하지 못한 구독과 투자를 정리해요', '인성':'생각만 하다 놓치는 돈 · 기회가 와도 망설이다 늦어지기 쉬워요', '관성':'체면 때문에 나가는 돈 · 경조사, 선물, 품위 유지비가 커져요' };
  function wlCalc(me, r){
    var g = natalGroups(r), weak = /약/.test(r.strength || ''), dS = r.pillars.day.stem;
    var key = g['재성'] >= 3 && weak ? 'tray' : g['재성'] >= 2 && !weak ? 'jar' : g['식상'] >= 2 && g['재성'] >= 1 ? 'stream' : g['식상'] >= 2 ? 'spring' :
      g['비겁'] >= 3 ? 'pot' : g['관성'] >= 2 ? 'safe' : g['인성'] >= 2 ? 'well' : 'bowl';
    var ord = Object.keys(g).sort(function(a, b){ return g[b] - g[a] || ['식상','재성','관성','인성','비겁'].indexOf(a) - ['식상','재성','관성','인성','비겁'].indexOf(b); });
    var inG = g['식상'] >= g['재성'] && g['식상'] ? '식상' : g['재성'] ? '재성' : ord[0];
    var outG = g['비겁'] >= 3 ? '비겁' : g['식상'] >= 3 ? '식상' : g['재성'] >= 3 && weak ? '재성' : g['인성'] >= 3 ? '인성' : g['관성'] >= 2 ? '관성' : (ord[0] === inG ? ord[1] : ord[0]);
    /* 대운 10년 단위 재물 점수: 재성·식상이 들어오면 오르고, 신강하면 비겁이 깎고 신약하면 비겁·인성이 받쳐 준다 */
    var dae = r.daeun.filter(function(p){ return p.age <= 85; }).map(function(p){
      var gs = TEN_GRP[p.tenStem], gb = TEN_GRP[p.tenBr], v = 52, why = [];
      var W = { '재성':[16, 12], '식상':[9, 7], '관성':[4, 3], '인성':weak ? [7, 5] : [-2, -2], '비겁':weak ? [6, 4] : [-9, -7] };
      v += W[gs][0] + W[gb][0];
      if (!weak && (gs === '재성' || gb === '재성')) v += 5;
      if (MS.STEM_EL[p.stem] === r.yong || MS.BR_EL[p.br] === r.yong){ v += 7; why.push('나를 돕는 기운(' + MS.EL_K[r.yong] + ')'); }
      if (gs === '재성' || gb === '재성') why.unshift('재물의 별이 들어오는 10년');
      else if (gs === '식상' || gb === '식상') why.unshift('재능이 돈이 되는 10년');
      else if (gs === '비겁' || gb === '비겁') why.unshift(weak ? '힘이 붙어 버티는 10년' : '경쟁과 지출이 늘어나는 10년');
      else if (gs === '관성' || gb === '관성') why.unshift('자리와 신용이 쌓이는 10년');
      else why.unshift('배우고 문서를 남기는 10년');
      return { age:p.age, y:r.solar.y + p.age - 1, p:p, v:wlClamp(v, 34, 97), why:why };
    });
    var top = dae.slice().sort(function(a, b){ return b.v - a.v || a.age - b.age; }).slice(0, 3).sort(function(a, b){ return a.age - b.age; });
    var size = wlClamp(Math.round((g['재성'] * 2 + g['식상'] + (weak ? 0 : 2) + (top[0] && top[0].v >= 80 ? 1 : 0)) / 2), 1, 5);
    var ways = [
      ['월급형', '정해진 자리에서 꾸준히', g['관성'] * 2 + g['인성'] + 1],
      ['사업형', '판을 벌이고 사람을 움직이며', g['재성'] * 2 + g['비겁'] + (weak ? 0 : 2)],
      ['재능·부업형', '만든 것을 팔며', g['식상'] * 2 + g['재성']],
      ['자산형', '모으고 굴리며', g['재성'] + g['인성'] + (weak ? 0 : 1)]
    ];
    /* 원국에서 가장 센 십성 쪽에 가산점(동점으로 다 같은 %가 나오지 않게) */
    var WAY_OF = { '관성':0, '재성':1, '비겁':1, '식상':2, '인성':3 };
    ways[WAY_OF[ord[0]]][2] += 2; ways[WAY_OF[ord[1]]][2] += 1;
    var wsum = ways.reduce(function(s, x){ return s + x[2]; }, 0) || 1;
    ways.forEach(function(x){ x[3] = Math.round(x[2] / wsum * 100); });
    ways.sort(function(a, b){ return b[2] - a[2]; });
    /* 2027 달마다: 월 천간이 재성·식상이면 좋은 달, 비겁(겁재)이거나 월지가 일지와 충이면 조심할 달 */
    var good = [], care = [];
    for (var m = 1; m <= 12; m++){
      var mp = MS.calc({ y:TJ_YEAR, m:m, d:20, cal:'solar', unknownTime:true, gender:'M', lonCorr:false }).pillars.month;
      var mg = TEN_GRP[MS.tenGod(dS, mp.stem)], rel = DAILY.brRel(mp.br, r.pillars.day.br);
      if (mg === '재성' || (mg === '식상' && rel !== 'chung')) good.push(m); else if (MS.tenGod(dS, mp.stem) === '겁재' || rel === 'chung') care.push(m);
    }
    var ys = MS.calc({ y:TJ_YEAR, m:6, d:15, cal:'solar', unknownTime:true, gender:'M', lonCorr:false }).pillars.year;
    return { g:g, weak:weak, key:key, B:WL_BOWL[key], inG:inG, outG:outG, dae:dae, top:top, size:size, ways:ways, good:good, care:care, yG:TEN_GRP[MS.tenGod(dS, ys.stem)], ys:ys };
  }
  function openWealth(me, r){
    setTimeout(function(){ bond('today'); }, 900);
    var W = wlCalc(me, r), open = owns('wl') || passActive(), nm = esc(me.name);
    var dots = ''; for (var i = 1; i <= 5; i++) dots += '<i class="' + (i <= W.size ? 'on' : '') + '"></i>';
    var chart = W.dae.map(function(x){
      var hot = W.top.indexOf(x) > -1;
      return '<li class="' + (hot ? 'hot' : '') + '"><span class="lv-y"><b>' + x.age + '세~</b><small>' + x.p.hanja + '</small></span><span class="wl-bar"><i style="--v:' + (x.v / 100) + '"></i></span><span class="lv-n">' + x.v + '</span></li>';
    }).join('');
    var ch = function(n, t, body){ return '<div class="tj-sec wl-ch"><h4><em>' + n + '장</em>' + t + '</h4>' + body + '</div>'; };
    var h = '<div class="wl-sheet"><div class="sheet-fig">' + uniImg('u-money') + '</div>' +
      '<h3 id="sheetTitle">' + nm + '님의 재물 그릇</h3>' +
      '<p class="helper" style="margin:-4px 0 12px">원국의 재물·재능의 별과 10년마다 바뀌는 대운으로 본 평생 돈 흐름이에요.</p>' +
      ch(1, '내 재물 그릇의 모양', '<div class="wl-bowl"><b>' + W.B.n + '</b><small>' + W.B.t + '</small><span class="wl-size" aria-label="그릇 크기 5칸 중 ' + W.size + '칸">' + dots + '</span></div><p>' + W.B.d + '</p>' +
        '<p class="helper">재성 ' + W.g['재성'] + ' · 식상 ' + W.g['식상'] + ' · 관성 ' + W.g['관성'] + ' · 인성 ' + W.g['인성'] + ' · 비겁 ' + W.g['비겁'] + ' · ' + esc(r.strength) + '</p>');
    if (open){
      h += ch(2, '돈이 들어오는 길 · 새는 길', '<p><b>들어오는 길</b> ' + WL_IN[W.inG] + '</p><p><b>새는 길</b> ' + WL_OUT[W.outG] + '</p>') +
        ch(3, '평생 재물 흐름', '<ul class="lv-chart wl-chart">' + chart + '</ul><p class="helper">대운 10년 단위 점수예요. 노란 줄이 크게 들어오는 시기예요.</p>') +
        ch(4, '크게 들어오는 시기 3번', W.top.map(function(x, k){ return '<p><b>' + (k + 1) + '. ' + x.age + '~' + (x.age + 9) + '세</b> (' + x.y + '~' + (x.y + 9) + '년) · ' + x.why.join(' · ') + '</p>'; }).join('') +
          '<p>이 시기에 큰 결정(이직, 창업, 집 마련)을 모으고, 나머지 시기에는 준비와 저축에 힘을 쓰면 흐름을 잘 타요.</p>') +
        ch(5, '나에게 맞는 돈 버는 방식', '<ul class="wl-ways">' + W.ways.map(function(x){ return '<li><span><b>' + x[0] + '</b><small>' + x[1] + '</small></span><span class="wl-bar"><i style="--v:' + (x[3] / 100) + '"></i></span><em>' + x[3] + '%</em></li>'; }).join('') + '</ul>' +
          '<p>' + nm + '님은 <b>' + W.ways[0][0] + '</b>이 가장 잘 맞고, ' + W.ways[1][0] + '을 곁들이면 그릇이 더 커져요.</p>') +
        ch(6, TJ_YEAR + '년 재물 처방', '<p>' + TJ_YEAR + '년은 ' + W.ys.hanja + '년, ' + nm + '님에게 ' + W.yG + '의 해예요. ' + CAT_YEAR[W.yG].money + '</p>' +
          (W.good.length ? '<p><b>돈이 도는 달</b> ' + W.good.map(function(m){ return m + '월'; }).join(', ') + '</p>' : '') +
          (W.care.length ? '<p><b>지갑을 닫을 달</b> ' + W.care.map(function(m){ return m + '월'; }).join(', ') + '</p>' : '') +
          '<p><b>재물 처방</b> 나를 돕는 기운은 ' + EL_TEXT[r.yong].name + '이에요. 지갑이나 통장 앱 배경을 ' + EL_TEXT[r.yong].color + ' 계열로, 큰 결정은 ' + EL_TEXT[r.yong].dir + '을 향한 자리에서 해 보세요.</p>') +
        adSlotHTML('재물 그릇을 본 뒤');
    } else {
      h += '<div class="tj-sec tj-locked"><h4>2~6장 ' + LOCK_SVG + '</h4><ul class="wl-toc"><li><em>2</em>돈이 들어오는 길 · 새는 길</li><li><em>3</em>평생 재물 흐름 그래프</li><li><em>4</em>크게 들어오는 시기 3번</li><li><em>5</em>나에게 맞는 돈 버는 방식</li><li><em>6</em>' + TJ_YEAR + '년 재물 처방</li></ul>' +
        '<ul class="lv-chart wl-chart tj-blur" aria-hidden="true">' + chart + '</ul></div>' +
        '<div class="tj-buy"><b>평생 재물 흐름과 크게 들어오는 시기 3번까지</b>' + passLinkHTML() + '<button class="btn-primary btn-block sheen" id="btnWlBuy">2~6장 모두 보기 · ' + priceTag('wl') + '</button></div>';
    }
    h += '<p class="disclaimer">재물 그릇은 사주의 흐름으로 본 재미용 참고 콘텐츠예요. 투자나 금융 결정의 근거로 쓰지 마세요.</p>' +
      '<button class="text-btn" data-close>' + (open ? '닫기' : '나중에 볼게요') + '</button></div>';
    openSheet(h);
    if ($('btnWlBuy')) $('btnWlBuy').onclick = function(){ closeSheet(); setTimeout(function(){ openPaySheet('wl', { who:nm + '님', onPaid:function(){ openWealth(me, r); } }); }, 260); };
  }

  /* ---------- 나에게 든 살 풀이 (sal) ---------- */
  var SAL_INFO = {
    '도화살':{ old:'도화를 ‘복숭아꽃이 담장을 넘는다’고 해서 이성 문제와 주색(酒色)을 조심하라는 살로 봤어요. 특히 여성에게는 꺼리는 살로 여겼어요.', oldFix:'옛사람들은 복숭아나무 가지를 대문 밖으로 내고, 혼인은 늦게 하는 편이 좋다고 했어요.', k:'사람을 끄는 꽃', good:'눈길을 끄는 매력과 분위기가 있어요. 사람을 상대하는 일, 보여 주는 일에서 빛나요.', care:'인기가 많은 만큼 오해와 구설도 따라와요. 애매한 관계는 선을 분명히 해요.', fix:'매력을 일로 쓰면 살이 복이 돼요. 발표, 영업, 콘텐츠처럼 ‘보여 주는’ 자리를 일부러 맡아 보세요.' },
    '홍염살':{ old:'홍염은 ‘붉은 불꽃’이라 정이 많아 마음을 쉽게 주고, 그 때문에 애정으로 속을 끓이는 살이라 했어요.', oldFix:'옛사람들은 붉은 옷을 줄이고 마음을 다스리는 글을 가까이 두라고 했어요.', k:'은은하게 번지는 색기', good:'말투와 눈빛에 은근한 끌림이 있어 한번 본 사람이 오래 기억해요. 감성과 예술 감각이 좋아요.', care:'감정에 휩쓸려 관계를 서두르기 쉬워요. 마음이 급할수록 하루 더 생각해요.', fix:'감성을 작품으로 남기면 좋아요. 그림, 글, 사진, 음악 중 하나를 꾸준히 해 보세요.' },
    '역마살':{ old:'역마는 ‘역참의 말’이라 평생 떠돌며 고향을 떠나 사는 팔자로 봤어요. 집안에서는 자식이 멀리 떠날까 걱정하는 살이었어요.', oldFix:'옛사람들은 역마가 든 사람은 장사나 벼슬로 길을 나서야 탈이 없다고 했어요.', k:'멀리 움직이는 발', good:'움직일수록 운이 트여요. 출장, 이사, 여행, 해외와 인연이 깊고 새 환경에 빨리 적응해요.', care:'한곳에 오래 묶이면 답답함이 커져요. 잦은 이동으로 몸이 지치지 않게 쉬는 날을 정해요.', fix:'정기적으로 ‘떠나는 날’을 달력에 넣어 두세요. 이동이 많은 일, 원격 근무가 잘 맞아요.' },
    '화개살':{ old:'화개는 ‘꽃 덮개’로, 스님이나 도사처럼 세상과 떨어져 홀로 닦는 팔자라 했어요. 총명하지만 외롭다고 봤어요.', oldFix:'옛사람들은 화개가 든 사람에게 글공부나 불공, 예술을 권했어요.', k:'혼자 깊어지는 별', good:'예술, 종교, 학문처럼 깊이 파고드는 일에 재능이 있어요. 혼자 있는 시간에 아이디어가 자라요.', care:'외로움을 타기 쉽고, 마음을 잘 드러내지 않아 오해를 사기도 해요.', fix:'혼자만의 시간을 ‘작업 시간’으로 바꿔요. 공부, 기록, 창작이 살을 복으로 돌려요.' },
    '백호살':{ old:'백호는 ‘흰 호랑이’라 피를 보는 살, 곧 큰 사고나 다침을 조심하라고 무섭게 경계했어요.', oldFix:'옛사람들은 백호가 든 해에는 먼 길과 칼 쓰는 일을 삼가고 몸가짐을 조심하라 했어요.', k:'강한 기세의 호랑이', good:'위기에서 오히려 강해지는 기세와 결단력이 있어요. 큰일을 밀어붙이는 힘이 커요.', care:'기세가 센 만큼 다치거나 크게 부딪히기 쉬워요. 운전, 운동, 수술 일정은 한 번 더 살펴요.', fix:'힘을 몸으로 풀어요. 땀 흘리는 운동이나 체력이 드는 취미가 기운을 순하게 돌려요.' },
    '괴강살':{ old:'괴강은 ‘북두칠성의 머리’라 크게 되거나 크게 꺾이는 극단의 살로 봤어요. 여성에게는 기가 세다며 꺼렸어요.', oldFix:'옛사람들은 괴강이 든 사람은 남 밑보다 스스로 우두머리가 되어야 편하다고 했어요.', k:'우두머리의 고집', good:'리더십과 카리스마가 강하고, 남이 못 하는 결정을 내려요. 위로 올라갈수록 힘이 나요.', care:'고집이 세 보여 주변과 부딪히기 쉬워요. 특히 가까운 사람에게 말이 세지지 않게 해요.', fix:'내가 책임지는 ‘내 판’을 하나 가지면 좋아요. 리더 역할을 맡을수록 살이 힘이 돼요.' },
    '양인살':{ old:'양인은 ‘칼날’이라 형벌과 다툼, 재물을 잃는 일을 부른다고 경계했어요. 다만 무관(武官)에게는 좋은 살이라 했어요.', oldFix:'옛사람들은 양인이 센 사람에게 군인·무관의 길을 권했어요.', k:'칼날 같은 추진력', good:'목표를 정하면 끝까지 베어 내는 추진력이 있어요. 경쟁이 센 곳에서 이겨요.', care:'성급하게 밀어붙이다 사람을 잃거나 손해를 볼 수 있어요. 돈거래와 보증은 피해요.', fix:'칼은 쓰는 자리에서 빛나요. 전문 기술, 의료, 법, 운동처럼 날카로움이 필요한 일을 택해요.' },
    '원진살':{ old:'원진은 ‘서로 원망하고 미워하는 기운’이라, 부부나 가까운 사이가 까닭 없이 틀어지는 살로 봤어요. 궁합에서 특히 꺼렸어요.', oldFix:'옛사람들은 원진이 든 짝은 서로 말을 아끼고 예를 갖추면 괜찮다고 했어요.', k:'괜히 서운한 마음', good:'예민한 감각 덕분에 분위기와 사람 마음을 빨리 알아채요.', care:'가까운 사람에게 이유 없이 서운함이 쌓이기 쉬워요. 말로 꺼내지 않으면 오해가 커져요.', fix:'서운함은 그날 바로 한 줄로 말해요. 쌓아 두지 않으면 원진은 거의 힘을 못 써요.' }
  };
  var SAL_ORDER = ['도화살', '홍염살', '역마살', '화개살', '백호살', '괴강살', '양인살', '원진살'];
  var SAL_POS = { year:'연주', month:'월주', day:'일주', hour:'시주', y2027:TJ_YEAR + '년' };
  function salCalc(me, r){
    var P = r.pillars, keys = ['year', 'month', 'day', 'hour'].filter(function(k){ return P[k]; }), list = [];
    function add(name, at){ if (!at.length) return; var x = list.filter(function(s){ return s.name === name; })[0]; if (x) at.forEach(function(a){ if (x.at.indexOf(a) < 0) x.at.push(a); }); else list.push({ name:name, at:at.slice() }); }
    r.shinsal.forEach(function(s){ if (SAL_INFO[s.name]) add(s.name, s.at); });
    var HONG = [6, 6, 2, 7, 4, 4, 10, 9, 0, 8];
    add('홍염살', keys.filter(function(k){ return P[k].br === HONG[P.day.stem]; }));
    add('백호살', keys.filter(function(k){ return ['갑진','을미','병술','정축','무진','임술','계축'].indexOf(P[k].name) > -1; }));
    var WJ = [[0,7],[1,6],[2,9],[3,8],[4,11],[5,10]];
    function pairAt(T){ var at = []; keys.forEach(function(a, i){ keys.slice(i + 1).forEach(function(b){ var x = P[a].br, y = P[b].br; if (T.some(function(t){ return (t[0] === x && t[1] === y) || (t[0] === y && t[1] === x); })){ if (at.indexOf(a) < 0) at.push(a); if (at.indexOf(b) < 0) at.push(b); } }); }); return at; }
    add('원진살', pairAt(WJ));
    list.sort(function(a, b){ return SAL_ORDER.indexOf(a.name) - SAL_ORDER.indexOf(b.name); });
    /* 2027 정미년(未)에 들어오는 살: 연지·일지 삼합 기준 도화·역마·화개, 일간 기준 홍염, 일지와 원진·충 */
    var Y = 7, inc = [];
    var SAMHAP = function(b){ return [8,0,4].indexOf(b) > -1 ? 'water' : [2,6,10].indexOf(b) > -1 ? 'fire' : [5,9,1].indexOf(b) > -1 ? 'metal' : 'wood'; };
    var DOHWA = { water:9, fire:3, metal:6, wood:0 }, YEOKMA = { water:2, fire:8, metal:11, wood:5 }, HWAGAE = { water:4, fire:10, metal:1, wood:7 };
    [P.year.br, P.day.br].forEach(function(b){ var g = SAMHAP(b); if (DOHWA[g] === Y && inc.indexOf('도화살') < 0) inc.push('도화살'); if (YEOKMA[g] === Y && inc.indexOf('역마살') < 0) inc.push('역마살'); if (HWAGAE[g] === Y && inc.indexOf('화개살') < 0) inc.push('화개살'); });
    if (HONG[P.day.stem] === Y) inc.push('홍염살');
    if (WJ.some(function(t){ return (t[0] === Y && t[1] === P.day.br) || (t[1] === Y && t[0] === P.day.br); })) inc.push('원진살');
    var chung = (P.day.br + 6) % 12 === Y;
    var gui = r.shinsal.filter(function(s){ return /귀인/.test(s.name); });
    return { list:list, inc:inc, chung:chung, gui:gui };
  }
  var SAL_INC = { '도화살':'사람이 몰리고 인기가 오르는 해예요. 새 인연과 제안이 많아요.', '역마살':'이동과 변화가 많은 해예요. 이사, 이직, 여행 계획이 잘 풀려요.', '화개살':'혼자 공부하고 깊어지는 해예요. 자격증, 창작, 정리에 좋아요.', '홍염살':'감정이 풍부해지고 끌림이 강해지는 해예요. 마음이 급할수록 천천히.', '원진살':'가까운 사람과 서운함이 쌓이기 쉬운 해예요. 그날그날 풀어요.' };
  /* 2026-11-23 소율: 같은 살을 '옛풀이(옛 명리 책의 해석)'와 '요즘풀이(지금 생활로 바꾼 해석)'로 나눠 보여 준다 */
  var salMode = 'new';
  function salCardHTML(s, nm){
    var I = SAL_INFO[s.name];
    return '<div class="tj-sec sal-card"><h4><span class="sal-n">' + s.name + '</span><small>' + I.k + ' · ' + s.at.map(function(a){ return SAL_POS[a]; }).join('·') + '</small></h4>' +
      '<div class="sal-v sal-old"><p><b>옛 책에서는</b> ' + I.old + '</p><p class="sal-fix"><b>옛 살풀이</b> ' + I.oldFix + '</p></div>' +
      '<div class="sal-v sal-new"><p><b>강점</b> ' + I.good + '</p><p><b>조심</b> ' + I.care + '</p><p class="sal-fix"><b>요즘 살풀이</b> ' + I.fix + '</p></div></div>';
  }
  function openSal(me, r){
    setTimeout(function(){ bond('today'); }, 900);
    var S = salCalc(me, r), open = owns('sal') || passActive(), nm = esc(me.name), L = S.list;
    var h = '<div class="sal-sheet"><div class="sheet-fig">' + uniImg('u-thinking') + '</div>' +
      '<h3 id="sheetTitle">' + nm + '님에게 든 살</h3>' +
      '<p class="helper" style="margin:-4px 0 12px">살(煞)은 나쁜 운이 아니라 남보다 센 기질이에요. 잘 쓰면 복이 되고, 모르고 쓰면 부딪혀요.</p>' +
      (L.length ? '<div class="sal-mode" role="tablist" aria-label="풀이 방식"><button type="button" role="tab" data-salm="old" aria-selected="' + (salMode === 'old') + '">옛풀이<small>옛 명리 책 그대로</small></button><button type="button" role="tab" data-salm="new" aria-selected="' + (salMode === 'new') + '">요즘풀이<small>지금 생활로 바꿔서</small></button></div>' : '') +
      '<div class="sal-chips">' + (L.length ? L.map(function(s, i){ return '<span class="' + (i === 0 || open ? 'on' : '') + '">' + s.name + '</span>'; }).join('') : '<span>두드러진 살 없음</span>') + '</div>';
    if (!L.length){
      h += '<div class="tj-sec"><p>' + nm + '님 사주에는 센 살이 거의 없어요. 큰 굴곡 없이 스스로 길을 만드는 담백한 사주예요.' + (S.gui.length ? ' 대신 ' + S.gui.map(function(g){ return g.name; }).join(', ') + '이 있어 도움을 주는 사람이 곁에 있어요.' : '') + '</p></div>';
    } else {
      h += salCardHTML(L[0], nm);
      if (open){
        h += L.slice(1).map(function(s){ return salCardHTML(s, nm); }).join('') +
          '<div class="tj-sec"><h4>' + TJ_YEAR + '년 정미년에 들어오는 살</h4>' + (S.inc.length ? S.inc.map(function(n){ return '<p><b>' + n + '</b> ' + SAL_INC[n] + '</p>'; }).join('') : '<p>' + TJ_YEAR + '년에는 새로 들어오는 센 살이 없어요. 내 살을 잘 쓰는 데 집중하면 돼요.</p>') +
          (S.chung ? '<p><b>일지 충</b> 올해 기운(未)이 배우자 자리와 부딪혀요. 이사, 이직, 관계 변화가 생기기 쉬우니 큰 결정은 서두르지 마세요.</p>' : '') + '</div>' +
          (S.gui.length ? '<div class="tj-sec"><h4>살을 눌러 주는 귀인</h4><p>' + S.gui.map(function(g){ return '<b>' + g.name + '</b>'; }).join(', ') + '이 있어요. 살이 세게 올라올 때 도와주는 사람과 기회가 함께 와요.</p></div>' : '') +
          adSlotHTML('살 풀이를 본 뒤');
      } else if (L.length > 1 || S.inc.length){
        h += '<div class="tj-sec tj-locked"><h4>남은 살 ' + (L.length - 1) + '개와 ' + TJ_YEAR + '년에 들어오는 살 ' + LOCK_SVG + '</h4><div class="sal-chips tj-blur" aria-hidden="true">' + L.slice(1).map(function(s){ return '<span>' + s.name + '</span>'; }).join('') + S.inc.map(function(n){ return '<span>' + n + '</span>'; }).join('') + '</div></div>' +
          '<div class="tj-buy"><b>모든 살의 강점·조심할 점·살풀이와 ' + TJ_YEAR + '년에 들어오는 살까지</b>' + passLinkHTML() + '<button class="btn-primary btn-block sheen" id="btnSalBuy">살 풀이 전체 보기 · ' + priceTag('sal') + '</button></div>';
      }
    }
    h = h.replace('<div class="sal-sheet">', '<div class="sal-sheet" data-mode="' + salMode + '">');
    h += '<p class="disclaimer">신살은 옛 명리의 참고 기준이에요. 재미로 보고, 좋은 쪽으로 쓰는 법만 가져가세요.</p>' +
      '<button class="text-btn" data-close>' + (open ? '닫기' : '나중에 볼게요') + '</button></div>';
    openSheet(h);
    $('sheetBody').querySelectorAll('[data-salm]').forEach(function(t){ t.onclick = function(){
      salMode = t.dataset.salm; var sh = $('sheetBody').querySelector('.sal-sheet'); sh.dataset.mode = salMode;
      $('sheetBody').querySelectorAll('[data-salm]').forEach(function(x){ x.setAttribute('aria-selected', x === t); });
    }; });
    if ($('btnSalBuy')) $('btnSalBuy').onclick = function(){ closeSheet(); setTimeout(function(){ openPaySheet('sal', { who:nm + '님', onPaid:function(){ openSal(me, r); } }); }, 260); };
  }

  /* ---------- 나를 돕는 귀인 풀이 (item 'gw', 2026-11-23 소율: 1·2·3만) ----------
     1. 내 사주에 든 귀인 — 귀인마다 옛풀이/요즘풀이
     2. 나를 돕는 사람 — 띠(천을귀인 자리 + 일지 육합), 일간(용신·정인), 성향
     3. 2027 귀인 오는 달 — 월지가 천을귀인 자리이거나 월간이 용신인 달 + 방향·장소
     무료: 첫 번째 귀인 하나. 나머지는 100닢 / 990원 */
  var GW_INFO = {
    '천을귀인':{ h:'天乙', k:'하늘이 보낸 가장 큰 귀인', old:'옛 책은 천을귀인을 ‘귀인 중의 으뜸’이라 했어요. 이 별이 든 사람은 흉한 일을 만나도 누군가 나타나 구해 주고, 관재와 병도 비켜 간다고 봤어요.', now:'막히는 순간에 꼭 손을 내미는 사람이 생기는 사주예요. 혼자 끙끙대기보다 먼저 도움을 청할 때 운이 열려요.', who:'윗사람, 선배, 오래 알던 어른' },
    '천덕귀인':{ h:'天德', k:'하늘의 덕이 지켜 주는 별', old:'천덕은 하늘의 덕이라, 이 별이 든 사람은 재앙이 와도 저절로 풀리고 평생 큰 화를 입지 않는다고 했어요.', now:'운이 나쁠 때도 바닥까지 떨어지지 않는 안전망이 있어요. 평소에 베푼 친절이 위기 때 그대로 돌아와요.', who:'마음씨 좋은 이웃, 뜻밖의 은인' },
    '월덕귀인':{ h:'月德', k:'달의 덕으로 부드럽게 풀리는 별', old:'월덕은 달의 덕이라 천덕과 짝을 이뤄 화를 복으로 바꾼다고 했어요. 성품이 온화하고 집안이 평안하다고 봤어요.', now:'갈등이 생겨도 크게 번지지 않고 말로 풀리는 편이에요. 중재자 역할을 맡으면 사람이 따라와요.', who:'가족, 동료, 같은 편이 되어 주는 친구' },
    '문창귀인':{ h:'文昌', k:'글과 공부로 돕는 별', old:'문창은 글의 별이라 총명하고 글재주가 뛰어나 과거에 급제한다고 했어요. 흉살을 만나도 학문으로 푼다고 봤어요.', now:'배우고 쓰는 일에서 도움이 와요. 시험, 자격증, 글쓰기, 발표 자리에서 좋은 스승과 기회를 만나요.', who:'선생님, 멘토, 책과 강의' },
    '학당귀인':{ h:'學堂', k:'배움의 집에 앉은 별', old:'학당은 배움의 집이라, 어려서부터 글을 좋아하고 이름이 난다고 했어요. 학자나 선생의 팔자로 봤어요.', now:'가르치고 배우는 관계에서 복이 커요. 스터디, 모임, 커뮤니티에서 평생 갈 사람을 만나요.', who:'함께 공부하는 사람, 제자, 후배' },
    '태극귀인':{ h:'太極', k:'끝과 시작을 잇는 별', old:'태극은 만물의 처음과 끝이라, 이 별이 든 사람은 복과 수명을 함께 누리고 신비한 일에 밝다고 했어요.', now:'직감이 좋고, 일이 꼬였을 때 처음부터 다시 짜는 힘이 있어요. 끝난 인연이 다시 이어져 돕는 일도 많아요.', who:'다시 연락 온 옛 인연, 깊은 대화가 통하는 사람' },
    '암록':{ h:'暗祿', k:'보이지 않게 들어오는 녹', old:'암록은 숨은 녹봉이라, 남모르게 재물이 들어오고 어려울 때 숨은 도움이 생긴다고 했어요.', now:'티 나지 않게 챙겨 주는 사람이 있어요. 소개, 추천, 입소문처럼 뒤에서 오는 기회가 많아요.', who:'나를 추천해 주는 사람, 조용한 후원자' },
    '금여':{ h:'金輿', k:'황금 수레를 타는 별', old:'금여는 황금 수레라, 좋은 배우자를 만나고 집안의 도움으로 편안히 산다고 했어요.', now:'곁에 있는 사람 덕을 보는 사주예요. 배우자, 연인, 동업자가 든든한 수레가 되어 줘요.', who:'배우자, 연인, 오래 함께할 파트너' }
  };
  var GW_ORDER = ['천을귀인', '천덕귀인', '월덕귀인', '문창귀인', '학당귀인', '태극귀인', '암록', '금여'];
  var GW_PERSON = [
    '새 일을 먼저 벌이고 끌어 주는 사람. 계획이 많고 앞을 내다보는 타입이에요.',
    '밝고 말이 시원한 사람. 분위기를 띄우고 나를 사람들 앞에 세워 줘요.',
    '느긋하고 믿음직한 사람. 약속을 꼭 지키고 흔들릴 때 중심을 잡아 줘요.',
    '똑 부러지고 원칙이 분명한 사람. 결정을 대신 정리해 주고 일을 마무리해 줘요.',
    '조용하지만 생각이 깊은 사람. 말을 잘 들어 주고 넓게 보는 조언을 해 줘요.'
  ];
  var GW_PLACE = [
    '공원, 서점, 강의실처럼 배우고 걷는 곳',
    '공연장, 모임, 사람이 북적이는 밝은 곳',
    '집 근처 단골 가게, 가족 모임, 오래 다닌 곳',
    '회의실, 은행, 정리된 사무 공간',
    '카페, 물가, 조용히 이야기 나누는 곳'
  ];
  var GW_POS = { year:'연주', month:'월주', day:'일주', hour:'시주' };
  function gwCalc(me, r){
    var P = r.pillars, keys = ['year', 'month', 'day', 'hour'].filter(function(k){ return P[k]; }), dS = P.day.stem, mB = P.month.br, list = [];
    function brAt(b){ return keys.filter(function(k){ return P[k].br === b; }); }
    function stAt(s){ return keys.filter(function(k){ return P[k].stem === s; }); }
    function add(n, at){ if (at.length && !list.some(function(x){ return x.name === n; })) list.push({ name:n, at:at }); }
    var CE = [[1,7],[0,8],[11,9],[11,9],[1,7],[0,8],[1,7],[2,6],[5,3],[5,3]][dS];
    add('천을귀인', keys.filter(function(k){ return CE.indexOf(P[k].br) > -1; }));
    /* 천덕: 월지마다 [천간=s/지지=b, 값] */
    var CD = [['b',5],['s',6],['s',3],['b',8],['s',8],['s',7],['b',11],['s',0],['s',9],['b',2],['s',2],['s',1]][mB];
    add('천덕귀인', CD[0] === 's' ? stAt(CD[1]) : brAt(CD[1]));
    var WD = [8,6,2,0,8,6,2,0,8,6,2,0][mB];   /* 申子辰→壬, 巳酉丑→庚, 寅午戌→丙, 亥卯未→甲 */
    add('월덕귀인', stAt(WD));
    add('문창귀인', brAt([5,6,8,9,8,9,11,0,2,3][dS]));
    add('학당귀인', brAt([11,6,2,9,2,9,5,0,8,3][dS]));
    var TG = [[0,6],[0,6],[3,9],[3,9],[4,10,1,7],[4,10,1,7],[2,11],[2,11],[5,8],[5,8]][dS];
    add('태극귀인', keys.filter(function(k){ return TG.indexOf(P[k].br) > -1; }));
    add('암록', brAt([11,10,8,7,8,7,5,4,2,1][dS]));
    add('금여', brAt([4,5,7,8,7,8,10,11,1,2][dS]));
    list.sort(function(a, b){ return GW_ORDER.indexOf(a.name) - GW_ORDER.indexOf(b.name); });
    /* 2. 나를 돕는 사람 */
    var HAP = [1,0,11,10,9,8,7,6,5,4,3,2];
    var ttis = CE.map(function(b){ return { b:b, why:'천을귀인 자리' }; });
    if (CE.indexOf(HAP[P.day.br]) < 0) ttis.push({ b:HAP[P.day.br], why:'내 일지와 합' });
    var yEl = r.yong, inEl = (MS.STEM_EL[dS] + 4) % 5;
    var yStems = [yEl * 2, yEl * 2 + 1];
    var jeongIn = inEl * 2 + (dS % 2 === 0 ? 1 : 0);   /* 정인: 나를 낳는 오행 중 음양이 다른 천간 */
    /* 3. 2027 귀인 오는 달 */
    var months = [];
    for (var m = 1; m <= 12; m++){
      var mp = MS.calc({ y:TJ_YEAR, m:m, d:20, cal:'solar', unknownTime:true, gender:'M', lonCorr:false }).pillars.month, v = 0, why = [];
      if (CE.indexOf(mp.br) > -1){ v += 3; why.push('천을귀인 자리(' + MS.BR_K[mp.br] + ')가 들어와요'); }
      if (MS.STEM_EL[mp.stem] === yEl){ v += 2; why.push('나를 돕는 ' + MS.EL_K[yEl] + ' 기운이 들어와요'); }
      if (mp.br === HAP[P.day.br]){ v += 2; why.push('내 일지와 합이 들어 마음 맞는 사람이 생겨요'); }
      if (MS.STEM_EL[mp.stem] === inEl){ v += 1; why.push('나를 받쳐 주는 인성 기운이 들어와요'); }
      if (v) months.push({ m:m, v:v, why:why, p:mp });
    }
    months.sort(function(a, b){ return b.v - a.v || a.m - b.m; });
    var top = months.slice(0, 3).sort(function(a, b){ return a.m - b.m; });
    var yearGui = CE.indexOf(7) > -1;   /* 2027 丁未 — 未가 천을귀인 자리 */
    return { list:list, ttis:ttis, yEl:yEl, inEl:inEl, yStems:yStems, jeongIn:jeongIn, top:top, yearGui:yearGui, CE:CE };
  }
  var gwMode = 'new';
  function gwCardHTML(g){
    var I = GW_INFO[g.name];
    return '<div class="tj-sec sal-card gw-card"><h4><span class="gw-seal" aria-hidden="true">' + I.h + '</span><span class="gw-n">' + g.name + '</span><small>' + I.k + ' · ' + g.at.map(function(a){ return GW_POS[a]; }).join('·') + '</small></h4>' +
      '<div class="sal-v sal-old"><p>' + I.old + '</p></div>' +
      '<div class="sal-v sal-new"><p>' + I.now + '</p></div>' +
      '<p class="gw-who"><b>이런 사람으로 와요</b> ' + I.who + '</p></div>';
  }
  function openGuin(me, r){
    setTimeout(function(){ bond('today'); }, 900);
    var G = gwCalc(me, r), open = owns('gw') || passActive(), nm = esc(me.name), L = G.list;
    var sec = function(n, t, body){ return '<div class="tj-sec gw-sec"><h4><em>' + n + '</em>' + t + '</h4>' + body + '</div>'; };
    var h = '<div class="sal-sheet gw-sheet" data-mode="' + gwMode + '"><div class="sheet-fig">' + uniImg('wooni-joa') + '</div>' +
      '<h3 id="sheetTitle">' + nm + '님을 돕는 귀인</h3>' +
      '<p class="helper" style="margin:-4px 0 12px">귀인(貴人)은 내 사주에 든 ‘도와주는 별’이에요. 어떤 사람이, 언제, 어디서 오는지 알려 드려요.</p>' +
      '<div class="sal-mode" role="tablist" aria-label="풀이 방식"><button type="button" role="tab" data-gwm="old" aria-selected="' + (gwMode === 'old') + '">옛풀이<small>옛 명리 책 그대로</small></button><button type="button" role="tab" data-gwm="new" aria-selected="' + (gwMode === 'new') + '">요즘풀이<small>지금 생활로 바꿔서</small></button></div>' +
      '<div class="sal-chips gw-chips">' + (L.length ? L.map(function(g, i){ return '<span class="' + (i === 0 || open ? 'on' : '') + '">' + g.name + '</span>'; }).join('') : '<span>원국에 든 귀인 없음</span>') + '</div>';
    h += '<h4 class="gw-part"><em>1</em>내 사주에 든 귀인</h4>';
    if (!L.length) h += '<div class="tj-sec"><p>' + nm + '님 원국에는 귀인 별이 드러나 있지 않아요. 이런 사주는 남에게 귀인이 되어 주면서 운을 쌓는 타입이에요. 대신 해마다 들어오는 귀인의 달을 잘 잡으면 돼요.</p></div>';
    else h += gwCardHTML(L[0]);
    var ttiTxt = G.ttis.map(function(t){ return '<span class="gw-tti"><b>' + MS.BR_ANIMAL[t.b] + '띠</b><small>' + t.why + '</small></span>'; }).join('');
    var p2 = sec(2, '나를 돕는 사람',
      '<p class="gw-k">띠</p><div class="gw-ttis">' + ttiTxt + '</div>' +
      '<p class="gw-k">일간</p><p><b>' + MS.STEM_K[G.yStems[0]] + '·' + MS.STEM_K[G.yStems[1]] + ' (' + MS.EL_K[G.yEl] + ') 일간</b>은 ' + nm + '님에게 모자란 ' + MS.EL_K[G.yEl] + ' 기운을 채워 줘요. 함께 있으면 일이 술술 풀려요.</p>' +
      '<p><b>' + MS.STEM_K[G.jeongIn] + ' (' + MS.EL_K[G.inEl] + ') 일간</b>은 정인, 곧 어머니 같은 자리예요. 말없이 받쳐 주고 내 편이 되어 줘요.</p>' +
      '<p class="gw-k">성향</p><p>' + GW_PERSON[G.yEl] + '</p>');
    var p3 = sec(3, TJ_YEAR + '년 귀인이 오는 달',
      (G.yearGui ? '<p class="gw-hl">' + TJ_YEAR + '년 정미(丁未)년은 未가 ' + nm + '님의 천을귀인 자리예요. 한 해 내내 도와주는 사람이 가까이 있어요.</p>' : '') +
      (G.top.length ? '<ul class="gw-months">' + G.top.map(function(x){ return '<li><b>' + x.m + '월</b><span>' + x.why[0] + '</span></li>'; }).join('') + '</ul>' : '<p>올해는 귀인이 크게 몰리는 달이 없어요. 대신 꾸준히 만나는 사람에게서 도움이 와요.</p>') +
      '<div class="gw-dp"><div><small>귀인이 오는 방향</small><b>' + EL_TEXT[G.yEl].dir + '</b></div><div><small>만나기 좋은 곳</small><b>' + GW_PLACE[G.yEl] + '</b></div></div>');
    if (open){
      h += L.slice(1).map(gwCardHTML).join('') + p2 + p3 + adSlotHTML('귀인 풀이를 본 뒤');
    } else {
      h += '<div class="tj-sec tj-locked"><h4>' + (L.length > 1 ? '남은 귀인 ' + (L.length - 1) + '개 · ' : '') + '나를 돕는 사람 · ' + TJ_YEAR + '년 귀인 오는 달 ' + LOCK_SVG + '</h4>' +
        '<div class="sal-chips tj-blur" aria-hidden="true">' + L.slice(1).map(function(g){ return '<span>' + g.name + '</span>'; }).join('') + '<span>○○띠</span><span>○·○ 일간</span><span>○월 · ○월 · ○월</span><span>방향 · 장소</span></div></div>' +
        '<div class="tj-buy"><b>나를 돕는 띠·일간·성향과 ' + TJ_YEAR + '년 귀인이 오는 달까지</b>' + passLinkHTML() + '<button class="btn-primary btn-block sheen" id="btnGwBuy">귀인 풀이 전체 보기 · ' + priceTag('gw') + '</button></div>';
    }
    h += '<p class="disclaimer">귀인은 옛 명리의 신살 기준으로 봤어요. 재미로 보고, 좋은 인연을 알아보는 데만 가볍게 쓰세요.</p>' +
      '<button class="text-btn" data-close>' + (open ? '닫기' : '나중에 볼게요') + '</button></div>';
    openSheet(h);
    $('sheetBody').querySelectorAll('[data-gwm]').forEach(function(t){ t.onclick = function(){
      gwMode = t.dataset.gwm; $('sheetBody').querySelector('.gw-sheet').dataset.mode = gwMode;
      $('sheetBody').querySelectorAll('[data-gwm]').forEach(function(x){ x.setAttribute('aria-selected', x === t); });
    }; });
    if ($('btnGwBuy')) $('btnGwBuy').onclick = function(){ closeSheet(); setTimeout(function(){ openPaySheet('gw', { who:nm + '님', onPaid:function(){ openGuin(me, r); } }); }, 260); };
  }

  /* ---------- 풀이 전 '우니가 분석 중' 로딩 (2026-11-23 소율: 결과가 너무 빨리 나오면 믿음이 안 간다) ----------
     세션마다 (풀이 · 사람 · 열림 여부) 처음 한 번만 1.8초 보여 준다. 같은 화면 안에서 달·목적을 바꿀 때는 다시 안 나온다.
     줄임 모션·라이트 모드는 0.9초. */
  var loadSeen = {};
  var LOAD_STEPS = {
    gw:['여덟 글자에서 귀인 별 찾기', '나를 돕는 띠·일간 맞춰 보기', TJ_YEAR + '년 달마다 귀인 자리 대 보기'],
    sal:['여덟 글자에서 신살 찾기', '살마다 자리(연·월·일·시) 맞춰 보기', '2027년 정미년 기운 겹쳐 보기'],
    tj:['태어난 해·달·날 괘 세우기', '상반기·하반기 흐름 읽기', '달마다 한 줄 풀이 정리'],
    wl:['재성(재물 별) 자리 찾기', '대운 10년마다 재물 흐름 계산', '돈이 들어오는 길과 새는 길 정리'],
    lv:['인연의 별(관성·재성) 찾기', '10년 연애운·결혼운 그래프 그리기', '인연이 가까운 해와 달 고르기'],
    fc:['오늘부터 날마다 일진 계산', '내 용신과 날마다 맞춰 보기', '좋은 날·조심할 날 표시'],
    tk:['1년 365일 일진 펼치기', '목적에 맞는 길일 조건 대 보기', '내 사주와 부딪히는 날 빼기'],
    ny:['2027년 세운 펼치기', '내 원국과 올해 기운 맞춰 보기', '달마다 흐름 정리'],
    cat:['오늘 일진 계산', '분야별 십성 맞춰 보기', '오늘의 처방 고르기']
  };
  function uniLoad(key, me, title, done){
    if (loadSeen[key]){ done(); return; }
    loadSeen[key] = 1;
    var name = LOAD_STEPS[key.split('|')[0]] || LOAD_STEPS.cat;
    var fast = reduceMotion || document.documentElement.getAttribute('data-perf') === 'lite', T = fast ? 900 : 1800;
    openSheet('<div class="uload" role="status" aria-live="polite" style="--t:' + T + 'ms"><div class="uload-fig">' + uniImg('u-thinking') + '<span class="uload-ring" aria-hidden="true"></span></div>' +
      '<h3 id="sheetTitle">' + esc(me.name) + '님 ' + title + '</h3><p class="helper">우니가 사주를 펼쳐서 보는 중이에요</p>' +
      '<ol class="uload-steps">' + name.map(function(t, i){ return '<li style="--d:' + Math.round(T * (i + .4) / (name.length + .4)) + 'ms">' + t + '</li>'; }).join('') + '</ol>' +
      '<div class="uload-bar"><i></i></div></div>');
    var at = $('sheetBody').querySelector('.uload');
    setTimeout(function(){ if ($('sheetBody').contains(at)) done(); }, T + 150);
  }
  function withLoad(id, title, fn, isOpen){
    return function(me, r){
      var args = arguments, run = function(){ fn.apply(null, args); };
      if (!me || !me.name){ run(); return; }
      var key = id + '|' + (me.id || me.name) + '|' + (id === 'cat' ? args[2] + '|' : '') + (isOpen ? (isOpen.apply(null, args) ? 1 : 0) : 0);
      uniLoad(key, me, title, run);
    };
  }
  openSal = withLoad('sal', '살 풀이', openSal, function(){ return owns('sal') || passActive(); });
  openGuin = withLoad('gw', '귀인 풀이', openGuin, function(){ return owns('gw') || passActive(); });
  openTojeong = withLoad('tj', '2027 토정비결', openTojeong, function(){ return owns('tj') || passActive(); });
  openWealth = withLoad('wl', '재물 그릇', openWealth, function(){ return owns('wl') || passActive(); });
  openLoveTiming = withLoad('lv', '연애·결혼 시기', openLoveTiming, function(){ return owns('lv') || passActive(); });
  openFortuneCal = withLoad('fc', '운세 달력', openFortuneCal, function(){ return owns('cal') || passActive(); });
  openTaekil = withLoad('tk', '중요한 날', openTaekil);
  openNYSheet = withLoad('ny', '2027 신년운세', openNYSheet);
  openCat = withLoad('cat', '분야별 운세', openCat, function(e, r, c){ return catPaid(c); });

  /* ---------- 우니에게 묻기 (AI 사주 상담, item 'chat') ----------
     /api/chat 이 내 사주 요약을 근거로 짧게 답한다(키가 없거나 막히면 서버가 사주 규칙으로 답을 만든다).
     하루 1번 무료 · 하루 무제한 대화권 = 100닢(990원), 산 날 자정(한국 시간)까지 · 우니 패스도 무제한
     (2026-11-23 소율: 사주에 맞춰 답하니 같은 주제는 답이 비슷할 수밖에 없다 → 횟수권 대신 '하루 무제한 대화권'을 판다) */
  var CHAT_FREE = 1;
  var CHAT_SALE = true;
  var CHAT_TOPICS = [['love','연애'],['marry','결혼'],['work','일·직장'],['study','시험·공부'],['money','돈'],['people','인간관계'],['family','가족'],['mind','마음'],['move','이사·이동'],['self','나라는 사람'],['day','오늘 하루'],['etc','그 밖에']];
  var CHAT_HI = { love:'연애 이야기군요.', marry:'결혼 이야기군요.', work:'일 이야기군요.', study:'시험·공부 이야기군요.', money:'돈 이야기군요.', people:'사람 사이 이야기군요.', family:'가족 이야기군요.', mind:'마음이 많이 쓰였군요.', move:'자리를 옮기는 이야기군요.', self:'나 자신이 궁금하군요.', day:'오늘 하루가 궁금하군요.', etc:'어떤 고민이든 좋아요.' };
  function chatDay(){ var c = store('unsu_chat_day'); return c && c.d === todayStr() ? c.n : 0; }
  function chatUnl(){ return passActive() || store('unsu_chat_unl') === todayStr(); }   /* 오늘 무제한(대화권·패스) */
  function chatLeftFree(){ return chatUnl() ? 99 : Math.max(0, CHAT_FREE - chatDay()); }
  /* 서버가 원국을 엔진으로 다시 계산하도록 생년월일 원본을 보낸다(2026-11-23 AI 재설계: LLM이 원국을 계산하지 않게) */
  function chatBirth(me){
    return { y:me.y, m:me.m, d:me.d, cal:me.cal, leap:!!me.leap, hour:me.unknown ? null : me.hour, minute:me.unknown ? null : me.minute, unknown:!!me.unknown, gender:me.gender, corr:me.corr !== false };
  }
  function chatLog(){ var l = store('unsu_chat_log'); return Array.isArray(l) ? l : []; }

  /* ---------- 우니에게 묻기 = 채팅 화면 (2026-11-23 소율: '헬로우봇처럼 채팅으로' — 구조만 참고, 그림·캐릭터·문구는 우니조아 것) ----------
     우니 말풍선이 이어서 나오고(타이핑 표시) → 고민 주제 칩 → 예시 질문 칩/직접 입력 → 답은 문단마다 말풍선 → 같이 보면 좋은 풀이 카드 → 다음 칩.
     대화 기록(unsu_chat_log)은 이 기기에만 저장. 무료 횟수·질문권 규칙은 그대로. */
  var askTopic = 'love', akSeq = 0;
  var CHAT_EX = {
    love:['그 사람과 잘 될까요?', '올해 연애운은 어때요?', '헤어진 사람과 다시 만날 수 있을까요?'],
    marry:['저는 언제쯤 결혼할까요?', '지금 만나는 사람과 결혼해도 될까요?', '어떤 배우자가 잘 맞을까요?'],
    study:['이번 시험 잘 볼 수 있을까요?', '공부가 손에 안 잡혀요', '저한테 맞는 공부법이 있을까요?'],
    family:['부모님과 자꾸 부딪혀요', '형제와 사이가 멀어졌어요', '아이와 잘 지내는 법이 있을까요?'],
    mind:['요즘 마음이 많이 지쳐요', '불안한 마음이 자꾸 들어요', '혼자인 것 같아 외로워요'],
    move:['올해 이사해도 괜찮을까요?', '해외로 가 보고 싶어요', '어느 방향이 저한테 좋을까요?'],
    self:['제 성격의 장점은 뭐예요?', '저는 어떤 사람이에요?', '제가 고치면 좋을 습관이 있을까요?'],
    work:['올해 이직해도 괜찮을까요?', '저한테 맞는 일은 뭘까요?', '이번 면접 잘 볼 수 있을까요?'],
    money:['올해 돈이 좀 모일까요?', '제가 돈이 새는 습관이 있을까요?', '부업을 시작해도 될까요?'],
    people:['자꾸 서운한 친구, 어떻게 할까요?', '직장 사람들과 잘 지내는 법이 있을까요?', '새 모임에서 잘 어울릴 수 있을까요?'],
    day:['오늘 조심할 게 있을까요?', '오늘 고백해도 될까요?', '오늘 중요한 미팅이 있어요'],
    etc:['올해 저한테 가장 중요한 건 뭘까요?', '요즘 운이 막힌 느낌이에요', '새로운 걸 시작해도 될까요?']
  };
  var CHAT_RECS = { love:['lv','gh','fc'], marry:['lv','gh','tk'], work:['tk','job','ny'], study:['job','fc','fill'], money:['wl','tj','ny'], people:['gh','book','fill'], family:['gh','book','tj'], mind:['fill','sal','book'], move:['tk','fc','ny'], self:['book','sal','wl'], day:['fill','fc','tk'], etc:['book','ny','dream'] };
  function openChat(me, r, topic){ if (topic) askTopic = topic; closeSheet(); renderAsk(); if (currentView !== 'ask') show('ask'); }
  function akT(t){ var d = t ? new Date(t) : new Date(), h = d.getHours(); return (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + ('0' + d.getMinutes()).slice(-2); }
  function akBot(inner, first){ return '<div class="ak-g bot' + (first ? ' first' : '') + '">' + (first ? '<span class="ak-av">' + uniImg('u-calm') + '</span><b class="ak-who">우니</b>' : '') + inner + '</div>'; }
  function akB(html){ return '<p class="ak-b">' + html + '</p>'; }
  function akMe(text, t){ return '<div class="ak-g me"><p class="ak-b">' + esc(text) + '</p><time>' + akT(t) + '</time></div>'; }
  function akParas(a){ return String(a || '').split(/\n\s*\n/).map(function(x){ return x.trim(); }).filter(Boolean).map(function(x){ return akB(esc(x).replace(/\n/g, '<br>')); }); }
  /* 내 원국 미니 카드: 시·일·월·년 순서, 오행 색 */
  function akSajuCard(me, r){
    var P = r.pillars, cols = [['hour','시'],['day','일'],['month','월'],['year','년']].map(function(k){
      var p = P[k[0]];
      return '<span class="ak-pc' + (k[0] === 'day' ? ' me' : '') + '"><small>' + k[1] + '</small>' + (p ? '<i style="--c:' + EL_HEX[p.sEl] + '">' + p.sh + '</i><i style="--c:' + EL_HEX[p.bEl] + '">' + p.bh + '</i>' : '<i class="no">?</i><i class="no">?</i>') + '</span>';
    }).join('');
    var dS = P.day.stem;
    return '<div class="ak-saju" aria-label="' + esc(me.name) + '님 사주 원국"><div class="ak-pcs">' + cols + '</div><p><b>' + MS.STEM_K[dS] + MS.EL_K[MS.STEM_EL[dS]] + ' 일간</b> · ' + r.strength + ' · 힘이 되는 기운 <b style="color:' + EL_HEX[r.yong] + '">' + MS.EL_K[r.yong] + '</b></p></div>';
  }
  function akRecs(me, topic){
    var all = {}; topicGroups().forEach(function(g){ g[1].forEach(function(x){ all[x[0]] = x; }); });
    all.fill = ['fill', 'u-pouch', '오늘의 행운 부적', '오늘 내 기운에 맞는 색·방향·아이템', '무료'];
    return '<div class="ak-recs">' + (CHAT_RECS[topic] || CHAT_RECS.etc).map(function(k){
      var x = all[k]; if (!x) return '';
      return '<button type="button" class="ak-rc" data-akrec="' + k + '"><span class="ak-rc-art">' + uniImg(x[1]) + '</span><b>' + x[2] + '</b><small>' + x[3] + '</small>' + (x[4] ? '<em>' + x[4] + '</em>' : '') + '<span class="ak-rc-go">보러 가기</span></button>';
    }).join('') + '</div>';
  }
  function akMeta(){
    return passActive() ? '패스 · 무제한' : chatUnl() ? '오늘 무제한' : chatLeftFree() ? '오늘 무료 ' + chatLeftFree() + '번' : '무료 질문 끝';
  }
  function akCan(){ return chatLeftFree() > 0; }
  function renderAsk(){
    var me = getMe(), box = $('askBody'); if (!box) return;
    akSeq++;
    if (!me){
      box.innerHTML = (NS ? demoBarHTML() : '') + '<div class="ak ak-guest"><div class="ak-stream">' +
        akBot(uniImg('u-wave', 'ak-sticker') + akB('안녕하세요! 저는 우니예요.') + akB('생년월일을 알려 주면 사주를 펼쳐 보고 연애, 일, 돈, 사람 고민에 답해 드릴게요. 하루 한 번은 무료예요.'), true) +
        '</div><button class="btn-primary btn-block sheen" id="askStart">내 사주 등록하고 우니와 이야기하기</button></div>';
      $('askStart').onclick = function(){ startOnboarding('new'); };
      bindDemoBar();
      return;
    }
    var r = compute(me); if (r.error){ box.innerHTML = ''; return; }
    var log = chatLog().filter(function(x){ return x.who === me.id; }).slice(-8);
    var now = new Date();
    box.innerHTML = (NS ? demoBarHTML() : '') +
      '<div class="ak">' +
      '<header class="ak-head"><span class="ak-hav">' + uniImg('u-calm') + '<i aria-hidden="true"></i></span><div><b>우니</b><small>' + esc(me.name) + '님 사주를 읽고 있어요</small></div><span class="ak-left" id="akLeft">' + akMeta() + '</span></header>' +
      '<div class="ak-stream" id="chatLog" aria-live="polite">' +
      (log.length ? '<div class="ak-day"><span>지난 이야기</span></div>' + log.map(function(x){ return akMe(x.q, x.t) + akBot(akParas(x.a).join(''), true); }).join('') : '') +
      '<div class="ak-day"><span>' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일</span></div>' +
      '</div>' +
      '<div class="ak-dock"><div class="ak-qr" id="akQr" role="group" aria-label="빠른 답장"></div>' +
      '<form class="ak-bar" id="akBar" autocomplete="off"><textarea id="chatQ" maxlength="200" rows="1" placeholder="우니에게 고민을 적어 보세요" aria-label="질문"></textarea><button class="ak-send" id="chatGo" aria-label="보내기"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg></button></form></div>' +
      '<p class="disclaimer ak-disc">AI가 사주를 바탕으로 만든 재미용 답변이에요. 건강·법률·투자처럼 중요한 결정은 전문가와 상의해 주세요. 질문과 생년월일은 답을 만들 때만 쓰고 서버에 남기지 않아요. 대화 기록은 이 기기에만 저장돼요.</p>' +
      '</div>';
    bindDemoBar();
    var q = $('chatQ');
    q.oninput = function(){ q.style.height = 'auto'; q.style.height = Math.min(q.scrollHeight, 120) + 'px'; };
    q.onkeydown = function(e){ if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); $('akBar').requestSubmit ? $('akBar').requestSubmit() : $('chatGo').click(); } };
    $('akBar').onsubmit = function(e){
      e.preventDefault();
      if (!akCan()){ if (CHAT_SALE) chatBuy(me, r, askTopic); else toast('오늘 무료 질문은 다 썼어요. 내일 다시 물어봐 주세요'); return; }
      var v = q.value.replace(/\s+/g, ' ').trim();
      if (v.length < 4){ toast('질문을 조금만 더 자세히 적어 주세요'); q.focus(); return; }
      chatAsk(me, r, askTopic, v);
    };
    akInputState();
    if (log.length) akSay([akB('또 궁금한 게 있으면 편하게 물어봐 주세요. 어떤 이야기를 할까요?')], function(){ akTopics(); }, true);
    else akSay([uniImg('u-wave', 'ak-sticker'), akB('안녕하세요, ' + esc(me.name) + '님! 저는 우니예요.'), akB(esc(me.name) + '님 사주를 먼저 펼쳐 봤어요.') + akSajuCard(me, r), akB('이 여덟 글자를 보면서 고민에 답해 드릴게요. 요즘 제일 마음 쓰이는 게 뭐예요?')], function(){ akTopics(); });
    function akTopics(){
      akChips(CHAT_TOPICS.map(function(t){ return [t[1], function(){ askTopic = t[0]; akUser(t[1]); akSay([akB(CHAT_HI[t[0]] + ' 이런 걸 많이 물어봐요. 골라도 되고, 아래에 직접 적어도 돼요.')], akExamples); }]; }));
    }
    function akExamples(){
      if (!akCan()){ akOut(); return; }
      akChips(CHAT_EX[askTopic].map(function(x){ return [x, function(){ chatAsk(me, r, askTopic, x); }]; }).concat([['직접 쓸게요', function(){ akChips([]); q.focus(); }, 'ghost']]));
    }
    renderAsk.after = function(topic){
      akSay([akB('이 고민이랑 같이 보면 좋은 풀이예요.') + akRecs(me, topic)], function(){
        box.querySelectorAll('[data-akrec]').forEach(function(b){ if (b.onclick) return; b.onclick = function(){
          var k = b.dataset.akrec; if (k === 'fill'){ go('num'); window.scrollTo(0, 0); return; }
          var fn = topicActs(me, r)[k]; if (fn) fn();
        }; });
        if (!akCan()){ akOut(); return; }
        akChips([['더 물어볼래요', function(){ akChips([]); q.focus(); }], ['다른 고민', function(){ akUser('다른 고민도 있어요'); akSay([akB('좋아요. 어떤 이야기를 할까요?')], akTopics); }], ['예시 더 보기', akExamples, 'ghost']]);
      });
    };
    function akOut(){
      akInputState();
      akSay([akB('오늘 무료 질문은 다 썼어요. 내일 다시 한 번 무료로 물어볼 수 있어요.')].concat(CHAT_SALE ? [akB('오늘 더 이야기하고 싶다면 <b>하루 무제한 대화권</b>으로 오늘 자정까지 마음껏 물어볼 수 있어요.') + akPassCard()] : []), function(){
        var pcs = $('chatLog').querySelectorAll('.ak-pass button'), pc = pcs[pcs.length - 1]; if (pc) pc.onclick = function(){ chatBuy(me, r, askTopic); };
        akChips((CHAT_SALE ? [['하루 무제한 대화권 · ' + priceTag('chat'), function(){ chatBuy(me, r, askTopic); }]] : []).concat([['내일 할게요', function(){ akChips([]); akUser('내일 다시 올게요'); akSay([akB('좋아요, 내일 기다릴게요. 그동안 오늘의 행운 부적도 열어 보세요.') + akRecs(me, 'day')], function(){ box.querySelectorAll('[data-akrec]').forEach(function(b){ if (b.onclick) return; b.onclick = function(){ var k = b.dataset.akrec; if (k === 'fill'){ go('num'); window.scrollTo(0, 0); return; } var fn = topicActs(me, r)[k]; if (fn) fn(); }; }); }); }, 'ghost']]));
      });
    }
    renderAsk.out = akOut;
  }
  function akInputState(){
    var q = $('chatQ'), can = akCan(); if (!q) return;
    q.placeholder = can ? '우니에게 고민을 적어 보세요' : '대화권이 있으면 계속 물어볼 수 있어요';
    if ($('akLeft')) $('akLeft').textContent = akMeta();
  }
  /* 우니 말풍선을 하나씩(타이핑 표시 → 말풍선). instant 면 바로. 화면을 다시 그리면(akSeq 바뀜) 멈춘다 */
  function akSay(parts, done, instant){
    var seq = akSeq, lg = $('chatLog'); if (!lg) return;
    var fast = instant || reduceMotion || document.documentElement.getAttribute('data-perf') === 'lite';
    var g = document.createElement('div'); g.className = 'ak-g bot first';
    g.innerHTML = '<span class="ak-av">' + uniImg('u-calm') + '</span><b class="ak-who">우니</b>';
    lg.appendChild(g);
    var i = 0;
    (function next(){
      if (seq !== akSeq) return;
      if (i >= parts.length){ g.insertAdjacentHTML('beforeend', '<time>' + akT() + '</time>'); akScroll(); if (done) done(); return; }
      if (fast){ g.insertAdjacentHTML('beforeend', parts[i++]); next(); return; }
      g.insertAdjacentHTML('beforeend', '<p class="ak-b typing" aria-label="우니가 쓰는 중"><i></i><i></i><i></i></p>'); akScroll();
      setTimeout(function(){
        if (seq !== akSeq) return;
        var t = g.querySelector('.typing'); if (t) t.remove();
        g.insertAdjacentHTML('beforeend', parts[i++]); g.lastElementChild.classList.add('ak-in'); akScroll();
        next();
      }, Math.min(1100, 380 + String(parts[i]).replace(/<[^>]+>/g, '').length * 9));
    })();
  }
  function akUser(text){ var lg = $('chatLog'); if (!lg) return; akChips([]); lg.insertAdjacentHTML('beforeend', akMe(text)); akScroll(); }
  function akChips(list){
    var qr = $('akQr'); if (!qr) return;
    qr.innerHTML = list.map(function(c, i){ return '<button type="button" class="ak-chip' + (c[2] ? ' ' + c[2] : '') + '" data-akc="' + i + '">' + esc(c[0]) + '</button>'; }).join('');
    qr.querySelectorAll('[data-akc]').forEach(function(b){ b.onclick = function(){ list[+b.dataset.akc][1](); }; });
    if (list.length) akScroll();
  }
  /* 문서 맨 끝(푸터)까지 내리지 않고, 입력창 바로 위에 마지막 말풍선이 오도록 맞춘다 */
  function akScroll(){ requestAnimationFrame(function(){
    var disc = document.querySelector('.ak-disc'), dock = $('akBar'); if (!disc || !dock) return;
    var tb = document.querySelector('.tabbar'), gap = (tb ? tb.getBoundingClientRect().height : 80) + 24;
    var top = window.scrollY + disc.getBoundingClientRect().top - window.innerHeight + gap;
    if (top > window.scrollY) window.scrollTo({ top:top, behavior:reduceMotion ? 'auto' : 'smooth' });
  }); }
  /* 하루 무제한 대화권 카드(채팅 안 말풍선) */
  function akPassCard(){
    return '<div class="ak-pass"><span class="ak-pass-art">' + uniImg('u-love') + '</span><div><b>하루 무제한 대화권</b><small>오늘 자정까지 질문 수 제한 없이 · 주제 상관없이</small></div><em>' + priceTag('chat') + '</em><button type="button" class="btn-primary">대화권 받기</button></div>';
  }
  function chatBuy(me, r, topic){
    if (isGuest()){ openLoginSheet('로그인하면 엽전 ' + SIGNUP_COINS.toLocaleString() + '닢을 드려요. 하루 무제한 대화권은 ' + COST.chat + '닢이에요.'); return; }
    openChoice({ k:'chat', name:'하루 무제한 대화권', who:'오늘 ' + todayStr().slice(5).replace('-', '월 ') + '일 자정까지', art:'book',
      items:['오늘 자정(한국 시간)까지 우니에게 질문 수 제한 없이', '연애·일·돈·가족·마음 등 12가지 주제 모두', '내 사주 원국과 오늘 일진을 바탕으로 한 답'],
      coin:COST.chat, item:'chat:' + todayStr(), keep:'산 날 자정까지 쓸 수 있어요', rs:{ k:'chat', id:me.id, topic:topic },
      onOpen:function(){ store('unsu_chat_unl', todayStr()); closeSheet(); toast('오늘 자정까지 우니와 마음껏 이야기할 수 있어요'); openChat(me, r, topic); } });
  }
  var chatBusy = false;
  function chatAsk(me, r, topic, q){
    if (chatBusy) return; chatBusy = true;
    var go = $('chatGo'), qi = $('chatQ'), seq = akSeq;
    akUser(q); qi.value = ''; qi.style.height = ''; go.disabled = true;
    var lg = $('chatLog');
    lg.insertAdjacentHTML('beforeend', akBot('<p class="ak-b typing" aria-label="우니가 사주를 보는 중"><i></i><i></i><i></i></p><small class="ak-note">' + esc(me.name) + '님 여덟 글자를 다시 보는 중…</small>', true).replace('class="ak-g bot first"', 'class="ak-g bot first" id="chatTyping"'));
    akScroll();
    var hist = chatLog().filter(function(x){ return x.who === me.id; }).slice(-2).map(function(x){ return { q:x.q, a:String(x.a).slice(0, 400) }; });
    var useFree = chatLeftFree() > 0;
    function fail(msg){ chatBusy = false; if ($('chatTyping')) $('chatTyping').remove(); if ($('chatGo')) $('chatGo').disabled = false; toast(msg); }
    fetch('/api/chat', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ q:q, topic:topic, name:String(me.name || '').slice(0, 12), birth:chatBirth(me), hist:hist }) })
      .then(function(res){ return res.json().then(function(j){ return { ok:res.ok, j:j }; }); })
      .then(function(o){
        if (!o.ok || !o.j.answer){ fail(o.j && o.j.error === 'personal_info' ? '전화번호 같은 개인정보는 빼고 물어봐 주세요' : o.j && o.j.error === 'banned_word' ? '고운 말로 다시 물어봐 주세요' : o.j && o.j.error === 'rate' ? '조금만 쉬었다가 다시 물어봐 주세요' : '지금은 답을 만들지 못했어요. 잠시 뒤 다시 물어봐 주세요'); return; }
        chatBusy = false;
        if (useFree && !chatUnl()) store('unsu_chat_day', { d:todayStr(), n:chatDay() + 1 });
        var tp = CHAT_EX[o.j.topic] ? o.j.topic : topic; askTopic = tp;
        var l = chatLog(); l.push({ who:me.id, t:Date.now(), topic:tp, q:q, a:o.j.answer }); if (l.length > 40) l = l.slice(-40); store('unsu_chat_log', l);
        if (seq !== akSeq || !$('chatTyping')) return;
        $('chatTyping').remove(); if ($('chatGo')) $('chatGo').disabled = false;
        akInputState();
        akSay(akParas(o.j.answer), function(){ if (renderAsk.after) renderAsk.after(tp); });
      }, function(){ fail('연결이 불안정해요. 잠시 뒤 다시 물어봐 주세요'); });
  }
  function product(id){
    return ({
      gh:{ id:'gh', name:'궁합 상세 리포트', coin:COST.gh, art:'gh', keep:'이 두 사람의 리포트는 계속 볼 수 있어요', items:['두 사람의 기질 비교','관계에서 빛나는 점과 부딪히기 쉬운 점','대화 팁과 올해 두 사람의 흐름'] },
      cal:{ id:'cal', name:'월별 운세 달력 12개월', coin:COST.cal, art:'book', keep:'저장한 모든 사람의 달력을 계속 볼 수 있어요', items:['다음 달부터 12개월 날마다 점수','달마다 좋은 날·조심할 날','달마다 흐름 한 줄'] },
      lv:{ id:'lv', name:'연애·결혼 시기', coin:COST.lv, art:'gh', keep:'저장한 모든 사람의 연애·결혼 시기를 계속 볼 수 있어요', items:['10년 연애운·결혼운 그래프','인연이 가장 가까운 해와 천천히 갈 해','2027년 인연 달과 잘 맞는 사람'] },
      tj:{ id:'tj', name:'2027 토정비결', coin:COST.tj, art:'book', keep:'저장한 모든 사람의 토정비결을 계속 볼 수 있어요', items:['상반기·하반기 풀이','4~12월 달마다 한 줄','좋은 달과 조심할 달, 한 해 처방'] },
      wl:{ id:'wl', name:'내 재물 그릇 2~6장', coin:COST.wl, art:'book', keep:'저장한 모든 사람의 재물 그릇을 계속 볼 수 있어요', items:['돈이 들어오는 길과 새는 길','평생 재물 흐름(대운 10년 단위)과 크게 들어오는 시기 3번','나에게 맞는 돈 버는 방식과 2027년 재물 처방'] },
      sal:{ id:'sal', name:'나에게 든 살 풀이', coin:COST.sal, art:'book', keep:'저장한 모든 사람의 살 풀이를 계속 볼 수 있어요', items:['내 사주에 든 모든 살 · 옛풀이와 요즘풀이로 나눠 보기','살마다 복으로 바꾸는 살풀이','2027년 정미년에 새로 들어오는 살'] },
      gw:{ id:'gw', name:'나를 돕는 귀인 풀이', coin:COST.gw, art:'book', keep:'저장한 모든 사람의 귀인 풀이를 계속 볼 수 있어요', items:['내 사주에 든 모든 귀인 · 옛풀이와 요즘풀이','나를 돕는 띠·일간·성향','2027년 귀인이 오는 달과 방향·장소'] },
      ez:{ id:'ez', name:'사주 이야기책 2~6장', coin:COST.ez, art:'book', keep:'구입한 뒤 계정에서 계속 다시 읽을 수 있어요', items:['2장 기둥마다 들여다보기 · 월주·일주·시주','3장 내 안의 다섯 가지 힘(십성)','4장 나를 돕는 귀인과 특별한 별','5~6장 10년 계절(대운)과 올해·이번 달'] }
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
    var P = product(id), item = id === 'gh' ? 'gh:' + String(opt.ghKey || '').replace(/\s+/g, '') : id;
    openChoice({ k:id, name:P.name, who:opt.who, items:P.items, coin:P.coin, art:P.art, keep:P.keep, item:item,
      rs:{ k:'pay', pid:id, ghKey:id === 'gh' ? opt.ghKey : null },
      onOpen:function(){ addOrder(id, { ghKey:id === 'gh' ? opt.ghKey : null }); closeSheet(); setTimeout(function(){ if (opt.onPaid) opt.onPaid(); toast(P.name + ' 열렸어요'); }, 260); } });
  }
  /* 공통 상품 상세 (2026-11-21 GPT 최종 검토): 받는 내용 → 원화 결제(판매 중인 상품만) / 무료 적립 엽전 사용을 따로 고른다.
     o: { k 가격 키, name, who, items[], coin, art, keep, item 서버 구매 키, rs 결제 뒤 다시 열 곳(resumeBuy), onOpen 엽전으로 연 뒤 } */
  function openChoice(o){
    var guest = isGuest(), coins = getCoins(), won = wonSale(o.k), w = wonOf(o.k);
    var short = !NS && !passActive() && coins < o.coin;
    openSheet('<div class="pay-sheet"><div class="pay-hero">' + tileArtSVG(o.art || 'book') + '</div>' +
      '<h3 id="sheetTitle">' + o.name + '</h3>' + (o.who ? '<p class="pay-who">' + o.who + '</p>' : '') +
      '<ul class="pay-list">' + o.items.map(function(t){ return '<li>' + t + '</li>'; }).join('') + '</ul>' +
      (won ? '<div class="pay-price"><b>' + w.toLocaleString() + '원</b></div>' +
        '<button class="btn-primary btn-block" id="payWon">' + (passActive() ? '우니 패스로 열기' : guest ? '로그인하고 ' + w.toLocaleString() + '원 결제하기' : w.toLocaleString() + '원 결제하기') + '</button>' +
        '<p class="helper pay-note">' + (payReady() && SRV.cfg.pay.test ? '<b class="pay-test">테스트 결제</b> 실제로 돈이 나가지 않아요. ' : '') + (payReady() ? '결제 즉시 계정에서 열리는 디지털 콘텐츠예요. 열린 뒤에는 <button class="link-btn" data-doc="refund">환불</button>이 제한돼요. ' : NS ? '예시 모드에서는 결제 없이 열어 볼 수 있어요. ' : '원화 결제는 준비 중이에요. ') + (o.keep ? o.keep + '.' : '') + '</p>'
        : '<p class="helper pay-note" style="margin:0 0 10px">이 리포트는 지금 무료 적립 엽전으로 열 수 있어요. 원화 결제는 준비 중이에요.</p>') +
      '<div class="pay-coin"><div><b>적립 엽전 ' + o.coin.toLocaleString() + '닢 사용</b><small>' + (guest ? '처음 로그인하면 ' + SIGNUP_COINS.toLocaleString() + '닢을 받아요' : NS ? '예시 모드' : '보유 ' + coins.toLocaleString() + '닢' + (short ? ' · ' + (o.coin - coins).toLocaleString() + '닢 부족' : '')) + '</small></div>' +
        '<button class="' + (won ? 'btn-soft' : 'btn-primary') + '" id="payCoin"' + (short && !guest ? ' disabled' : '') + '>' + (short && !guest ? '부족해요' : '엽전으로 열기') + '</button></div>' +
      (short && !guest ? '<button class="text-btn" id="payEarn">엽전 무료로 모으는 방법</button>' : '') +
      '<p class="helper pay-note" style="margin-top:6px">연 리포트는 보관함 › 열어 둔 리포트에서 다시 볼 수 있어요. 엽전은 출석·가입으로 받는 무료 적립 포인트라 사고팔거나 현금으로 바꿀 수 없어요.</p></div>');
    if ($('payWon')) $('payWon').onclick = function(){
      if (NS || passActive()){ spendCoins(o.coin, o.name, o.item, o.onOpen, o.rs); return; }
      if (guest){ openLoginSheet(topic(o.name) + ' ' + w.toLocaleString() + '원이에요. 로그인한 뒤 같은 화면에서 이어서 결제해요.', o.rs && o.rs.k !== 'pay' ? o.rs : null); return; }
      if (!payReady()){ toast('원화 결제는 준비 중이에요. 적립 엽전으로 열 수 있어요'); return; }
      startCharge({ item:o.item, rs:Object.assign({ item:o.item, cost:o.coin, why:o.name }, o.rs) }, this);
    };
    $('payCoin').onclick = function(){
      if (guest){ openCoinSheet(topic(o.name) + ' 엽전 ' + o.coin.toLocaleString() + '닢이에요. 엽전은 로그인한 계정에 쌓여요.'); return; }
      spendCoins(o.coin, o.name, o.item, o.onOpen, o.rs);
    };
    if ($('payEarn')) $('payEarn').onclick = function(){ openCoinSheet(); };
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
    ['행운 부적은 어떻게 정하나요?', '오늘 나에게 필요한 오행(木火土金水)을 사주와 그날 일진으로 골라, 그 기운에 맞는 색·방향·소품·음식·시간·작은 행동을 알려 드려요. 하루를 가볍게 돌아보는 재미용 힌트예요.'],
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
      '<div class="od-row"><div><b>콘텐츠 안내</b><small>사주·운세·행운 부적은 전통 명리 이론을 바탕으로 한 재미·참고용 콘텐츠예요.</small></div></div>' +
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
    if (NS){ exitDemo(true); go('today'); reason = '예시 모드를 끝내고 로그인해요. ' + (reason || ''); }
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
  /* ---- 카카오톡 카드 공유 (카카오 SDK 스크랩) ----
     우리 /s/코드 링크의 OG(서버 결과 카드)를 카카오가 읽어 카드 한 장만 보낸다. 노란 글 말풍선 없음.
     켜는 법: Vercel 환경변수 KAKAO_JS_KEY(카카오 콘솔 > 앱 키 > JavaScript 키) +
              카카오 콘솔 > 플랫폼 > Web 사이트 도메인에 https://woonijoa.com 등록. 키가 없으면 버튼이 안 보인다. */
  var KAKAO_SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js', kakaoLoading = null;
  var KAKAO_IC = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 3.5c-5 0-9 3.1-9 7 0 2.5 1.7 4.7 4.2 6l-.9 3.4c-.1.3.3.6.6.4l4-2.7c.4 0 .7.1 1.1.1 5 0 9-3.1 9-7s-4-7.2-9-7.2z"/></svg>';
  function kakaoKey(){ return SRV.cfg && SRV.cfg.kakaoJs; }
  function kakaoShareOn(){ return !!kakaoKey() && isHosted(); }
  function loadKakao(){
    if (window.Kakao && window.Kakao.Share) return Promise.resolve(window.Kakao);
    if (kakaoLoading) return kakaoLoading;
    kakaoLoading = new Promise(function(ok, no){
      var sc = document.createElement('script'); sc.src = KAKAO_SDK; sc.async = true; sc.crossOrigin = 'anonymous';
      sc.onload = function(){ window.Kakao ? ok(window.Kakao) : no(new Error('kakao')); };
      sc.onerror = function(){ kakaoLoading = null; no(new Error('kakao')); };
      document.head.appendChild(sc);
    });
    return kakaoLoading;
  }
  function kakaoSendCard(link){
    loadKakao().then(function(K){
      if (!K.isInitialized()) K.init(kakaoKey());
      K.Share.sendScrap({ requestUrl:link });
      closeSheet();
    }).catch(function(){ copyText(link, '카카오톡을 열 수 없어 링크를 복사했어요. 카톡에 붙여넣어 주세요'); });
  }
  function openShare(o){ shareState = o; o.withTime = true; renderShareSheet(); }
  document.addEventListener('click', function(e){ if (e.target.closest && e.target.closest('#shNative,#shLink,#shMsg,#shKakao')) markTodo('shared'); });
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
    h += '<div class="share-actions">' + (kakaoShareOn() ? '<button type="button" class="btn-social k sh-kakao" id="shKakao">' + KAKAO_IC + '카카오톡으로 보내기</button>' : '') +
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
      var link = currentLink(), data = { url:link };
      /* 주소만 보낸다(제목·문구 없음): 카톡에서 별도 노란 말풍선 없이 결과 카드(링크 미리보기)만 뜨게.
         iOS 카톡은 카드만 남는다. 안드로이드는 시스템 공유가 주소를 글자로 넘겨서 주소 한 줄 말풍선이 같이 붙는다
         → 카드만 깔끔하게 보내려면 위 '카카오톡으로 보내기'(카카오 SDK) 버튼을 쓴다.
         (이미지 파일을 같이 보내면 앱에 따라 링크가 빠져서 카드만 덩그러니 남았다. 이미지는 '이미지 저장'으로 따로) */
      if (navigator.share){
        navigator.share(data).then(function(){ closeSheet(); toast('공유했어요'); }).catch(function(err){
          if (err && err.name === 'AbortError') return;
          copyText(link, '공유 창을 열 수 없어 링크를 복사했어요. 카톡에 붙여넣어 주세요');
        });
      } else copyText(link, '링크를 복사했어요. 카톡에 붙여넣어 주세요');
    };
    if ($('shKakao')) $('shKakao').onclick = function(){ kakaoSendCard(currentLink()); };
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
      '<span class="inv-badge">' + SH_IC.heart + '궁합 신청이 도착했어요</span>' + uniImg('joa-letter', 'inv-joa', '편지를 든 조아') +
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
        h += '<div class="card ' + elc + '"><div class="sec-head"><h2 class="sec-title">' + md + ' 행운 부적</h2><span class="sec-meta">' + MS.EL_K[f.luckyEl] + ' 기운</span></div>' +
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
