/* POST /api/coins  { kind, n, why, key }
   - 적립(kind ∈ EARN): 서버가 정한 양만, 하루 한도 안에서
   - 사용(kind = 'spend', n < 0): 잔액이 있으면 차감 (무료 엽전부터)
   key 는 같은 동작이 두 번 전송돼도 한 번만 반영되도록 브라우저가 만든 값 */
const S = require('./_lib/srv');
const { EARN, SPEND_MAX } = require('./_lib/shop');

module.exports = async (req, res) => {
  if (req.method !== 'POST' || !S.sameOrigin(req)) return S.send(res, 405, { ok: false });
  const uid = S.sessionUid(req); if (!uid) return S.send(res, 401, { ok: false, err: 'login' });
  const b = await S.body(req);
  const kind = String(b.kind || ''), why = String(b.why || '').slice(0, 60) || null;
  const key = b.key ? String(b.key).slice(0, 80) : null;
  let args;
  if (kind === 'spend'){
    const n = Math.round(Number(b.n));
    if (!(n < 0 && -n <= SPEND_MAX)) return S.send(res, 400, { ok: false, err: 'amount' });
    args = { p_delta: n, p_daily_max: null };
  } else if (EARN[kind]){
    args = { p_delta: EARN[kind].n, p_daily_max: EARN[kind].max };
  } else return S.send(res, 400, { ok: false, err: 'kind' });
  try {
    const r = await S.rpc('coin_apply', Object.assign({ p_user: uid, p_kind: kind, p_why: why, p_key: key ? kind + ':' + key : null, p_day: S.kstDay(), p_paid: 0 }, args));
    return S.send(res, r.ok ? 200 : 409, r);
  } catch (e) { console.error('coins', e.message); return S.send(res, 500, { ok: false, err: 'server' }); }
};
