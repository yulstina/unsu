/**
 * GET /api/lotto — 최근 로또 6/45 당첨 결과
 * 동행복권 결과 페이지가 쓰는 내부 JSON을 서버에서 대신 받아(브라우저 CORS 회피) 정리해서 돌려준다.
 * 1순위: /lt645/selectPstLt645InfoNew.do (2026 리뉴얼 이후)  2순위: 구 common.do?method=getLottoNumber
 * CDN 캐시 30분 + stale-while-revalidate 1일 → 동행복권 호출은 최대 30분에 한 번.
 */
const BASE = 'https://www.dhlottery.co.kr';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  'Accept': 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': BASE + '/lt645/result'
};
const FIRST_DRAW = Date.UTC(2002, 11, 7, 11, 45); // 2002-12-07 20:45 KST 1회차 (UTC)
const WEEK = 7 * 864e5;

function expectedRound(now = Date.now()) { return Math.floor((now - FIRST_DRAW) / WEEK) + 1; }
function ymd(s) { s = String(s || '').replace(/\D/g, ''); return s.length >= 8 ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : null; }
function valid(d) {
  return d && d.no > 0 && Array.isArray(d.nums) && d.nums.length === 6 && new Set(d.nums).size === 6 &&
    d.nums.every(n => Number.isInteger(n) && n >= 1 && n <= 45) && d.bonus >= 1 && d.bonus <= 45 && !d.nums.includes(d.bonus) && !!d.date;
}

async function getJSON(url) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(url, { headers: HEADERS, signal: ctl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const text = await r.text();
    return JSON.parse(text); // 점검 페이지(HTML)가 오면 여기서 실패
  } finally { clearTimeout(t); }
}

async function fromNew(round) {
  const j = await getJSON(`${BASE}/lt645/selectPstLt645InfoNew.do?srchDir=center&srchLtEpsd=${round}`);
  const list = (j && j.data && j.data.list) || [];
  const it = list.filter(x => +x.ltEpsd <= round).sort((a, b) => b.ltEpsd - a.ltEpsd)[0];
  if (!it) return null;
  return {
    no: +it.ltEpsd, date: ymd(it.ltRflYmd),
    nums: [it.tm1WnNo, it.tm2WnNo, it.tm3WnNo, it.tm4WnNo, it.tm5WnNo, it.tm6WnNo].map(Number).sort((a, b) => a - b),
    bonus: +it.bnsWnNo,
    first: { count: +it.rnk1WnNope || 0, prize: +it.rnk1WnAmt || 0 },
    second: it.rnk2WnAmt != null ? { count: +it.rnk2WnNope || 0, prize: +it.rnk2WnAmt || 0 } : null,
    sell: +it.rlvtEpsdSumNtslAmt || null
  };
}

async function fromOld(round) {
  const j = await getJSON(`${BASE}/common.do?method=getLottoNumber&drwNo=${round}`);
  if (!j || j.returnValue !== 'success') return null;
  return {
    no: +j.drwNo, date: j.drwNoDate,
    nums: [j.drwtNo1, j.drwtNo2, j.drwtNo3, j.drwtNo4, j.drwtNo5, j.drwtNo6].map(Number).sort((a, b) => a - b),
    bonus: +j.bnusNo,
    first: { count: +j.firstPrzwnerCo || 0, prize: +j.firstWinamnt || 0 },
    second: null, sell: +j.totSellamnt || null
  };
}

module.exports = async (req, res) => {
  const want = expectedRound();
  const errors = [];
  // 토요일 추첨 직후엔 아직 집계 전일 수 있어 직전 회차까지 시도
  for (const round of [want, want - 1]) {
    for (const src of [fromNew, fromOld]) {
      try {
        const d = await src(round);
        if (valid(d)) {
          res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.status(200).json({ ...d, source: src === fromNew ? 'dhlottery' : 'dhlottery-legacy', fetchedAt: new Date().toISOString() });
        }
        errors.push(`${src.name}(${round}): invalid`);
      } catch (e) { errors.push(`${src.name}(${round}): ${e.message}`); }
    }
  }
  res.setHeader('Cache-Control', 'public, s-maxage=300');
  res.status(502).json({ error: 'upstream_unavailable', expected: want, detail: errors });
};
module.exports.expectedRound = expectedRound;
