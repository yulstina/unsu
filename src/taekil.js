/* ================= 택일(중요한 날 잡기) =================
   - 오늘 운세(DAILY.today)와 달리 랜덤 없이 계산한다: 같은 사람 + 같은 목적 + 같은 날짜면 언제 봐도 같은 결과
   - 점수 = 기본 60 + 그날 일간이 내 일간에게 어떤 십성인지(목적별 가중) + 일지와 내 일지·연지의 합/충/원진
            + 내 일간이 그날 일지에서 받는 12운성 + 용신·희신 오행 + (이사) 손없는날
   - 내 일지와 충이 되는 날은 점수와 상관없이 '피할 날'
   - 시간대: 낮 시진(진~유) 중 그날 일지·내 일지와 합이 되고 충이 없는 시진 */
var TAEKIL = (function(){
  function mod(a, n){ return ((a % n) + n) % n; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function isHap(a, b){ return (a + b) % 12 === 1; }
  function isSamhap(a, b){ return a !== b && a % 4 === b % 4; }
  function isChung(a, b){ return mod(a - b, 12) === 6; }
  function wjOf(a){ return a % 2 === 0 ? (a + 7) % 12 : (a + 5) % 12; }
  function isWonjin(a, b){ return wjOf(a) === b || wjOf(b) === a; }
  function stemHap(a, b){ return a !== b && mod(a - b, 5) === 0 && Math.abs(a - b) === 5; }

  var PURPOSES = {
    open:    { name:'개업·사업자등록', short:'개업', verb:'시작하기', weekday:true,
               w:{ '비견':-2, '겁재':-10, '식신':12, '상관':6, '편재':14, '정재':12, '편관':-6, '정관':4, '편인':-2, '정인':2 } },
    contract:{ name:'계약·도장 찍기', short:'계약', verb:'도장 찍기', weekday:true,
               w:{ '비견':0, '겁재':-10, '식신':4, '상관':-10, '편재':2, '정재':8, '편관':-4, '정관':12, '편인':4, '정인':12 } },
    move:    { name:'이사·입주', short:'이사', verb:'옮기기', weekday:false,
               w:{ '비견':0, '겁재':-6, '식신':6, '상관':-4, '편재':2, '정재':6, '편관':-6, '정관':6, '편인':2, '정인':8 } },
    exam:    { name:'면접·시험', short:'면접', verb:'도전하기', weekday:true,
               w:{ '비견':0, '겁재':-2, '식신':2, '상관':-6, '편재':-4, '정재':0, '편관':6, '정관':14, '편인':8, '정인':12 } },
    love:    { name:'고백·상견례', short:'고백', verb:'마음 전하기', weekday:false,
               w:{ '비견':-2, '겁재':-8, '식신':8, '상관':0, '편재':4, '정재':6, '편관':2, '정관':6, '편인':-2, '정인':2 } }
  };
  var ORDER = ['open', 'contract', 'move', 'exam', 'love'];

  /* 십성 한 줄 (목적별) */
  var TEN_WHY = {
    open:{ '식신':'식신(재능)이 들어와 내가 가진 걸 세상에 내놓기 좋은 날', '상관':'상관(아이디어)이 살아나 새 판을 벌이기 좋은 날', '편재':'편재(큰 재물)가 들어와 돈의 흐름이 크게 열리는 날', '정재':'정재(꾸준한 재물)가 들어와 안정된 수입의 씨앗을 심는 날', '정관':'정관(신용)이 들어와 서류와 신뢰가 순하게 풀리는 날', '정인':'정인(문서)이 들어와 등록·서류 일이 매끄러운 날', '편인':'편인이 들어와 생각은 많아지고 실행은 느려지기 쉬운 날', '비견':'비견(나와 같은 기운)의 날이라 혼자 밀고 나가는 힘은 있는 날', '겁재':'겁재(나눠 가는 기운)의 날이라 돈이 새기 쉬운 날', '편관':'편관(압박)의 날이라 일이 무겁게 느껴지기 쉬운 날' },
    contract:{ '정관':'정관(신용·약속)이 들어와 도장 찍기 가장 좋은 날', '정인':'정인(문서)이 들어와 계약서가 내 편이 되는 날', '편인':'편인(문서)이 들어와 조건을 꼼꼼히 보기 좋은 날', '정재':'정재(실속)가 들어와 손해 없는 조건을 얻기 좋은 날', '식신':'식신이 들어와 대화가 부드럽게 풀리는 날', '편재':'편재가 들어와 조건이 크게 오가는 날', '상관':'상관(말이 날카로워짐)의 날이라 조항 다툼이 생기기 쉬운 날', '겁재':'겁재의 날이라 상대에게 양보할 일이 생기기 쉬운 날', '비견':'비견의 날이라 무난한 날', '편관':'편관의 날이라 압박 속에서 서두르기 쉬운 날' },
    move:{ '정인':'정인(집·문서)이 들어와 새 터에 뿌리내리기 좋은 날', '편인':'편인이 들어와 집과 서류 운이 무난한 날', '정관':'정관이 들어와 일이 순서대로 풀리는 날', '정재':'정재가 들어와 살림이 안정되는 날', '식신':'식신이 들어와 새집에서 먹고 사는 복이 붙는 날', '편재':'편재의 날이라 무난한 날', '비견':'비견의 날이라 무난한 날', '상관':'상관의 날이라 작은 마찰이 생기기 쉬운 날', '겁재':'겁재의 날이라 지출이 커지기 쉬운 날', '편관':'편관의 날이라 몸이 고되기 쉬운 날' },
    exam:{ '정관':'정관(합격·자리)이 들어와 평가받기 가장 좋은 날', '정인':'정인(문서·합격증)이 들어와 준비한 게 그대로 나오는 날', '편인':'편인이 들어와 직관과 순발력이 살아나는 날', '편관':'편관이 들어와 긴장 속에 힘을 내는 날', '식신':'식신이 들어와 말이 편하게 나오는 날', '정재':'정재의 날이라 무난한 날', '비견':'비견의 날이라 무난한 날', '겁재':'겁재의 날이라 경쟁이 세게 느껴지는 날', '상관':'상관(말실수)의 날이라 답을 한 번 더 고르는 게 좋은 날', '편재':'편재의 날이라 집중이 흩어지기 쉬운 날' },
    love:{ '식신':'식신이 들어와 표정과 말이 편안해지는 날', '정재':'정재가 들어와 마음과 현실이 함께 맞는 날', '편재':'편재가 들어와 분위기가 활발해지는 날', '정관':'정관이 들어와 진지한 약속이 잘 받아들여지는 날', '편관':'편관이 들어와 설렘과 긴장이 함께 있는 날', '정인':'정인이 들어와 어른들의 마음이 너그러운 날', '상관':'상관의 날이라 표현이 솔직하다 못해 셀 수 있는 날', '편인':'편인의 날이라 마음을 꺼내기 망설여지는 날', '비견':'비견의 날이라 자존심이 앞서기 쉬운 날', '겁재':'겁재의 날이라 경쟁자가 신경 쓰이는 날' }
  };
  var STRONG = { '장생':1, '관대':1, '건록':1, '제왕':1 }, WEAK = { '병':1, '사':1, '묘':1, '절':1 };
  var EL_K = ['목','화','토','금','수'];
  /* 시진 → 시간 문구 (한국 표준시 기준, 진태양시 약 30분 늦음 반영) */
  var HOUR_TXT = { 4:'오전 7:30~9:30', 5:'오전 9:30~11:30', 6:'오전 11:30~오후 1:30', 7:'오후 1:30~3:30', 8:'오후 3:30~5:30', 9:'오후 5:30~7:30' };

  function dayPillar(d){
    var r = MS.calc({ y:d.getFullYear(), m:d.getMonth() + 1, d:d.getDate(), cal:'solar', unknownTime:true, gender:'M', lonCorr:false });
    return r.pillars.day;
  }
  function sonEoptta(d){
    var l = MS.solarToLunar(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return !!(l && (l.d % 10 === 9 || l.d % 10 === 0));
  }

  function scoreDay(entry, r, purpose, d){
    var P = PURPOSES[purpose], me = r.pillars, dS = me.day.stem, dB = me.day.br, yB = me.year.br;
    var dp = dayPillar(d), ten = MS.tenGod(dS, dp.stem), stage = MS.stage12(dS, dp.br);
    var s = 60, why = [], warn = [];
    var tw = P.w[ten];
    /* 고백: 남자는 재성, 여자는 관성이 인연의 별 */
    if (purpose === 'love'){
      if (entry.gender === 'M' && (ten === '정재' || ten === '편재')) tw += 8;
      if (entry.gender !== 'M' && (ten === '정관' || ten === '편관')) tw += 8;
    }
    s += tw;
    (tw >= 4 ? why : tw <= -4 ? warn : why).push(TEN_WHY[purpose][ten]);

    var chung = isChung(dp.br, dB);
    if (chung){ s -= 22; warn.unshift('일지 충(' + me.day.bh + '·' + dp.bh + ') — 마음이 흔들리고 일이 틀어지기 쉬워요'); }
    else if (isHap(dp.br, dB)){ s += 10; why.push('일지 육합(' + me.day.bh + '·' + dp.bh + ') — 사람과 일이 순하게 맞물려요'); }
    else if (isSamhap(dp.br, dB)){ s += 7; why.push('일지 삼합(' + me.day.bh + '·' + dp.bh + ') — 주변의 도움이 모여요'); }
    else if (isWonjin(dp.br, dB)){ s -= 10; warn.push('일지 원진(' + me.day.bh + '·' + dp.bh + ') — 괜한 오해가 생기기 쉬워요'); }
    else if (dp.br === dB){ s += 2; }
    if (isChung(dp.br, yB)){ s -= 8; warn.push('띠와 충(' + MS.BR_H[yB] + '·' + dp.bh + ') — 바깥 일정이 꼬이기 쉬워요'); }
    if ((purpose === 'love' || purpose === 'contract') && stemHap(dp.stem, dS)){ s += 6; why.push('천간합(' + me.day.sh + '·' + dp.sh + ') — 상대와 마음이 맞닿아요'); }

    if (STRONG[stage]){ s += 6; why.push('내 기운이 ' + stage + '에 서서 힘이 넘치는 날'); }
    else if (WEAK[stage]){ s -= 5; warn.push('내 기운이 ' + stage + '에 있어 체력을 아껴야 하는 날'); }

    if (dp.sEl === r.yong){ s += 8; why.push('나에게 필요한 ' + EL_K[r.yong] + '(용신) 기운이 들어오는 날'); }
    else if (dp.sEl === r.hee){ s += 4; why.push(EL_K[r.hee] + '(희신) 기운이 나를 받쳐 주는 날'); }
    else if (mod(r.yong - dp.sEl, 5) === 2){ s -= 4; }

    var son = purpose === 'move' && sonEoptta(d);
    if (son){ s += 10; why.unshift('손없는날 — 예부터 이사·입주에 좋다고 보는 날'); }

    s = clamp(Math.round(s), 30, 99);
    var tier = chung || s < 50 ? 'bad' : s >= 78 ? 'good' : 'mid';
    if (tier === 'bad' && !warn.length) warn.push('이 일에 힘이 되는 기운이 들어오지 않고 내 기운도 약한 날');
    return { date:d, key:ymd(d), pillar:dp, ten:ten, stage:stage, score:s, tier:tier, chung:chung, son:son, why:why.filter(Boolean), warn:warn.filter(Boolean),
             hours:goodHours(dp.br, dB) };
  }
  function goodHours(dayBr, myBr){
    var out = [];
    [5, 6, 7, 8, 4, 9].forEach(function(h){
      if (out.length >= 2 || isChung(h, dayBr) || isChung(h, myBr)) return;
      if (isHap(h, dayBr) || isHap(h, myBr) || isSamhap(h, dayBr) || isSamhap(h, myBr)) out.push({ br:h, name:MS.BR_K[h] + '시', txt:HOUR_TXT[h] });
    });
    if (!out.length) [5, 6, 7].some(function(h){ if (!isChung(h, dayBr) && !isChung(h, myBr)){ out.push({ br:h, name:MS.BR_K[h] + '시', txt:HOUR_TXT[h] }); return true; } });
    return out;
  }
  function ymd(d){ return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* start부터 days일을 계산. weekdayOnly면 토·일은 off 표시만 하고 순위에서 뺀다 */
  function scan(entry, r, purpose, start, days, weekdayOnly){
    var list = [], base = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    for (var i = 0; i < days; i++){
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      var o = scoreDay(entry, r, purpose, d);
      o.off = !!(weekdayOnly && (d.getDay() === 0 || d.getDay() === 6));
      list.push(o);
    }
    var pool = list.filter(function(o){ return !o.off && !o.chung; });
    var best = pool.slice().sort(function(a, b){ return b.score - a.score || a.date - b.date; }).slice(0, 3);
    var avoid = list.filter(function(o){ return !o.off && o.tier === 'bad'; });
    return { purpose:purpose, list:list, best:best, avoid:avoid, good:pool.filter(function(o){ return o.tier === 'good'; }).length };
  }

  return { PURPOSES:PURPOSES, ORDER:ORDER, scan:scan, scoreDay:scoreDay, ymd:ymd };
})();
if (typeof module !== 'undefined') module.exports = TAEKIL;
