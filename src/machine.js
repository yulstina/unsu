/* 운수 행운 추첨기 — 캔버스로 그린 오리지널 추첨기 일러스트 + 추첨 연출
   LottoMachine.mount(canvas, { reduceMotion }) → { draw(nums, onBall, onDone), reset(), destroy() }
   번호 자체는 앱이 사주로 계산한 값을 그대로 받아 "뽑히는 모습"만 연출한다. */
var LottoMachine = (function(){
  var W = 320, H = 376;
  var GC = { x:160, y:108, r:88 };            /* 유리 구 */
  var BALL_R = 7.5;
  var COLORS = { y:['#ffd84a', '#d9a300'], b:['#8fdcff', '#3a9fd0'], r:['#ff9a9a', '#d04a4a'], k:['#c9c9c9', '#7d7d7d'], g:['#cdeb6a', '#7ea61f'] };
  function colorOf(n){ return n <= 10 ? 'y' : n <= 20 ? 'b' : n <= 30 ? 'r' : n <= 40 ? 'k' : 'g'; }
  function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
  function easeOut(t){ return 1 - Math.pow(1 - t, 3); }
  function easeIn(t){ return t * t; }

  function mount(canvas, opts){
    opts = opts || {};
    var reduce = !!opts.reduceMotion;
    var ctx = canvas.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.aspectRatio = W + ' / ' + H;
    ctx.scale(dpr, dpr);

    /* 구 안의 공 45개 */
    var balls = [];
    function seedBalls(){
      balls = [];
      for (var n = 1; n <= 45; n++){
        var a = Math.random() * Math.PI * 2, d = Math.random() * (GC.r - 16);
        balls.push({ n:n, x:GC.x + Math.cos(a) * d, y:GC.y + 20 + Math.abs(Math.sin(a)) * d * .6, vx:0, vy:0, c:colorOf(n) });
      }
    }
    seedBalls();

    var state = 'idle';      /* idle | spin | done */
    var spin = 0;            /* 0~1 회전 세기 */
    var shake = 0, flash = 0, glow = 0, flx = 0, fly = 0;
    var queue = [], out = [], sparks = [], rack = [], tStart = 0, cbBall = null, cbDone = null, drawT = 0, nextAt = 0, total = 0;
    var raf = 0, last = 0, dead = false;

    function rackPos(i){ return { x:38 + i * 48.8, y:343 }; }

    /* 추첨 중에는 공이 통 안에서 사방으로 튄다: 약한 중력 + 무작위 방향 킥 + 탄성 벽 반사.
       (예전엔 기계 전체를 무작위로 떨어서 화면 오류처럼 보였다 → 기계는 가만히, 공만 움직인다) */
    function physics(dt){
      var lift = spin, rest = .55 + .4 * lift, maxV = 430;
      for (var i = 0; i < balls.length; i++){
        var b = balls[i];
        b.vy += 520 * dt * (1 - lift * .92);                          /* 중력: 추첨 중엔 거의 무중력 */
        if (lift > 0){
          if (Math.random() < 5 * lift * dt){                          /* 바람에 맞아 아무 방향으로 튕김 */
            var ka = Math.random() * Math.PI * 2, kv = (200 + Math.random() * 190) * lift;
            b.vx += Math.cos(ka) * kv; b.vy += Math.sin(ka) * kv;
          }
          var rx = b.x - GC.x, ry = b.y - GC.y;                        /* 통 전체가 도는 느낌의 약한 소용돌이 */
          b.vx += -ry * 1.5 * lift * dt; b.vy += rx * 1.5 * lift * dt;
          if (b.y > GC.y + GC.r * .45) b.vy -= 900 * lift * dt;        /* 바닥에 깔린 공은 위로 불어 올린다 */
          var sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
          if (sp > maxV){ b.vx *= maxV / sp; b.vy *= maxV / sp; }
        } else if (Math.random() < .02){ b.vx += (Math.random() - .5) * 60; b.vy -= Math.random() * 40; }
        b.x += b.vx * dt; b.y += b.vy * dt;
        var damp = lift > 0 ? .12 : .6;
        b.vx *= (1 - damp * dt); b.vy *= (1 - (lift > 0 ? .12 : .4) * dt);
        var dx2 = b.x - GC.x, dy2 = b.y - GC.y, d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2), lim = GC.r - BALL_R - 2;
        if (d2 > lim){                                                 /* 유리 벽 반사 */
          var nx = dx2 / d2, ny = dy2 / d2, dot = b.vx * nx + b.vy * ny;
          if (dot > 0){ b.vx -= (1 + rest) * dot * nx; b.vy -= (1 + rest) * dot * ny; }
          b.x = GC.x + nx * lim; b.y = GC.y + ny * lim;
        }
      }
      var e = .6 + .3 * lift;
      for (var p = 0; p < balls.length; p++) for (var q = p + 1; q < balls.length; q++){   /* 공끼리 튕기기 */
        var a = balls[p], c = balls[q], ddx = c.x - a.x, ddy = c.y - a.y, dd = ddx * ddx + ddy * ddy, m = BALL_R * 2;
        if (dd < m * m && dd > .01){
          var dist = Math.sqrt(dd), ov = (m - dist) / 2, ux = ddx / dist, uy = ddy / dist;
          a.x -= ux * ov; a.y -= uy * ov; c.x += ux * ov; c.y += uy * ov;
          var rv = (c.vx - a.vx) * ux + (c.vy - a.vy) * uy;
          if (rv < 0){ a.vx += ux * rv * e; a.vy += uy * rv * e; c.vx -= ux * rv * e; c.vy -= uy * rv * e; }
        }
      }
    }

    function ballSprite(x, y, r, n, c, label, rot){
      var g = ctx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r);
      g.addColorStop(0, COLORS[c][0]); g.addColorStop(1, COLORS[c][1]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = g; ctx.fill();
      if (label){
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
        ctx.beginPath(); ctx.arc(0, 0, r * .72, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
        ctx.fillStyle = '#2a2140'; ctx.font = '700 ' + Math.round(r * 1.0) + 'px "Space Grotesk","IBM Plex Sans KR",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 0, 1); ctx.restore();
      }
      ctx.beginPath(); ctx.arc(x - r * .35, y - r * .4, r * .22, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
    }
    function rr(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

    function render(now){
      var sx = 0, sy = 0;   /* 기계는 흔들지 않는다 */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(sx, sy);

      /* 바닥 그림자 */
      var sh = ctx.createRadialGradient(160, 300, 10, 160, 300, 150); sh.addColorStop(0, 'rgba(138,124,240,.28)'); sh.addColorStop(1, 'rgba(138,124,240,0)');
      ctx.fillStyle = sh; ctx.fillRect(0, 200, W, 150);

      /* 몸통 */
      var cab = ctx.createLinearGradient(70, 205, 250, 300); cab.addColorStop(0, '#3b2a8f'); cab.addColorStop(1, '#1b1450');
      rr(66, 200, 188, 98, 18); ctx.fillStyle = cab; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(234,197,111,.75)'; ctx.stroke();
      rr(76, 208, 168, 8, 4); ctx.fillStyle = 'rgba(234,197,111,.35)'; ctx.fill();
      /* 이름판 */
      rr(112, 224, 96, 24, 12); ctx.fillStyle = 'rgba(10,8,32,.65)'; ctx.fill(); ctx.strokeStyle = 'rgba(234,197,111,.6)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#f3dca0'; ctx.font = '600 13px "IBM Plex Sans KR",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('우니 추첨기', 160, 237);
      /* 배출구 */
      rr(138, 258, 44, 30, 10); ctx.fillStyle = '#0a0820'; ctx.fill(); ctx.strokeStyle = 'rgba(234,197,111,.5)'; ctx.stroke();
      /* 표시등 */
      for (var i = 0; i < 3; i++){ ctx.beginPath(); ctx.arc(92 + i * 14, 272, 4, 0, 7); ctx.fillStyle = (state === 'spin' && ((now / 160 + i) | 0) % 3 === 0) ? '#ffd84a' : 'rgba(234,197,111,.28)'; ctx.fill(); }
      /* 목 */
      var nk = ctx.createLinearGradient(110, 0, 210, 0); nk.addColorStop(0, '#2a1f73'); nk.addColorStop(.5, '#5a46c7'); nk.addColorStop(1, '#2a1f73');
      ctx.beginPath(); ctx.moveTo(116, 188); ctx.lineTo(204, 188); ctx.lineTo(192, 204); ctx.lineTo(128, 204); ctx.closePath(); ctx.fillStyle = nk; ctx.fill();

      /* 유리 구 */
      ctx.save(); ctx.beginPath(); ctx.arc(GC.x, GC.y, GC.r, 0, 7); ctx.clip();
      var gl = ctx.createRadialGradient(GC.x - 30, GC.y - 40, 10, GC.x, GC.y, GC.r); gl.addColorStop(0, 'rgba(190,210,255,.22)'); gl.addColorStop(1, 'rgba(60,50,160,.28)');
      ctx.fillStyle = gl; ctx.fillRect(GC.x - GC.r, GC.y - GC.r, GC.r * 2, GC.r * 2);
      if (glow > 0){ var gg = ctx.createRadialGradient(GC.x, GC.y + 40, 5, GC.x, GC.y + 40, 90); gg.addColorStop(0, 'rgba(255,216,74,' + (.35 * glow) + ')'); gg.addColorStop(1, 'rgba(255,216,74,0)'); ctx.fillStyle = gg; ctx.fillRect(GC.x - GC.r, GC.y - GC.r, GC.r * 2, GC.r * 2); }
      for (var k = 0; k < balls.length; k++){ var bb = balls[k]; ballSprite(bb.x, bb.y, BALL_R, bb.n, bb.c, false); }
      ctx.restore();
      /* 유리 반사 + 테두리 */
      ctx.beginPath(); ctx.arc(GC.x, GC.y, GC.r, 0, 7); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(214,230,255,.55)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(GC.x, GC.y, GC.r - 8, Math.PI * 1.08, Math.PI * 1.42); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.stroke(); ctx.lineCap = 'butt';
      /* 윗 뚜껑 + 손잡이 */
      rr(140, 12, 40, 12, 6); ctx.fillStyle = '#eac56f'; ctx.fill();
      ctx.beginPath(); ctx.arc(160, 12, 7, 0, 7); ctx.fillStyle = '#f3dca0'; ctx.fill();
      /* 목 연결 고리 */
      rr(112, 184, 96, 8, 4); ctx.fillStyle = '#eac56f'; ctx.fill();

      /* 공 받침대(랙) */
      rr(8, 308, 304, 62, 31); ctx.fillStyle = 'rgba(10,8,32,.78)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(214,230,255,.28)'; ctx.stroke();
      for (var s = 0; s < 6; s++){ var rp = rackPos(s); ctx.beginPath(); ctx.arc(rp.x, rp.y, 24, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fill(); ctx.strokeStyle = 'rgba(214,230,255,.2)'; ctx.stroke(); }
      for (var r2 = 0; r2 < rack.length; r2++){ var rb = rack[r2], pp = rackPos(r2); if (!rb) continue; ballSprite(pp.x, pp.y, 23, rb.n, rb.c, true, 0); }

      /* 나오는 공 */
      for (var o = 0; o < out.length; o++){ var ob = out[o]; ballSprite(ob.x, ob.y, ob.r, ob.n, ob.c, true, ob.rot); }
      /* 반짝임 */
      for (var p = 0; p < sparks.length; p++){ var sp = sparks[p]; ctx.globalAlpha = Math.max(0, sp.life); ctx.fillStyle = sp.col; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.s, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
      if (flash > 0){ var fg = ctx.createRadialGradient(flx, fly, 2, flx, fly, 46); fg.addColorStop(0, 'rgba(255,240,200,' + (flash * .55) + ')'); fg.addColorStop(1, 'rgba(255,240,200,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(flx, fly, 46, 0, 7); ctx.fill(); }
      ctx.restore();
    }

    function burst(x, y, n, col){
      for (var i = 0; i < n; i++){ var a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 110; sparks.push({ x:x, y:y, vx:Math.cos(a) * v, vy:Math.sin(a) * v - 30, s:1 + Math.random() * 2, life:1, col:col || '#ffe08a' }); }
    }

    function step(dt, now){
      /* 추첨 진행 */
      if (state === 'spin'){
        var el = now - tStart;
        if (queue.length) spin = Math.min(1, el / 500); else spin = Math.max(0, spin - dt * 1.2);
        glow = queue.length ? Math.min(1, el / 600) : Math.max(0, glow - dt); shake = 2.2 * spin;
        if (queue.length && now >= nextAt){
          var n = queue.shift(), idx = total - queue.length - 1;
          /* 같은 색 공 하나를 구에서 꺼낸다 */
          for (var j = 0; j < balls.length; j++) if (balls[j].n === n){ balls.splice(j, 1); break; }
          out.push({ n:n, c:colorOf(n), x:GC.x, y:196, r:7, rot:0, t:0, slot:idx });
          if (cbBall) cbBall(n, idx);
          nextAt = now + 900;
        }
        if (!queue.length && !out.length && rack.length === total){
          state = 'done'; cbDone && cbDone();
        }
      } else { spin = Math.max(0, spin - dt * 2); glow = Math.max(0, glow - dt * 1.5); shake = Math.max(0, shake - dt * 10); }
      /* 공 이동: 목에서 떨어져 배출구에서 나와 받침대로 굴러감 */
      for (var i = out.length - 1; i >= 0; i--){
        var b = out[i]; b.t += dt;
        var T1 = .35, T2 = .5, T3 = .85, pos = rackPos(b.slot);
        if (b.t < T1){ var u = easeIn(b.t / T1); b.x = 160; b.y = 196 + (272 - 196) * u; b.r = 7 + 5 * u; }
        else if (b.t < T1 + T2){ var u2 = (b.t - T1) / T2; b.x = 160 + (b.slot % 2 ? 6 : -6) * u2; b.y = 272 + 26 * easeIn(u2); b.r = 12 + 3 * u2; }
        else if (b.t < T1 + T2 + T3){
          var u3 = easeOut((b.t - T1 - T2) / T3), fx = 160 + (b.slot % 2 ? 6 : -6);
          b.x = fx + (pos.x - fx) * u3; b.y = 298 + (pos.y - 298) * u3 - Math.sin(u3 * Math.PI) * 6; b.r = 15 + 8 * u3; b.rot = u3 * (pos.x - fx) / 15;
        } else {
          rack[b.slot] = { n:b.n, c:b.c }; out.splice(i, 1); burst(pos.x, pos.y, 14); flash = .6; flx = pos.x; fly = pos.y;
        }
      }
      flash = Math.max(0, flash - dt * 3);
      for (var s = sparks.length - 1; s >= 0; s--){ var sp = sparks[s]; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 220 * dt; sp.life -= dt * 1.8; if (sp.life <= 0) sparks.splice(s, 1); }
      if (state === 'done' && !done_burst){ done_burst = true; for (var k = 0; k < 6; k++) burst(rackPos(k).x, rackPos(k).y, 10, '#ffffff'); }
    }
    var done_burst = false;

    function frame(now){
      if (dead || !canvas.isConnected){ return; }
      raf = requestAnimationFrame(frame);
      /* 다른 탭을 보고 있거나(숨김) 화면 밖이면 계산도 그리기도 쉰다 — 예전엔 번호 탭을 한 번 열면 계속 돌았다 */
      if (document.hidden || !canvas.offsetParent || !onScreen){ last = now; return; }
      /* 가만히 있을 땐 30fps 로 충분 */
      if (state !== 'spin' && !out.length && !sparks.length && poke <= 0 && (skipTick = !skipTick)) return;
      var dt = Math.min(.05, (now - (last || now)) / 1000); last = now; poke = Math.max(0, poke - dt);
      physics(dt * .5); physics(dt * .5); step(dt, now); render(now);   /* 빠른 공이 벽을 뚫지 않게 2회로 나눠 계산 */
    }

    var onScreen = true, skipTick = false, poke = 0, io = null;
    if (window.IntersectionObserver){ io = new IntersectionObserver(function(en){ onScreen = en[en.length - 1].isIntersecting; }); io.observe(canvas); }
    /* 유리 통을 누르거나 마우스로 훑으면 그 자리의 공이 튕겨 나간다 */
    function pokeAt(e, power){
      var rc = canvas.getBoundingClientRect(); if (!rc.width) return;
      var px = (e.clientX - rc.left) * W / rc.width, py = (e.clientY - rc.top) * H / rc.height;
      var gx = px - GC.x, gy = py - GC.y; if (gx * gx + gy * gy > GC.r * GC.r) return;
      for (var i = 0; i < balls.length; i++){
        var b = balls[i], dx = b.x - px, dy = b.y - py, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < 46){ var k = (1 - d / 46) * power; b.vx += dx / d * k; b.vy += dy / d * k - k * .35; }
      }
      poke = 1.2;
      if (power > 300 && opts.onPoke) opts.onPoke();
    }
    if (!reduce){
      canvas.addEventListener('pointerdown', function(e){ pokeAt(e, 420); });
      canvas.addEventListener('pointermove', function(e){ if (e.pointerType === 'mouse') pokeAt(e, 60); });
    }
    function start(){ if (!raf && !reduce) raf = requestAnimationFrame(frame); }

    function placeRackFinal(nums){ rack = nums.map(function(n){ return { n:n, c:colorOf(n) }; }); }

    var api = {
      draw: function(nums, onBall, onDone){
        api.reset();
        total = nums.length; cbBall = onBall; cbDone = onDone; api._all = nums.slice();
        if (reduce){ placeRackFinal(nums); state = 'done'; render(performance.now()); onDone && onDone(); return; }
        queue = nums.slice(); state = 'spin'; tStart = performance.now(); nextAt = tStart + 1300; done_burst = false;
        if (!raf) raf = requestAnimationFrame(frame);
      },
      reset: function(){ queue = []; out = []; rack = []; sparks = []; state = 'idle'; spin = 0; seedBalls(); done_burst = false; if (reduce) render(performance.now()); },
      destroy: function(){ dead = true; cancelAnimationFrame(raf); raf = 0; if (io) io.disconnect(); },
      isBusy: function(){ return state === 'spin'; },
      /* 연출 건너뛰기 (GPT 검토 7장): 남은 공을 한 번에 랙에 놓고 끝낸다 */
      skip: function(){ if (state !== 'spin') return; queue = []; out = []; sparks = []; placeRackFinal(api._all || []); state = 'done'; render(performance.now()); var f = cbDone; cbDone = null; f && f(); }
    };
    if (reduce) render(performance.now()); else start();
    return api;
  }
  return { mount:mount };
})();
