/* 토스페이먼츠 엽전 충전 (결제창 · API 개별 연동 키)
   POST /api/pay?a=order    { pack }  → 서버가 금액을 정해 주문을 만든다(브라우저가 보낸 금액은 믿지 않는다)
   GET  /pay/success        토스 결제창 successUrl (vercel.json rewrite → /api/pay?a=confirm). 금액 대조 → 승인 API → 엽전 적립 → /?pay=ok
   실패·취소는 failUrl(/?pay=fail)로 바로 돌아온다. */
const crypto = require('crypto');
const S = require('./_lib/srv');
const { PACKS } = require('./_lib/shop');

module.exports = async (req, res) => {
  const a = (req.query && req.query.a) || '';
  try {
    if (a === 'order') return await order(req, res);
    if (a === 'confirm') return await confirm(req, res);
    return S.send(res, 404, { ok: false });
  } catch (e) {
    console.error('pay', a, e.message);
    if (a === 'confirm') return S.redirect(res, '/?pay=fail&code=SERVER');
    return S.send(res, 500, { ok: false, err: 'server' });
  }
};

async function order(req, res){
  if (req.method !== 'POST' || !S.sameOrigin(req)) return S.send(res, 405, { ok: false });
  if (!S.CONF.toss) return S.send(res, 503, { ok: false, err: 'off' });
  const uid = S.sessionUid(req); if (!uid) return S.send(res, 401, { ok: false, err: 'login' });
  const b = await S.body(req);
  const P = PACKS[b.pack]; if (!P) return S.send(res, 400, { ok: false, err: 'pack' });
  const id = 'wj' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
  await S.db('orders', { method: 'POST', prefer: 'return=minimal', body: { order_id: id, user_id: uid, pack: b.pack, coins: P.n, bonus: P.b, amount: P.p } });
  return S.send(res, 200, { ok: true, orderId: id, amount: P.p, orderName: '우니조아 엽전 ' + (P.n + P.b).toLocaleString('ko-KR') + '닢', customerKey: 'wj_' + S.sha(uid).slice(0, 32) });
}

async function confirm(req, res){
  const q = req.query || {};
  const paymentKey = String(q.paymentKey || ''), orderId = String(q.orderId || ''), amount = Number(q.amount);
  if (!paymentKey || !/^wj[a-z0-9]+$/.test(orderId)) return S.redirect(res, '/?pay=fail&code=BAD_REQUEST');
  const o = await S.one('orders?order_id=eq.' + orderId + '&select=order_id,user_id,coins,bonus,amount,status');
  if (!o) return S.redirect(res, '/?pay=fail&code=NO_ORDER');
  const done = () => S.redirect(res, '/?pay=ok&n=' + (o.coins + o.bonus));
  if (o.status === 'paid') return done();                                   /* 새로고침 등으로 두 번 온 경우 */
  if (o.status !== 'ready') return S.redirect(res, '/?pay=fail&code=ORDER_' + o.status.toUpperCase());
  if (amount !== o.amount) return S.redirect(res, '/?pay=fail&code=AMOUNT_MISMATCH');   /* 금액 위·변조 차단 */

  const r = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64'), 'Content-Type': 'application/json', 'Idempotency-Key': orderId },
    body: JSON.stringify({ paymentKey, orderId, amount })
  });
  const p = await r.json().catch(() => ({}));
  if (!r.ok || p.status !== 'DONE'){
    console.error('toss confirm', r.status, p.code);
    const again = await S.one('orders?order_id=eq.' + orderId + '&select=status');   /* 동시에 들어온 다른 요청이 이미 처리했을 수 있다 */
    if (again && again.status === 'paid') return done();
    await S.db('orders?order_id=eq.' + orderId + '&status=eq.ready', { method: 'PATCH', prefer: 'return=minimal', body: { status: 'failed', raw: { code: p.code, message: p.message } } });
    return S.redirect(res, '/?pay=fail&code=' + encodeURIComponent(p.code || 'CONFIRM'));
  }
  await S.db('orders?order_id=eq.' + orderId, { method: 'PATCH', prefer: 'return=minimal', body: {
    status: 'paid', payment_key: paymentKey, method: p.method || null, receipt_url: (p.receipt && p.receipt.url) || null,
    approved_at: p.approvedAt || new Date().toISOString(), raw: { mId: p.mId, method: p.method, totalAmount: p.totalAmount, card: p.card ? { company: p.card.issuerCode, type: p.card.cardType } : null }
  } });
  if (o.user_id) await S.rpc('coin_apply', { p_user: o.user_id, p_delta: o.coins + o.bonus, p_kind: 'charge', p_why: '엽전 충전 ' + (o.coins + o.bonus).toLocaleString('ko-KR') + '닢', p_key: 'charge:' + orderId, p_day: S.kstDay(), p_daily_max: null, p_paid: o.coins });
  return done();
}
