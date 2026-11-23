/* 우니조아 AI 풀이 공통 (우니에게 묻기 · 꿈해몽)
 *
 * 2026-11-23 소율 결정: GPT로 바꾸지 않고 Claude 낮은 등급(Haiku)으로, 아래 네 가지를 갖춰서 쓴다.
 *   1) 원국은 LLM이 계산하지 않는다. 앱과 같은 만세력 엔진(public/js/core.js)으로 서버에서 계산한 값을 넘긴다
 *   2) 명리 지식은 앱 안의 해설 사전(일간·십성·신강약·오행·세운·12운성·신살)에서 이 사람에게 해당하는 항목만 골라 넣는다(RAG)
 *   3) 시스템 프롬프트 + few-shot 예시로 말투·길이·근거 쓰는 법을 고정한다
 *   4) 답이 나온 뒤 원국과 모순되는 말(다른 일간, 없는 오행을 많다고 함, 신강/신약 반대), 숫자·복권 표현을 검사해서
 *      걸리면 한 번 고쳐 쓰게 하고, 그래도 걸리면 규칙 기반 답으로 바꾼다
 *
 * 모델은 Vercel 환경변수 AI_MODEL 로 바꿀 수 있다(기본 claude-haiku-5-5). 키는 ANTHROPIC_API_KEY.
 */
const core = require('./core.js');

const MODEL = process.env.AI_MODEL || 'claude-haiku-5-5';
const TJ_YEAR = 2027;

/* ---------- 1) 원국 계산 (앱과 같은 엔진) ---------- */
function int(v, lo, hi) { const n = parseInt(v, 10); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; }
function readBirth(b) {
  if (!b || typeof b !== 'object') return null;
  const y = int(b.y, 1900, 2050), m = int(b.m, 1, 12), d = int(b.d, 1, 31);
  if (y == null || m == null || d == null) return null;
  const unknown = !!b.unknown || int(b.hour, 0, 23) == null;
  return {
    y, m, d, cal: b.cal === 'lunar' ? 'lunar' : 'solar', leap: !!b.leap,
    hour: unknown ? 12 : int(b.hour, 0, 23), minute: unknown ? 0 : (int(b.minute, 0, 59) || 0),
    unknownTime: unknown, gender: b.gender === 'F' ? 'F' : 'M', lonCorr: b.corr !== false, lon: 127
  };
}

/* 엔진 결과 → LLM에 넘길 '사실' 묶음. 숫자·글자는 전부 엔진 값이고, 검증할 때도 이걸 기준으로 본다 */
function facts(birth, name, now) {
  const C = core(), MS = C.MS;
  const inp = readBirth(birth);
  if (!inp) return null;
  const r = MS.calc(Object.assign({}, inp, { now: now || undefined }));
  if (!r || r.error) return null;
  const P = r.pillars, dS = P.day.stem, EL = MS.EL_K;
  const pos = [['year', '년'], ['month', '월'], ['day', '일'], ['hour', '시']].filter(x => P[x[0]]);
  /* 원국 십성: 년간·월간·시간 + 네 지지의 본기 */
  const tens = [];
  pos.forEach(([k, l]) => {
    if (k !== 'day') tens.push(l + '간 ' + P[k].tenStem);
    tens.push(l + '지 ' + P[k].tenBr);
  });
  const grp = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  pos.forEach(([k]) => { if (k !== 'day') grp[C.TEN_TO_GROUP[P[k].tenStem]]++; grp[C.TEN_TO_GROUP[P[k].tenBr]]++; });
  const ent = { name: String(name || ''), y: inp.y, m: inp.m, d: inp.d, hour: inp.hour, minute: inp.minute, gender: inp.gender };
  const nowD = now ? new Date(now) : new Date();
  const kst = new Date(nowD.getTime() + 9 * 3600e3);
  const today = C.DAILY.today(ent, r, new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 12));
  const ny = MS.calc({ y: TJ_YEAR, m: 6, d: 15, cal: 'solar', unknownTime: true, gender: 'M', lonCorr: false }).pillars.year;
  const ageK = r.ageK;
  return {
    r, dStem: dS, dEl: r.dEl, cnt: r.cnt.slice(), strength: r.strength, yong: r.yong, hee: r.hee,
    unknownTime: inp.unknownTime, gender: inp.gender, ageK,
    pillars: pos.map(([k, l]) => ({ pos: l + '주', hanja: P[k].hanja, kor: P[k].name, stemEl: EL[P[k].sEl], brEl: EL[P[k].bEl] })),
    ilgan: MS.STEM_K[dS] + EL[MS.STEM_EL[dS]] + '(' + MS.STEM_H[dS] + MS.EL_H[MS.STEM_EL[dS]] + ')',
    tens, grp,
    shinsal: r.shinsal.map(s => s.name),
    daeun: r.curDaeun ? { name: r.curDaeun.name, age: r.curDaeun.age, tenStem: r.curDaeun.tenStem, tenBr: r.curDaeun.tenBr } : null,
    seun: { year: r.seun.year, name: r.seun.name, tenStem: r.seun.tenStem, tenBr: r.seun.tenBr, stage: r.seun.stage },
    next: { year: TJ_YEAR, name: ny.name, tenStem: MS.tenGod(dS, ny.stem), tenBr: MS.tenGod(dS, MS.BR_MAIN[ny.br]) },
    today: { name: today.pillars.day.name, ten: today.ten, stage: today.stage, rel: today.rel, head: today.head, scores: today.scores }
  };
}

const REL_K = { hap: '일지와 합', samhap: '일지와 삼합', chung: '일지와 충', wonjin: '일지와 원진', same: '일지와 같은 글자', none: '특별한 작용 없음' };
function factsText(f, who) {
  const EL = core().MS.EL_K;
  const g = f.grp;
  return [
    `호칭: ${who || '사용자'}님 · ${f.gender === 'F' ? '여성' : '남성'} · 한국 나이 ${f.ageK}세`,
    `사주 원국: ${f.pillars.map(p => `${p.pos} ${p.hanja}(${p.kor})`).join(' · ')}${f.unknownTime ? ' (태어난 시간 모름 → 시주 없음)' : ''}`,
    `일간(나 자신): ${f.ilgan}`,
    `오행 개수(여덟 글자 기준): ${EL.map((k, i) => `${k} ${f.cnt[i]}`).join(', ')}` +
      (f.cnt.some(n => n === 0) ? ` → 없는 오행: ${EL.filter((k, i) => !f.cnt[i]).join('·')}` : '') +
      ` → 가장 많은 오행: ${EL.filter((k, i) => f.cnt[i] === Math.max(...f.cnt)).join('·')}`,
    `일간의 힘: ${f.strength}`,
    `용신(힘이 되는 기운): ${EL[f.yong]} · 희신: ${EL[f.hee]}`,
    `원국 십성: ${f.tens.join(', ')}`,
    `십성 무리 개수: 비겁 ${g.비겁}, 식상 ${g.식상}, 재성 ${g.재성}, 관성 ${g.관성}, 인성 ${g.인성}`,
    f.shinsal.length ? `신살: ${f.shinsal.join(', ')}` : '신살: 없음',
    f.daeun ? `지금 대운: ${f.daeun.name}(${f.daeun.age}세부터 10년) · 천간 ${f.daeun.tenStem}, 지지 ${f.daeun.tenBr}` : '지금 대운: 아직 첫 대운 전',
    `올해 ${f.seun.year}년 ${f.seun.name}: 천간 ${f.seun.tenStem}, 지지 ${f.seun.tenBr}, 12운성 ${f.seun.stage}`,
    `내년 ${f.next.year}년 ${f.next.name}: 천간 ${f.next.tenStem}, 지지 ${f.next.tenBr}`,
    `오늘 일진 ${f.today.name}: ${f.today.ten}의 날, 12운성 ${f.today.stage}, ${REL_K[f.today.rel] || ''} · 오늘 한 줄 "${f.today.head}"`
  ].join('\n');
}

/* ---------- 2) 명리 지식 고르기 (앱 해설 사전에서 이 사람에게 해당하는 항목만) ---------- */
const RULES = `- 오행 상생: 목→화→토→금→수→목 (앞이 뒤를 돕는다). 상극: 목은 토를, 토는 수를, 수는 화를, 화는 금을, 금은 목을 누른다.
- 십성은 일간을 기준으로 정한다. 같은 오행=비겁(비견·겁재), 일간이 낳는 오행=식상(식신·상관), 일간이 누르는 오행=재성(편재·정재), 일간을 누르는 오행=관성(편관·정관), 일간을 낳는 오행=인성(편인·정인).
- 신강(일간의 힘이 강함)이면 식상·재성·관성으로 힘을 써 줄 때, 신약이면 인성·비겁의 도움을 받을 때 운이 순하다. 용신은 이 균형을 맞춰 주는 오행이다.
- 주제별로 보는 자리: 연애·배우자는 일지(배우자 자리)와 남성은 재성·여성은 관성. 직장·명예·합격은 관성, 재능·표현·이직의 동력은 식상, 공부·자격·문서는 인성. 재물은 재성, 그리고 식상이 재성을 낳는 흐름(식상생재). 인간관계·경쟁·동업은 비겁.
- 운의 시기: 대운(10년 계절) > 세운(한 해) > 일진(하루) 순으로 큰 흐름이다. 한 해 이야기는 세운 십성으로, 하루 이야기는 일진 십성으로 말한다.`;

function knowledge(f, topic) {
  const C = core();
  const out = [];
  const il = C.ILGAN[f.dStem];
  if (il) out.push(`[일간 ${il.t}] ${il.img}. ${il.d} 강점: ${il.good} 조심: ${il.care}` + (topic === 'work' || topic === 'money' ? ` 맞는 분야: ${il.fit}` : ''));
  if (C.STRENGTH_TEXT[f.strength]) out.push(`[${f.strength}] ${C.STRENGTH_TEXT[f.strength]}`);
  const EL = C.EL_TEXT;
  if (EL[f.yong]) out.push(`[용신 ${EL[f.yong].name}] 색 ${EL[f.yong].color}, 방향 ${EL[f.yong].dir}, 도움 되는 행동: ${EL[f.yong].act}`);
  f.cnt.forEach((n, i) => {
    if (n >= 3 && EL[i]) out.push(`[${EL[i].name} 많음] ${EL[i].many}`);
    if (n === 0 && EL[i]) out.push(`[${EL[i].name} 없음] ${EL[i].few}`);
  });
  const want = { love: f.gender === 'F' ? ['관성'] : ['재성'], work: ['관성', '식상', '인성'], money: ['재성', '식상'], people: ['비겁'], day: [], etc: [] }[topic] || [];
  want.forEach(gk => {
    const g = C.TEN_GROUP[gk]; if (!g) return;
    const n = f.grp[gk];
    out.push(`[${g.n} ${n}개] ${g.m}. ${n >= 2 ? g.hi : n === 0 ? g.lo : ''}`.trim());
  });
  if (C.SEUN_TEXT[f.seun.tenStem]) out.push(`[올해 ${f.seun.tenStem}의 해] ${C.SEUN_TEXT[f.seun.tenStem]}`);
  if (C.SEUN_TEXT[f.next.tenStem]) out.push(`[${f.next.year}년 ${f.next.tenStem}의 해] ${C.SEUN_TEXT[f.next.tenStem]}`);
  if (f.daeun && C.TEN_DESC[f.daeun.tenStem]) out.push(`[대운 ${f.daeun.tenStem}] ${C.TEN_DESC[f.daeun.tenStem]}`);
  if (C.TEN_DESC[f.today.ten]) out.push(`[오늘 ${f.today.ten}] ${C.TEN_DESC[f.today.ten]}`);
  if (topic === 'love' && f.shinsal.indexOf('도화살') > -1 && C.SHINSAL_TEXT['도화살']) out.push(`[도화살] ${C.SHINSAL_TEXT['도화살']}`);
  if ((topic === 'work' || topic === 'people') && f.shinsal.indexOf('천을귀인') > -1 && C.SHINSAL_TEXT['천을귀인']) out.push(`[천을귀인] ${C.SHINSAL_TEXT['천을귀인']}`);
  if ((topic === 'work' || topic === 'etc') && f.shinsal.indexOf('역마살') > -1 && C.SHINSAL_TEXT['역마살']) out.push(`[역마살] ${C.SHINSAL_TEXT['역마살']}`);
  return out.join('\n');
}

/* ---------- 4) 출력 검증 ---------- */
const NUM_BAN = /로또|복권|당첨\s*번호|번호\s*(?:를|을)?\s*추천|행운의?\s*(?:숫자|번호)|토토|도박|코인\s*종목|매수\s*타이밍/;
const NUM_SEQ = /\d{1,2}\s*[,，·、]\s*\d{1,2}\s*[,，·、]\s*\d{1,2}/;
const STEMS = '갑을병정무기경신임계';
function validate(text, f) {
  const C = core(), MS = C.MS, EL = MS.EL_K;
  const bad = [];
  if (!text || text.length < 40) bad.push('답이 너무 짧아요');
  if (NUM_BAN.test(text) || NUM_SEQ.test(text)) bad.push('숫자 추천·복권·도박·투자 종목 이야기는 하지 않아요');
  if (/[#*`>|]/.test(text)) bad.push('마크다운 기호(#, *, `, >, |)를 쓰지 않아요');
  if (f) {
    /* 일간을 다른 글자로 말함: "계수 일간", "갑목 일간", "일간인 을목" */
    const myStem = MS.STEM_K[f.dStem];
    const re1 = new RegExp('([' + STEMS + '])(?:목|화|토|금|수)\\s*(?:\\([^)]*\\))?\\s*일간', 'g');
    const re2 = new RegExp('일간(?:인|은|이)?\\s*([' + STEMS + '])(?:목|화|토|금|수)', 'g');
    [re1, re2].forEach(re => { let m; while ((m = re.exec(text))) if (m[1] !== myStem) bad.push(`일간은 ${f.ilgan}인데 ${m[1]}로 말했어요`); });
    /* 오행 개수와 모순: "목 기운이 없/부족" 인데 3개 이상, "화 기운이 많/강" 인데 0개 */
    const elRe = /(목|화|토|금|수)(?:\s*\([木火土金水]\))?\s*기운[이가은는도]?\s*(?:이\s*)?(전혀\s*없|없|부족|약|많|강|넘치|가득|풍부)/g;
    let m;
    while ((m = elRe.exec(text))) {
      const i = EL.indexOf(m[1]), n = f.cnt[i];
      if (/없|부족|약/.test(m[2]) && n >= 3) bad.push(`${m[1]} 기운은 ${n}개로 많은데 부족하다고 했어요`);
      if (/많|강|넘치|가득|풍부/.test(m[2]) && n === 0) bad.push(`${m[1]} 기운은 원국에 없는데 많다고 했어요`);
    }
    /* 신강/신약 반대로 말함 */
    const strong = /신강/.test(f.strength), weak = /신약/.test(f.strength);
    if (strong && /신약/.test(text)) bad.push(`일간의 힘은 ${f.strength}인데 신약이라고 했어요`);
    if (weak && /신강/.test(text)) bad.push(`일간의 힘은 ${f.strength}인데 신강이라고 했어요`);
    /* 용신을 다른 오행으로 말함 */
    const yRe = /용신(?:은|이|인)?\s*(목|화|토|금|수)/g;
    while ((m = yRe.exec(text))) if (EL.indexOf(m[1]) !== f.yong) bad.push(`용신은 ${EL[f.yong]}인데 ${m[1]}라고 했어요`);
    if (f.unknownTime && /시주/.test(text)) bad.push('태어난 시간을 몰라 시주가 없어요');
  }
  return Array.from(new Set(bad));
}

function tidy(text) {
  return String(text || '')
    .replace(/\r/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/[*#`]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---------- 모델 호출 ---------- */
let client = null;
function anthropic() {
  if (!client) { const Anthropic = require('@anthropic-ai/sdk'); client = new Anthropic({ timeout: 25e3, maxRetries: 1 }); }
  return client;
}
/* system 은 고정 문자열이라 캐시 대상(cache_control), 사람마다 다른 내용은 messages 에 둔다 */
async function ask(system, messages, maxTokens) {
  const msg = await anthropic().messages.create({
    model: MODEL,
    max_tokens: maxTokens || 1500,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    output_config: { effort: 'low' },
    messages
  });
  if (msg.stop_reason === 'refusal') return { refused: true, text: '' };
  return { refused: false, text: msg.content.filter(b => b.type === 'text').map(b => b.text).join('').trim() };
}

/* 생성 → 검증 → (걸리면) 한 번 고쳐 쓰기 → 그래도 걸리면 null */
async function generateChecked(system, userContent, f, maxTokens) {
  const first = await ask(system, [{ role: 'user', content: userContent }], maxTokens);
  if (first.refused) return { refused: true };
  let text = tidy(first.text), bad = validate(text, f);
  if (!bad.length) return { text, retried: false };
  const second = await ask(system, [
    { role: 'user', content: userContent },
    { role: 'assistant', content: first.text },
    { role: 'user', content: `방금 답에서 고칠 점이 있어요.\n- ${bad.join('\n- ')}\n[사주 원국] 값과 맞게, 같은 형식으로 답을 처음부터 다시 써 주세요.` }
  ], maxTokens);
  if (second.refused) return { refused: true };
  text = tidy(second.text); bad = validate(text, f);
  if (!bad.length) return { text, retried: true };
  console.error('ai validate failed', bad.join(' / '));
  return null;
}

function ready() { return !!process.env.ANTHROPIC_API_KEY; }

module.exports = { MODEL, TJ_YEAR, readBirth, facts, factsText, RULES, knowledge, validate, tidy, ask, generateChecked, ready };
