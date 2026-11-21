/* ================= 결과 공유: 링크 해석 + 미리보기 카드 내용 =================
   브라우저(app.js)와 서버(api/share.js · api/og.js)가 같은 코드를 쓴다 → 링크 미리보기 이미지와 실제 화면의 숫자가 항상 같다.
   링크 형식: r1|타입|YYYYMMDD|추가값|사람1(7칸)|사람2(7칸)
   타입 s 사주 · d 오늘 운세 · n 행운 부적 · g 궁합 · z 별자리 · c 분야별 운세 */
var SHARE = (function(){
  var EF = 7;
  var CAT = { money:{ name:'금전운', sk:'w' }, love:{ name:'연애·결혼운', sk:'l' }, career:{ name:'취업·직장운', sk:'j' }, job:{ name:'나에게 맞는 직업', sk:'' } };
  function pad2(n){ return (n < 10 ? '0' : '') + n; }
  function seedHash(str){ var h = 0; for (var i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0; return h >>> 0; }
  function mulberry32(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /* 행운 숫자: 오늘 나에게 필요한 오행의 끝자리(목 3·8 / 화 2·7 / 토 5·0 / 금 4·9 / 수 1·6)로 끝나는 1~50 사이 숫자 3개.
     번호 조합을 만드는 기능이 아니라 '오늘의 행운 세트'에 곁들이는 작은 힌트다 */
  function drawYong(seedStr, el){
    var rand = mulberry32(seedHash(seedStr));
    var digits = EL_TEXT[el].num.map(function(n){ return n % 10; });
    var pool = [];
    for (var i = 1; i <= 50; i++) if (digits.indexOf(i % 10) > -1) pool.push(i);
    var out = [];
    for (var a = 0; a < 3; a++){ var ix = Math.floor(rand() * pool.length); out.push({ n:pool[ix], y:true }); pool.splice(ix, 1); }
    return out.sort(function(p, q){ return p.n - q.n; });
  }
  function unb64u(s){
    s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    if (typeof Buffer !== 'undefined' && typeof window === 'undefined') return Buffer.from(s, 'base64').toString('utf8');
    return decodeURIComponent(escape(atob(s)));
  }
  function compute(e, now){
    return MS.calc({ y:e.y, m:e.m, d:e.d, cal:e.cal, leap:e.leap, hour:e.hour, minute:e.minute, unknownTime:e.unknown, gender:e.gender, lonCorr:e.corr !== false, lon:127, now:now || undefined });
  }
  function decEntry(p){
    if (!p || p.length < EF || !/^\d{8}$/.test(p[4])) return null;
    var t = /^\d{4}$/.test(p[5]) ? p[5] : '';
    var e = { name:(p[0] || '친구').slice(0, 12), gender:p[1] === 'M' ? 'M' : 'F', cal:p[2] === 'l' ? 'lunar' : 'solar', leap:p[3] === '1',
      y:+p[4].slice(0, 4), m:+p[4].slice(4, 6), d:+p[4].slice(6, 8), unknown:!t, hour:t ? +t.slice(0, 2) : null, minute:t ? +t.slice(2, 4) : null, corr:p[6] !== '0' };
    if (t && (e.hour > 23 || e.minute > 59)) return null;
    return compute(e).error ? null : e;
  }
  function decode(code){
    var p = unb64u(code).split('|');
    if (p[0] !== 'r1' || 'sdngzc'.indexOf(p[1]) < 0 || p[1].length !== 1 || !/^\d{8}$/.test(p[2])) return null;
    var y = +p[2].slice(0, 4), m = +p[2].slice(4, 6), d = +p[2].slice(6, 8), dt = new Date(y, m - 1, d, 12, 0, 0);
    if (dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
    var need = p[1] === 'g' ? 2 : p[1] === 'z' ? 0 : 1, ents = [];
    for (var i = 0; i < need; i++){ var e = decEntry(p.slice(4 + i * EF, 4 + (i + 1) * EF)); if (!e) return null; ents.push(e); }
    if (p[1] === 'c' && !CAT[p[3]]) return null;
    return { type:p[1], date:dt, dateStr:y + '-' + pad2(m) + '-' + pad2(d), extra:p[3] || '', entries:ents };
  }
  function entryISO(r){ return r.solar.y + '-' + pad2(r.solar.m) + '-' + pad2(r.solar.d); }
  function entryTKey(r){ return r.time ? pad2(r.time.h) + pad2(r.time.mi) : 'unknown'; }
  function luckNums(r, dateStr, el){ return drawYong(entryISO(r) + '|' + entryTKey(r) + '|' + dateStr + '|luck', el); }

  /* 미리보기 카드 한 장에 들어갈 내용. title·desc 는 og:title · og:description 에도 쓴다
     { kind, title, desc, kicker, head, rows:[[이름, 점수]], nums:[..], tag } */
  function card(S){
    var A = S.entries[0], B = S.entries[1], dt = S.date, md = (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일';
    if (S.type === 'z'){
      var zn = String(S.extra).split('~')[0].slice(0, 8);
      return { kind:'z', title:md + ' ' + zn + ' 운세', desc:'오늘의 별자리 운세가 도착했어요', kicker:md + ' 별자리 운세', head:zn + ' 오늘의 운세' };
    }
    var ra = compute(A, dt);
    if (S.type === 'g'){
      var rb = compute(B, dt), m = DAILY.match(A, ra, B, rb);
      return { kind:'g', title:A.name + ' × ' + B.name + ' 궁합 ' + m.score + '점', desc:m.grade + ' · ' + m.summary,
        kicker:A.name + ' × ' + B.name + ' 궁합', head:m.summary, rows:[['궁합 점수', m.score]], tag:m.grade };
    }
    if (S.type === 's'){
      var P = ra.pillars, ig = (typeof ILGAN !== 'undefined' && ILGAN[P.day.stem]) || {}, igT = String(ig.t || '').replace(/\(.*?\)/g, '');   /* 미리보기 이미지 글꼴에 한자가 없어 한글만 */
      return { kind:'s', title:A.name + '님의 사주 · ' + P.day.name + '일주', desc:ig.t ? ig.t + ' — ' + ig.img : '여덟 글자로 푼 사주 풀이',
        kicker:A.name + '님의 사주 풀이', head:ig.t ? igT + ', ' + ig.img : P.day.name + '일주', tag:P.year.name + '년생 ' + ra.animal + '띠 · ' + P.day.name + '일주' };
    }
    var f = DAILY.today(A, ra, dt);
    if (S.type === 'd')
      return { kind:'d', title:A.name + '님의 ' + md + ' 운세', desc:f.head + ' · 재물 ' + f.scores.w + ' · 연애 ' + f.scores.l + ' · 직업 ' + f.scores.j,
        kicker:A.name + '님의 ' + md + ' 운세', head:f.head, rows:[['재물운', f.scores.w], ['연애운', f.scores.l], ['직업운', f.scores.j]] };
    if (S.type === 'n'){
      /* 2026-11-21: 숫자 추천을 없앴다 — 부적 카드는 색과 방향만 */
      var lk = '행운의 색 ' + f.tip.color + ' · 방향 ' + EL_TEXT[f.luckyEl].dir;
      return { kind:'n', title:A.name + '님의 ' + md + ' 행운 부적', desc:lk, kicker:A.name + '님의 ' + md + ' 행운 부적', head:lk };
    }
    var C = CAT[S.extra];
    if (C.sk) return { kind:'c', title:A.name + '님의 ' + C.name + ' ' + f.scores[C.sk] + '점', desc:f.lines[C.sk], kicker:A.name + '님의 ' + md + ' ' + C.name, head:f.lines[C.sk], rows:[[C.name, f.scores[C.sk]]] };
    return { kind:'c', title:A.name + '님에게 맞는 직업', desc:'사주로 찾은 나에게 맞는 일', kicker:A.name + '님에게 맞는 직업', head:'사주로 찾은 나에게 맞는 일' };
  }
  return { decode:decode, card:card, drawYong:drawYong, seedHash:seedHash, mulberry32:mulberry32, CAT:CAT };
})();
if (typeof module !== 'undefined') module.exports = SHARE;
