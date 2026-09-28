/* ================= 오늘의 운세 · 궁합 ================= */
var DAILY = (function(){
  function h32(str){ var h = 0; for (var i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0; return h >>> 0; }
  function rng(seed){ var a = h32(seed); return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pick(arr, r){ return arr[Math.floor(r() * arr.length)]; }
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function mod(a, n){ return ((a % n) + n) % n; }

  /* ---- 지지 관계 ---- */
  function isHap(a, b){ return (a + b) % 12 === 1; }                 /* 육합 */
  function isSamhap(a, b){ return a !== b && a % 4 === b % 4; }         /* 삼합 */
  function isChung(a, b){ return mod(a - b, 12) === 6; }                /* 충 */
  function wjOf(a){ return a % 2 === 0 ? (a + 7) % 12 : (a + 5) % 12; }
  function isWonjin(a, b){ return wjOf(a) === b || wjOf(b) === a; }     /* 원진 */
  function brRel(a, b){ return isHap(a,b) ? 'hap' : isSamhap(a,b) ? 'samhap' : isChung(a,b) ? 'chung' : isWonjin(a,b) ? 'wonjin' : a === b ? 'same' : 'none'; }

  /* ================= 오늘의 운세 문구 ================= */
  var HEAD = {
    '비견':['내 속도대로 걸어도 충분한 날','남과 비교하지 않을 때 편안해지는 날'],
    '겁재':['승부욕은 살리고 지갑은 닫아 두는 날','과감함이 빛나지만 한 템포 쉬어 가는 날'],
    '식신':['좋아하는 일에 몰입하면 운이 따라오는 날','맛있는 한 끼가 기분을 바꿔 주는 날'],
    '상관':['말 한마디에 힘이 실리는 날','번뜩이는 아이디어를 바로 적어 두는 날'],
    '편재':['예상 밖의 기회가 스쳐 가는 날','크게 보고 작게 움직이면 좋은 날'],
    '정재':['욕심보다 한 가지에 집중하는 날','차곡차곡 쌓은 것이 보답받는 날'],
    '편관':['부담이 오히려 나를 단단하게 만드는 날','피하고 싶던 일을 먼저 처리하는 날'],
    '정관':['약속과 원칙이 신뢰로 돌아오는 날','단정한 태도가 좋은 평가로 이어지는 날'],
    '편인':['직감이 평소보다 정확한 날','혼자만의 시간이 답을 주는 날'],
    '정인':['도움의 손길이 자연스럽게 닿는 날','배우고 정리하기에 좋은 날']
  };
  var TEN_DAILY = {
    '비견':'오늘은 비견의 기운이 강하게 작용해요. 나와 비슷한 사람들과 어울리며 힘을 얻지만, 은근한 경쟁심에 마음이 쓰일 수 있어요. 남의 속도에 맞추기보다 내 페이스를 지키는 것이 가장 좋은 선택이에요.',
    '겁재':'오늘은 겁재의 기운이 강하게 작용해요. 추진력과 배짱이 커지는 대신 충동적인 지출이나 무리한 약속으로 이어지기 쉬워요. 결정하기 전에 딱 하루만 더 생각해 보세요.',
    '식신':'오늘은 식신의 기운이 강하게 작용해요. 마음에 여유가 생기고 손끝 감각이 살아나는 날이라, 만들고 표현하는 일에서 좋은 결과가 나와요. 잘 먹고 잘 쉬는 것도 오늘의 운을 키우는 방법이에요.',
    '상관':'오늘은 상관의 기운이 강하게 작용해요. 생각이 빠르고 말솜씨가 좋아져 주목받기 쉽지만, 솔직함이 날카롭게 들릴 수 있어요. 윗사람 앞에서는 한 번 다듬어서 말해 보세요.',
    '편재':'오늘은 편재의 기운이 강하게 작용해요. 사람과 정보가 활발하게 오가며 뜻밖의 기회가 생길 수 있어요. 다만 크게 벌이는 일은 작게 시험해 본 뒤에 키우는 편이 안전해요.',
    '정재':'오늘은 정재의 기운이 강하게 작용해요. 현실적인 판단을 할 수 있는 날이지만, 냉정해 보일 수 있어요. 해야 할 일의 우선순위를 정하고 하나씩 끝내면 만족스러운 하루가 돼요.',
    '편관':'오늘은 편관의 기운이 강하게 작용해요. 책임이 몰리거나 예상하지 못한 요구를 받을 수 있지만, 정면으로 부딪히면 오히려 실력을 인정받는 계기가 돼요. 컨디션 관리를 꼭 챙기세요.',
    '정관':'오늘은 정관의 기운이 강하게 작용해요. 규칙을 지키고 약속을 챙기는 모습이 신뢰로 돌아오는 날이에요. 공식적인 자리나 서류 일에 특히 좋은 흐름이 있어요.',
    '편인':'오늘은 편인의 기운이 강하게 작용해요. 남들이 못 보는 것을 알아채는 직관이 살아나지만, 생각이 많아져 결정이 늦어질 수 있어요. 떠오른 아이디어는 메모해 두고 결정은 오후로 미뤄 보세요.',
    '정인':'오늘은 정인의 기운이 강하게 작용해요. 주변의 도움과 조언이 자연스럽게 따라오는 날이에요. 새로운 것을 배우거나 밀린 공부, 정리를 시작하기에 좋아요.'
  };
  var REL_NOTE = {
    hap:' 오늘의 일진이 내 일지와 합을 이뤄 사람 사이의 흐름이 부드러워요.',
    samhap:' 오늘의 일진이 내 일지와 삼합을 이뤄 협업운이 좋아요.',
    chung:' 다만 오늘의 일진이 내 일지와 충돌해 일정이 흔들리기 쉬우니 여유 시간을 두세요.',
    wonjin:' 오늘은 사소한 말에 서운함이 생기기 쉬우니 표현을 부드럽게 해 보세요.',
    same:'', none:''
  };
  var LINES = {
    w:{ hi:['작은 투자가 기분 좋은 결과로 돌아와요.','생각지 못한 곳에서 이득이 생겨요.','계획해 둔 지출이 제값을 해요.'],
        mid:['경험 없는 일을 할 때는 주위의 조언을 구해 보세요.','큰돈보다 새는 돈을 막는 날이에요.','가격 비교 한 번이 이득을 만들어요.'],
        lo:['충동구매는 장바구니에만 담아 두세요.','빌려주고 빌리는 일은 미뤄 두는 게 좋아요.','오늘 결제는 내일 한 번 더 보고 해도 늦지 않아요.'] },
    l:{ hi:['마음을 표현하면 기대 이상의 답이 와요.','가벼운 연락이 좋은 흐름을 만들어요.','함께 웃을 일이 생기는 날이에요.'],
        mid:['상대에게 큰 기대를 했다면 실망하게 될 수 있어요.','듣는 쪽이 되어 주면 관계가 편안해져요.','약속 시간만 잘 지켜도 점수를 얻어요.'],
        lo:['예민한 이야기는 다음으로 미뤄 두세요.','말투 하나에 오해가 생기기 쉬워요.','혼자만의 시간이 관계에도 도움이 돼요.'] },
    j:{ hi:['맡은 일에서 존재감이 드러나요.','윗사람의 인정을 받기 좋은 날이에요.','미뤄 둔 일을 끝낼 힘이 생겨요.'],
        mid:['너무 돋보이려 애쓸 필요 없어요.','우선순위만 정해도 반은 끝난 셈이에요.','동료와 역할을 나누면 속도가 붙어요.'],
        lo:['실수를 줄이려면 한 번 더 확인하세요.','새로운 일보다 마무리에 집중하세요.','무리한 약속은 정중히 미뤄 두세요.'] }
  };
  var EL_TIPS = [
    { colors:['초록','민트','청록'], items:['작은 화분','나무 소재 소품','노트','운동화'], foods:['샐러드','녹차','브로콜리','키위'] },
    { colors:['빨강','코랄','보라'], items:['향초','선글라스','립밤','빨간 펜'], foods:['토마토','딸기','매운 떡볶이','커피'] },
    { colors:['베이지','노랑','브라운'], items:['도자기 머그','가죽 지갑','쿠션','손수건'], foods:['고구마','단호박','바나나','꿀차'] },
    { colors:['흰색','은색','골드'], items:['시계','반지','금속 키링','이어폰'], foods:['배','두부','무생채','우유'] },
    { colors:['남색','하늘색','검정'], items:['텀블러','로션','우산','향수'], foods:['미역국','블루베리','검은콩','생수'] }
  ];
  var EL_BLESS = ['나무','불','흙','쇠','물'];

  var GRP = { '비겁':{w:62,l:70,j:72}, '식상':{w:76,l:84,j:70}, '재성':{w:88,l:76,j:72}, '관성':{w:68,l:74,j:88}, '인성':{w:66,l:72,j:82} };
  var STRONG = ['장생','관대','건록','제왕'], WEAK = ['병','사','묘','절'];

  function dayPillars(dateObj){
    var r = MS.calc({ y:dateObj.getFullYear(), m:dateObj.getMonth()+1, d:dateObj.getDate(), cal:'solar', unknownTime:true, gender:'M', lonCorr:false });
    return r.pillars;
  }

  /* entry: 저장된 사주, r: MS.calc 결과, dateObj: Date */
  function today(entry, r, dateObj){
    var ds = dateObj.getFullYear() + '-' + (dateObj.getMonth()+1) + '-' + dateObj.getDate();
    var P = dayPillars(dateObj), dp = P.day;
    var dStem = r.pillars.day.stem;
    var ten = MS.tenGod(dStem, dp.stem), tenB = MS.tenGod(dStem, MS.BR_MAIN[dp.br]);
    var stage = MS.stage12(dStem, dp.br);
    var group = TEN_TO_GROUP[ten];
    var rel = brRel(dp.br, r.pillars.day.br);
    var rand = rng(entry.name + '|' + entry.y + '-' + entry.m + '-' + entry.d + '|' + entry.hour + ':' + entry.minute + '|' + entry.gender + '|' + ds);
    var b = GRP[group], s = { w:b.w, l:b.l, j:b.j };
    if ((entry.gender === 'M' && group === '재성') || (entry.gender === 'F' && group === '관성')) s.l += 8;
    if (rel === 'hap' || rel === 'samhap'){ s.l += 7; s.j += 3; }
    if (rel === 'chung'){ s.w -= 6; s.l -= 6; s.j -= 8; }
    if (rel === 'wonjin'){ s.l -= 7; }
    var st = STRONG.indexOf(stage) > -1 ? 4 : WEAK.indexOf(stage) > -1 ? -3 : 0;
    ['w','l','j'].forEach(function(k){ s[k] = clamp(Math.round(s[k] + st + (rand()*12 - 6)), 42, 99); });
    function band(v){ return v >= 85 ? 'hi' : v >= 70 ? 'mid' : 'lo'; }
    var lines = { w:pick(LINES.w[band(s.w)], rand), l:pick(LINES.l[band(s.l)], rand), j:pick(LINES.j[band(s.j)], rand) };
    var head = pick(HEAD[ten], rand);
    var luckyEl = rand() < .6 ? r.yong : r.hee;
    var tips = EL_TIPS[luckyEl];
    var total = Math.round((s.w + s.l + s.j) / 3);
    return {
      date: dateObj, pillars: P, ten: ten, tenB: tenB, stage: stage, rel: rel, scores: s, total: total, lines: lines, head: head,
      body: TEN_DAILY[ten] + REL_NOTE[rel], luckyEl: luckyEl, bless: EL_BLESS[luckyEl],
      tip: { color: pick(tips.colors, rand), item: pick(tips.items, rand), food: pick(tips.foods, rand), nums: EL_TEXT[luckyEl].num },
      auraEl: MS.EL_KEY[dp.sEl]
    };
  }

  /* ================= 궁합 ================= */
  var STEM_HAP_NAME = ['갑기합','을경합','병신합','정임합','무계합'];
  var REL_TXT = {
    hap:{ t:'천간합 — 서로를 완성하는 사이', glow:'두 사람의 일간이 합을 이뤄 처음 만났을 때부터 묘하게 끌리고 편안합니다. 서로에게 없는 부분을 자연스럽게 채워 주는 조합이에요.', clash:'너무 잘 맞는다고 느껴 서로의 경계를 놓치기 쉬워요. 각자의 시간과 영역을 존중할수록 오래갑니다.', tip:'가끔은 각자의 친구, 각자의 취미를 즐기는 날을 정해 두세요.' },
    genAB:{ t:'A가 B를 살리는 상생', glow:'A의 기운이 B를 북돋우는 관계예요. A는 챙겨 주고 B는 그 덕에 성장하는, 보살핌이 자연스러운 조합입니다.', clash:'A가 주는 쪽에 치우치면 지칠 수 있어요. B가 고마움을 말로 표현하는 것이 균형을 맞춰 줍니다.', tip:'B가 먼저 계획을 세워 A를 초대하는 날을 만들어 보세요.' },
    genBA:{ t:'B가 A를 살리는 상생', glow:'B의 기운이 A를 북돋우는 관계예요. B의 응원 덕분에 A가 한층 대담해지고 편안해집니다.', clash:'B가 늘 맞춰 주다 보면 서운함이 쌓일 수 있어요. A가 B의 이야기를 끝까지 들어 주는 게 중요해요.', tip:'A가 B의 관심사에 하루를 통째로 맞춰 보세요.' },
    ctlAB:{ t:'A가 B를 다듬는 상극', glow:'A가 B를 이끌고 방향을 잡아 주는 관계예요. 목표가 같으면 추진력이 대단한 팀이 됩니다.', clash:'A의 조언이 B에게는 간섭으로 느껴질 수 있어요. 지적보다 질문으로 말을 시작해 보세요.', tip:'결정할 일은 “네 생각은 어때?”로 시작하는 규칙을 만들어 보세요.' },
    ctlBA:{ t:'B가 A를 다듬는 상극', glow:'B가 A의 넘치는 부분을 잡아 주는 관계예요. 서로 긴장감이 있어 지루할 틈이 없습니다.', clash:'B의 현실적인 말이 A에게는 제동처럼 들릴 수 있어요. 칭찬을 먼저 건네면 대화가 부드러워져요.', tip:'한 달에 한 번, 서로 고마웠던 점을 세 가지씩 말해 보세요.' },
    same:{ t:'같은 오행 — 거울 같은 사이', glow:'같은 기운을 가진 두 사람이라 말하지 않아도 통하는 부분이 많아요. 취향과 속도가 비슷해 함께 있으면 편합니다.', clash:'닮은 만큼 고집이 부딪히면 둘 다 물러서지 않아요. 한 사람이 먼저 한 발 물러서는 연습이 필요해요.', tip:'의견이 갈리면 가위바위보처럼 가벼운 규칙으로 정해 보세요.' }
  };
  var BR_TXT = {
    hap:'일지 육합 — 생활 리듬과 감정의 결이 잘 맞아요.',
    samhap:'일지 삼합 — 함께하는 목표가 생기면 시너지가 커요.',
    chung:'일지 충 — 부딪히며 자극을 주는 사이, 거리 조절이 핵심이에요.',
    wonjin:'일지 원진 — 이유 없는 서운함이 생기기 쉬워 표현이 중요해요.',
    same:'같은 일지 — 생활 방식이 닮아 편안해요.',
    none:'무난한 일지 — 큰 충돌 없이 서로의 방식을 존중해요.'
  };
  function grade(v){ return v >= 90 ? '천생연분' : v >= 80 ? '찰떡궁합' : v >= 70 ? '좋은 인연' : v >= 60 ? '맞춰 가는 사이' : '반대가 끌리는 사이'; }
  var SUMMARY = {
    '천생연분':'말하지 않아도 서로를 알아보는, 드물게 잘 맞는 조합이에요.',
    '찰떡궁합':'함께할수록 서로의 장점이 커지는 든든한 조합이에요.',
    '좋은 인연':'편안함 속에 적당한 자극이 있는 건강한 관계예요.',
    '맞춰 가는 사이':'다른 점을 이해해 갈수록 깊어지는 관계예요.',
    '반대가 끌리는 사이':'정반대라 끌리고, 그래서 배울 게 많은 관계예요.'
  };

  function match(ea, ra, eb, rb){
    var a = ra.pillars.day.stem, b = rb.pillars.day.stem;
    var ae = MS.STEM_EL[a], be = MS.STEM_EL[b];
    var stemRel, score = 62, notes = [];
    if (mod(a - b, 10) === 5){ stemRel = 'hap'; score += 18; }
    else if (ae === be){ stemRel = 'same'; score += 6; }
    else if (mod(be - ae, 5) === 1){ stemRel = 'genAB'; score += 10; }
    else if (mod(ae - be, 5) === 1){ stemRel = 'genBA'; score += 10; }
    else if (mod(be - ae, 5) === 2){ stemRel = 'ctlAB'; score -= 3; }
    else { stemRel = 'ctlBA'; score -= 3; }
    var dRel = brRel(ra.pillars.day.br, rb.pillars.day.br);
    score += { hap:12, samhap:8, chung:-10, wonjin:-7, same:2, none:0 }[dRel];
    var yRel = brRel(ra.pillars.year.br, rb.pillars.year.br);
    score += { hap:5, samhap:5, chung:-5, wonjin:-3, same:1, none:0 }[yRel];
    /* 오행 보완 */
    var comp = [];
    var aMin = ra.cnt.indexOf(Math.min.apply(null, ra.cnt)), bMin = rb.cnt.indexOf(Math.min.apply(null, rb.cnt));
    if (rb.cnt[aMin] >= 2){ score += 6; comp.push({ who:'B', to:'A', el:aMin }); }
    if (ra.cnt[bMin] >= 2){ score += 6; comp.push({ who:'A', to:'B', el:bMin }); }
    var key = [ea.y, ea.m, ea.d, ea.hour, eb.y, eb.m, eb.d, eb.hour].join('|');
    var rand = rng(key);
    score = clamp(Math.round(score + rand()*8 - 4), 48, 98);
    var g = grade(score);
    return { score:score, grade:g, summary:SUMMARY[g], stemRel:stemRel, stemTxt:REL_TXT[stemRel],
      stemHap: stemRel === 'hap' ? STEM_HAP_NAME[Math.min(a, b) % 5] : null,
      dRel:dRel, dTxt:BR_TXT[dRel], yRel:yRel, comp:comp };
  }

  return { today:today, match:match, brRel:brRel, dayPillars:dayPillars };
})();

/* ================= 게스트용: 오늘의 기운 · 띠별 운세 ================= */
var PUBLIC_DAY = (function(){
  var DAY_MSG = [
    '곧게 뻗는 큰 나무의 날. 새로 시작하는 일에 힘이 실려요.',
    '바람에 흔들리며 자라는 꽃의 날. 유연하게 맞춰 가면 일이 풀려요.',
    '태양이 높이 뜬 날. 드러내고 표현할수록 좋은 반응이 와요.',
    '촛불처럼 은은한 날. 가까운 사람과 깊은 대화를 나누기 좋아요.',
    '큰 산처럼 묵직한 날. 흔들리지 않고 중심을 지키면 돼요.',
    '기름진 밭의 날. 차근차근 가꾸고 정리하기 좋아요.',
    '단단한 쇠의 날. 미뤄 둔 결정을 내리기 좋아요.',
    '빛나는 보석의 날. 디테일을 다듬으면 결과가 달라져요.',
    '큰 강이 흐르는 날. 넓게 보고 흐름을 타면 기회가 와요.',
    '비가 스며드는 날. 직감을 믿고 조용히 준비해 보세요.'
  ];
  var DDI = {
    hap:{ s:5, l:['귀인이 가까이 있어요. 먼저 연락해 보세요.','작은 부탁이 큰 도움으로 돌아와요.','함께하는 일에서 좋은 소식이 들려요.'] },
    samhap:{ s:4, l:['팀으로 움직이면 성과가 커지는 날이에요.','생각이 통하는 사람을 만나기 좋아요.','미뤄 둔 약속을 잡기 좋은 날이에요.'] },
    same:{ s:4, l:['내 페이스를 지키면 순조로워요.','익숙한 방식이 정답인 날이에요.','꾸준함이 빛을 보는 하루예요.'] },
    none:{ s:3, l:['무난한 하루, 작은 즐거움을 챙겨 보세요.','평소처럼 지내면 충분한 날이에요.','가벼운 산책이 기분을 바꿔 줘요.'] },
    wonjin:{ s:2, l:['사소한 말에 예민해질 수 있어요. 한 번 더 부드럽게.','서운한 마음은 오래 두지 마세요.','혼자만의 시간이 도움이 되는 날이에요.'] },
    chung:{ s:2, l:['일정이 흔들릴 수 있어요. 여유 시간을 두세요.','이동과 변화가 많은 날, 서두르지 마세요.','큰 결정은 하루 미뤄 두는 게 좋아요.'] }
  };
  function h32(str){ var h = 0; for (var i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0; return h >>> 0; }
  function today(dateObj){
    var P = DAILY.dayPillars(dateObj), br = P.day.br;
    var ds = dateObj.getFullYear() + '-' + (dateObj.getMonth()+1) + '-' + dateObj.getDate();
    var order = [0,1,2,3,4,5,6,7,8,9,10,11];
    var rows = order.map(function(b){
      var rel = DAILY.brRel(br, b), d = DDI[rel];
      return { br:b, animal:MS.BR_ANIMAL[b], rel:rel, score:d.s, line:d.l[h32(ds + '|' + b) % d.l.length] };
    });
    return { pillars:P, msg:DAY_MSG[P.day.stem], rows:rows };
  }
  return { today:today };
})();
