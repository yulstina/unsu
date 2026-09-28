/* ================= 만세력 엔진 =================
   - 연주: 입춘 기준 / 월주: 12절(節) 기준 (태양 황경 계산, Meeus 저정밀식 ±1분 내외)
   - 일주: 율리우스일 기반 60갑자 / 시주: 오서둔(五鼠遁)
   - 한국 표준시 변경(1954~61 UTC+8:30) · 서머타임 · 경도(진태양시) 보정
   - 음력→양력: KoreanLunarCalendar (한국천문연구원 데이터, MIT) */
var MS = (function(){
  var STEM_K = ['갑','을','병','정','무','기','경','신','임','계'];
  var STEM_H = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var BR_K = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
  var BR_H = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var BR_ANIMAL = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지'];
  var STEM_EL = [0,0,1,1,2,2,3,3,4,4];          /* 0목 1화 2토 3금 4수 */
  var BR_EL   = [4,2,0,0,2,1,1,2,3,3,2,4];
  var EL_K = ['목','화','토','금','수'], EL_H = ['木','火','土','金','水'];
  var EL_KEY = ['wood','fire','earth','metal','water'];
  var BR_MAIN = [9,5,0,1,4,2,3,5,6,7,4,8];     /* 지지 정기(본기) 천간 */
  var BR_YANG = [1,0,1,0,1,0,1,0,1,0,1,0];      /* 음양(체 기준) */
  var JIJANG = [[8,9],[9,7,5],[4,2,0],[0,1],[1,9,4],[4,6,2],[2,5,3],[3,1,5],[4,8,6],[6,7],[7,3,4],[4,0,8]];
  var TEN = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
  var STAGE = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
  var STAGE_START = [11,6,2,9,2,9,5,0,8,3];
  var COLOR_K = ['푸른','붉은','노란','하얀','검은'];

  function mod(a,n){ return ((a % n) + n) % n; }
  function tenGod(dayStem, stem){
    var rel = mod(STEM_EL[stem] - STEM_EL[dayStem], 5);
    var same = (dayStem % 2) === (stem % 2);
    var map = [0,2,4,6,8];               /* 0비겁 1식상 2재 3관 4인 */
    var order = [0,1,2,3,4];
    /* rel: 0같음 1내가생 2내가극 3나를극 4나를생 */
    return TEN[map[rel] + (same ? 0 : 1)];
  }
  function stage12(dayStem, br){
    var st = STAGE_START[dayStem];
    return STAGE[dayStem % 2 === 0 ? mod(br - st, 12) : mod(st - br, 12)];
  }
  function idx60(stem, br){ return mod(6*stem - 5*br, 60); }

  /* ---- astronomy ---- */
  function jd(y, m, d, hUT){
    if (m <= 2){ y -= 1; m += 12; }
    var A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
    return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + d + B - 1524.5 + hUT/24;
  }
  function sunLon(J){
    var T = (J - 2451545) / 36525, rad = Math.PI/180;
    var L0 = 280.46646 + 36000.76983*T + 0.0003032*T*T;
    var M = (357.52911 + 35999.05029*T - 0.0001537*T*T) * rad;
    var C = (1.914602 - 0.004817*T - 0.000014*T*T)*Math.sin(M) + (0.019993 - 0.000101*T)*Math.sin(2*M) + 0.000289*Math.sin(3*M);
    var om = (125.04 - 1934.136*T) * rad;
    return mod(L0 + C - 0.00569 - 0.00478*Math.sin(om), 360);
  }
  function findLon(target, guess){
    var J = guess;
    for (var i=0;i<8;i++){ J += (mod(target - sunLon(J) + 180, 360) - 180) / 0.98565; }
    return J;
  }
  function jdToKST(J){
    var ms = (J - 2440587.5) * 86400000 + 9*3600000;
    var d = new Date(ms);
    return { y:d.getUTCFullYear(), m:d.getUTCMonth()+1, d:d.getUTCDate(), h:d.getUTCHours(), mi:d.getUTCMinutes() };
  }

  /* ---- Korea civil time history ---- */
  var DST = [ /* [y, sm, sd, em, ed] (근사: 시행 기간) */
    [1948,6,1,9,13],[1949,4,3,9,11],[1950,4,1,9,10],[1951,5,6,9,9],
    [1955,5,5,9,9],[1956,5,20,9,30],[1957,5,5,9,22],[1958,5,4,9,21],[1959,5,3,9,20],[1960,5,1,9,18],
    [1987,5,10,10,11],[1988,5,8,10,9]
  ];
  function zoneOffset(y,m,d){
    var v = y*10000 + m*100 + d;
    return (v >= 19540321 && v < 19610810) ? 8.5 : 9;
  }
  function isDST(y,m,d){
    var v = y*10000+m*100+d;
    for (var i=0;i<DST.length;i++){ var r = DST[i]; if (r[0]===y && v >= y*10000+r[1]*100+r[2] && v < y*10000+r[3]*100+r[4]) return true; }
    return false;
  }

  /* ---- lunar ---- */
  var klc = (typeof KoreanLunarCalendar !== 'undefined') ? new KoreanLunarCalendar() : null;
  function lunarToSolar(y,m,d,leap){
    if (!klc) return null;
    if (!klc.setLunarDate(y,m,d,!!leap)) return null;
    var s = klc.getSolarCalendar();
    if (leap && !klc.getLunarCalendar().intercalation) return null;
    return { y:s.year, m:s.month, d:s.day };
  }
  function solarToLunar(y,m,d){
    if (!klc || !klc.setSolarDate(y,m,d)) return null;
    var l = klc.getLunarCalendar();
    return { y:l.year, m:l.month, d:l.day, leap:!!l.intercalation };
  }
  function hasLeapMonth(y,m){
    if (!klc) return false;
    return klc.setLunarDate(y,m,1,true) && klc.getLunarCalendar().intercalation;
  }

  function pillar(stem, br){
    return { stem:stem, br:br, sk:STEM_K[stem], sh:STEM_H[stem], bk:BR_K[br], bh:BR_H[br],
             sEl:STEM_EL[stem], bEl:BR_EL[br], name:STEM_K[stem]+BR_K[br], hanja:STEM_H[stem]+BR_H[br] };
  }

  /* ---- main ---- */
  function calc(input){
    /* input: {y,m,d, cal:'solar'|'lunar', leap, hour, minute, unknownTime, gender:'M'|'F', lonCorr:true, lon:127} */
    var sy = input.y, sm = input.m, sd = input.d;
    if (input.cal === 'lunar'){
      var s = lunarToSolar(input.y, input.m, input.d, input.leap);
      if (!s) return { error:'해당 음력 날짜가 존재하지 않아요' + (input.leap ? ' (그 해에는 윤' + input.m + '월이 없어요)' : '') };
      sy = s.y; sm = s.m; sd = s.d;
    }
    var check = new Date(Date.UTC(sy, sm-1, sd));
    if (check.getUTCMonth() !== sm-1 || check.getUTCDate() !== sd) return { error:'존재하지 않는 날짜예요' };
    if (sy < 1900 || sy > 2050) return { error:'1900~2050년 사이만 조회할 수 있어요' };

    var unknown = !!input.unknownTime;
    var hh = unknown ? 12 : input.hour, mi = unknown ? 0 : input.minute;
    var zone = zoneOffset(sy,sm,sd), dst = isDST(sy,sm,sd) ? 1 : 0;
    var utH = hh + mi/60 - zone - dst;
    var J = jd(sy, sm, sd, utH);
    var lon = sunLon(J);

    /* 연주 */
    var lichun = findLon(315, jd(sy, 2, 4, 0));
    var sajuYear = J < lichun ? sy - 1 : sy;
    var yStem = mod(sajuYear - 4, 10), yBr = mod(sajuYear - 4, 12);
    /* 월주 */
    var mIdx = Math.floor(mod(lon - 315, 360) / 30);        /* 0=인월 */
    var mBr = mod(mIdx + 2, 12);
    var mStem = mod((yStem % 5)*2 + 2 + mIdx, 10);

    /* 진태양시 보정 */
    var meridian = zone * 15;
    var corrMin = input.lonCorr === false ? 0 : Math.round((( input.lon || 127) - meridian) * 4);
    var lmMs = Date.UTC(sy, sm-1, sd, hh, mi) - dst*3600000 + corrMin*60000;
    var lm = new Date(lmMs);
    var lmH = lm.getUTCHours(), lmMi = lm.getUTCMinutes();
    /* 일주 (자시 23:00부터 다음 날) */
    var dayMs = unknown ? Date.UTC(sy, sm-1, sd) : Date.UTC(lm.getUTCFullYear(), lm.getUTCMonth(), lm.getUTCDate()) + (lmH >= 23 ? 86400000 : 0);
    var dd = new Date(dayMs);
    var JDN = jd(dd.getUTCFullYear(), dd.getUTCMonth()+1, dd.getUTCDate(), 0) + 0.5;
    var d60 = mod(JDN + 49, 60);
    var dStem = d60 % 10, dBr = d60 % 12;
    /* 시주 */
    var hour = null;
    if (!unknown){
      var hBr = Math.floor(mod(lmH*60 + lmMi + 60, 1440) / 120) % 12;
      var hStem = mod((dStem % 5)*2 + hBr, 10);
      hour = pillar(hStem, hBr);
    }
    var P = { year:pillar(yStem,yBr), month:pillar(mStem,mBr), day:pillar(dStem,dBr), hour:hour };

    /* 십성 · 12운성 · 지장간 */
    ['year','month','day','hour'].forEach(function(k){
      var p = P[k]; if (!p) return;
      p.tenStem = k === 'day' ? '일간' : tenGod(dStem, p.stem);
      p.tenBr = tenGod(dStem, BR_MAIN[p.br]);
      p.stage = stage12(dStem, p.br);
      p.jijang = JIJANG[p.br].map(function(s){ return STEM_H[s]; }).join('');
      p.jijangK = JIJANG[p.br].map(function(s){ return STEM_K[s]; }).join('');
    });

    /* 오행 분포 */
    var cnt = [0,0,0,0,0];
    ['year','month','day','hour'].forEach(function(k){ var p = P[k]; if (!p) return; cnt[p.sEl]++; cnt[p.bEl]++; });
    var total = cnt.reduce(function(a,b){return a+b;},0);

    /* 신강/신약 (억부 간이 점수) */
    var dEl = STEM_EL[dStem];
    function supports(el){ return el === dEl || el === mod(dEl - 1, 5); }
    var W = { yS:10, yB:10, mS:10, mB:30, dB:15, hS:10, hB:10 };
    var sup = 0, all = 0;
    function add(el, w){ all += w; if (supports(el)) sup += w; }
    add(P.year.sEl, W.yS); add(P.year.bEl, W.yB); add(P.month.sEl, W.mS); add(P.month.bEl, W.mB); add(P.day.bEl, W.dB);
    if (hour){ add(hour.sEl, W.hS); add(hour.bEl, W.hB); }
    var ratio = sup / all;
    var strength = ratio >= .7 ? '극신강' : ratio >= .55 ? '신강' : ratio > .45 ? '중화' : ratio > .28 ? '신약' : '극신약';
    /* 용신(억부) */
    var cand;
    if (ratio > .5){ cand = [mod(dEl+1,5), mod(dEl+2,5), mod(dEl+3,5)]; }   /* 식상·재·관 */
    else { cand = [mod(dEl-1,5), dEl]; }                                    /* 인성·비겁 */
    var sorted = cand.slice().sort(function(a,b){ return cnt[a] - cnt[b]; });
    var yong = sorted[0], hee = sorted.length > 1 ? sorted[1] : mod(yong - 1, 5);

    /* 신살 */
    var branches = ['year','month','day','hour'].filter(function(k){ return P[k]; }).map(function(k){ return { k:k, br:P[k].br }; });
    var SAMHAP = function(b){ return [8,0,4].indexOf(b) > -1 ? 'water' : [2,6,10].indexOf(b) > -1 ? 'fire' : [5,9,1].indexOf(b) > -1 ? 'metal' : 'wood'; };
    var DOHWA = { water:9, fire:3, metal:6, wood:0 }, YEOKMA = { water:2, fire:8, metal:11, wood:5 }, HWAGAE = { water:4, fire:10, metal:1, wood:7 };
    var CHEONEUL = [[1,7],[0,8],[11,9],[11,9],[1,7],[0,8],[1,7],[2,6],[5,3],[5,3]];
    var MUNCHANG = [5,6,8,9,8,9,11,0,2,3];
    var YANGIN = { 0:3, 2:6, 4:6, 6:9, 8:0 };
    var shinsal = [];
    function has(br){ return branches.filter(function(x){ return x.br === br; }).map(function(x){ return x.k; }); }
    [P.year.br, P.day.br].forEach(function(base, bi){
      var g = SAMHAP(base);
      [['도화살',DOHWA[g]],['역마살',YEOKMA[g]],['화개살',HWAGAE[g]]].forEach(function(s){
        var at = has(s[1]); if (at.length && !shinsal.some(function(x){return x.name===s[0];})) shinsal.push({ name:s[0], at:at });
      });
    });
    CHEONEUL[dStem].forEach(function(b){ var at = has(b); if (at.length && !shinsal.some(function(x){return x.name==='천을귀인';})) shinsal.push({ name:'천을귀인', at:at }); });
    (function(){ var at = has(MUNCHANG[dStem]); if (at.length) shinsal.push({ name:'문창귀인', at:at }); })();
    if (YANGIN[dStem] !== undefined){ var at2 = has(YANGIN[dStem]); if (at2.length) shinsal.push({ name:'양인살', at:at2 }); }
    if (['경진','경술','임진','임술','무술'].indexOf(P.day.name) > -1) shinsal.push({ name:'괴강살', at:['day'] });
    var xun = d60 - d60 % 10;
    var gong = [mod(xun + 10, 12), mod(xun + 11, 12)];

    /* 대운 */
    var yangYear = yStem % 2 === 0;
    var forward = (yangYear && input.gender === 'M') || (!yangYear && input.gender === 'F');
    var prevJie = findLon(mod(315 + 30*mIdx, 360), J - mod(lon - (315 + 30*mIdx), 360) / 0.98565);
    var nextJie = findLon(mod(315 + 30*(mIdx+1), 360), J + mod((315 + 30*(mIdx+1)) - lon, 360) / 0.98565);
    var days = forward ? nextJie - J : J - prevJie;
    var dNum = Math.max(1, Math.min(10, Math.round(days / 3)));
    var m60 = idx60(mStem, mBr);
    var daeun = [];
    for (var i=1;i<=10;i++){
      var n = mod(m60 + (forward ? i : -i), 60);
      var p = pillar(n % 10, n % 12);
      p.age = dNum + (i-1)*10;
      p.tenStem = tenGod(dStem, p.stem); p.tenBr = tenGod(dStem, BR_MAIN[p.br]); p.stage = stage12(dStem, p.br);
      daeun.push(p);
    }

    /* 올해 세운 · 이번 달 월운 */
    var now = new Date();
    var Jn = jd(now.getUTCFullYear(), now.getUTCMonth()+1, now.getUTCDate(), now.getUTCHours() + now.getUTCMinutes()/60);
    var ln = sunLon(Jn), ny = jdToKST(Jn).y;
    var nyS = Jn < findLon(315, jd(ny,2,4,0)) ? ny - 1 : ny;
    var seunP = pillar(mod(nyS-4,10), mod(nyS-4,12));
    seunP.tenStem = tenGod(dStem, seunP.stem); seunP.tenBr = tenGod(dStem, BR_MAIN[seunP.br]); seunP.stage = stage12(dStem, seunP.br); seunP.year = nyS;
    var nmIdx = Math.floor(mod(ln - 315, 360) / 30);
    var wolP = pillar(mod((seunP.stem % 5)*2 + 2 + nmIdx, 10), mod(nmIdx + 2, 12));
    wolP.tenStem = tenGod(dStem, wolP.stem); wolP.tenBr = tenGod(dStem, BR_MAIN[wolP.br]); wolP.stage = stage12(dStem, wolP.br);
    var ageK = now.getFullYear() - sy + 1;
    var curDaeun = null; daeun.forEach(function(p){ if (ageK >= p.age) curDaeun = p; });

    var lunar = solarToLunar(sy, sm, sd);
    var jieInfo = { prev: jdToKST(prevJie), next: jdToKST(nextJie) };

    return {
      input: input, solar:{ y:sy, m:sm, d:sd }, lunar: lunar, time: unknown ? null : { h:hh, mi:mi },
      corr: { zone:zone, dst:dst, corrMin:corrMin, lmH:lmH, lmMi:lmMi },
      pillars: P, cnt: cnt, total: total, dEl: dEl, ratio: ratio, strength: strength, yong: yong, hee: hee,
      shinsal: shinsal, gong: gong, forward: forward, dNum: dNum, daeun: daeun, curDaeun: curDaeun,
      seun: seunP, wolun: wolP, ageK: ageK, animal: BR_ANIMAL[yBr], color: COLOR_K[STEM_EL[yStem]], jie: jieInfo
    };
  }

  return { calc:calc, lunarToSolar:lunarToSolar, solarToLunar:solarToLunar, hasLeapMonth:hasLeapMonth,
           STEM_K:STEM_K, STEM_H:STEM_H, BR_K:BR_K, BR_H:BR_H, EL_K:EL_K, EL_H:EL_H, EL_KEY:EL_KEY, BR_ANIMAL:BR_ANIMAL,
           jd:jd, sunLon:sunLon, findLon:findLon, jdToKST:jdToKST,
           tenGod:tenGod, stage12:stage12, BR_MAIN:BR_MAIN, STEM_EL:STEM_EL, BR_EL:BR_EL, pillar:pillar };
})();
if (typeof module !== 'undefined') module.exports = MS;
