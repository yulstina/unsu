/* POST /api/coins  { kind, n, why, key, item }
   - 적립(kind ∈ EARN): 서버가 정한 양만, 하루 한도 안에서. 광고 보상(ad)은 AD_COIN_ON 일 때만
   - 사용(kind = 'spend', item = '상품:대상'): 서버 가격표(PRICES)로 차감 (무료 엽전부터).
     item 이 구매 기록 키가 된다 → 같은 상품을 두 번 보내도 한 번만 차감되고 원장에 무엇을 샀는지 남는다.
     브라우저가 보낸 n 이 서버 가격과 다르면(옛 화면·조작) 차감하지 않고 'price' 로 돌려보낸다
   key 는 같은 적립이 두 번 전송돼도 한 번만 반영되도록 브라우저가 만든 값 */
const S = require('./_lib/srv');
const { EARN, PRICES, AD_COIN_ON, PASS_DREAM_MAX, SPEND_MAX } = require('./_lib/shop');
const { passUntil } = require('./_lib/pass');
const ITEM_RE = /^([a-z]+):?([^\s]{0,100})$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST' || !S.sameOrigin(req)) return S.send(res, 405, { ok: false });
  const uid = S.sessionUid(req); if (!uid) return S.send(res, 401, { ok: false, err: 'login' });
  const b = await S.body(req);
  const kind = String(b.kind || ''), why = String(b.why || '').slice(0, 60) || null;
  const key = b.key ? String(b.key).slice(0, 80) : null;
  let args, ikey = key ? kind + ':' + key : null;
  if (kind === 'spend'){
    const m = ITEM_RE.exec(String(b.item || ''));
    const price = m && PRICES[m[1]];
    if (!price || price > SPEND_MAX) return S.send(res, 400, { ok: false, err: 'item' });
    if (b.n !== undefined && Math.round(Number(b.n)) !== -price) return S.send(res, 409, { ok: false, err: 'price', price });
    args = { p_delta: -price, p_daily_max: null };
    ikey = 'spend:' + m[0];
    /* 우니 패스 기간: 엽전 대신 0닢으로 기록만 남긴다(구매 기록·중복 방지는 그대로). 꿈 번호는 하루 한도, 넘으면 엽전으로 */
    try {
      if (await passUntil(uid) > Date.now()){
        const dream = m[1] === 'dream';
        const r = await S.rpc('coin_apply', { p_user: uid, p_delta: 0, p_kind: dream ? 'pass_dream' : 'pass_use', p_why: why, p_key: ikey, p_day: S.kstDay(), p_daily_max: dream ? PASS_DREAM_MAX : null, p_paid: 0 });
        if (r.ok) return S.send(res, 200, Object.assign(r, { pass: true }));
        if (r.err !== 'limit') return S.send(res, 409, r);
      }
    } catch (e) { console.error('coins pass', e.message); }
  } else if (kind === 'ad' && !AD_COIN_ON){
    return S.send(res, 403, { ok: false, err: 'ad_off' });
  } else if (EARN[kind]){
    args = { p_delta: EARN[kind].n, p_daily_max: EARN[kind].max };
  } else return S.send(res, 400, { ok: false, err: 'kind' });
  try {
    const r = await S.rpc('coin_apply', Object.assign({ p_user: uid, p_kind: kind, p_why: why, p_key: ikey, p_day: S.kstDay(), p_paid: 0 }, args));
    return S.send(res, r.ok ? 200 : 409, r);
  } catch (e) { console.error('coins', e.message); return S.send(res, 500, { ok: false, err: 'server' }); }
};
