/* 원화 결제 — 포트원 V2(PORTONE_*) 또는 토스페이먼츠(TOSS_*) 결제창. 포트원 키가 있으면 포트원을 쓴다.
   POST /api/pay?a=order    { item } 콘텐츠 하나 단건 결제(2026-11-21~ 기본) · { pack } 우니 패스(엽전 패키지는 COIN_SALE=1 일 때만)
                            → 서버가 금액을 정해 주문을 만든다(브라우저가 보낸 금액은 믿지 않는다)
   단건 결제가 끝나면 원장에 'spend:<item>' 키로 0닢 기록을 남긴다 → 화면이 같은 item 으로 /api/coins spend 를 부르면
   이미 산 것으로(dup) 바로 열린다. 엽전 차감 경로와 구매 기록 키가 같아서 두 번 결제·차감되지 않는다.
   GET /pay/success?...&json=1  PC 포트원처럼 페이지 이동 없이 결과만 받을 때 → { ok, item }
   GET  /pay/success        결제창 복귀 주소(포트원: paymentId, 토스: paymentKey·orderId) (vercel.json rewrite → /api/pay?a=confirm). 금액 대조 → 승인 API → 엽전 적립 → /?pay=ok
   실패·취소는 failUrl(/?pay=fail)로 바로 돌아온다. */
const crypto = require('crypto');
const S = require('./_lib/srv');
const { PACKS, PASSES, WON, WON_NAMES, WON_SALE, PASS_SALE, COIN_SALE } = require('./_lib/shop');
const ITEM_RE = /^([a-z]+):?([^\s]{0,100})$/;   /* api/coins.js 와 같은 규칙 */
const itemOf = pack => (/^buy:/.test(pack || '') ? pack.slice(4) : null);
/* 결제 완료 후 돌아갈 곳. 단건은 json=1 이면 JSON, 아니면 /?pay=ok&buy=1 (무엇을 샀는지는 화면이 sessionStorage 에 들고 있다) */
function doneUrl(o){
  if (itemOf(o.pack)) return '/?pay=ok&buy=1';
  return PASSES[o.pack] ? '/?pay=ok&pass=' + o.pack : '/?pay=ok&n=' + (o.coins + o.bonus);
}
function finish(req, res, url){
  if (req.query && req.query.json === '1'){
    const ok = /pay=ok/.test(url), m = /code=([^&]*)/.exec(url);
    return S.send(res, ok ? 200 : 409, { ok, code: m ? decodeURIComponent(m[1]) : null });
  }
  return S.redirect(res, url);
}

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
  if (!S.CONF.pay) return S.send(res, 503, { ok: false, err: 'off' });   /* 화면의 '준비 중'과 같은 스위치 */
  const uid = S.sessionUid(req); if (!uid) return S.send(res, 401, { ok: false, err: 'login' });
  const b = await S.body(req);
  const id = 'wj' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
  const cust = 'wj_' + S.sha(uid).slice(0, 32);
  if (b.item){   /* 콘텐츠 하나 단건 결제 */
    const m = ITEM_RE.exec(String(b.item)), won = m && WON_SALE.includes(m[1]) && WON[m[1]];
    if (!won) return S.send(res, 400, { ok: false, err: 'item' });
    const bought = await S.one('coin_ledger?user_id=eq.' + uid + '&ikey=eq.' + encodeURIComponent('spend:' + m[0]) + '&select=id');
    if (bought) return S.send(res, 409, { ok: false, err: 'owned' });   /* 이미 연 콘텐츠 — 다시 결제하지 않게 */
    await S.db('orders', { method: 'POST', prefer: 'return=minimal', body: { order_id: id, user_id: uid, pack: 'buy:' + m[0], coins: 0, bonus: 0, amount: won } });
    return S.send(res, 200, { ok: true, provider: S.CONF.provider, orderId: id, amount: won, orderName: '우니조아 ' + WON_NAMES[m[1]], customerKey: cust });
  }
  const P = COIN_SALE ? PACKS[b.pack] : null, Q = PASS_SALE ? PASSES[b.pack] : null;
  if (!P && !Q) return S.send(res, 400, { ok: false, err: 'pack' });
  await S.db('orders', { method: 'POST', prefer: 'return=minimal', body: P
    ? { order_id: id, user_id: uid, pack: b.pack, coins: P.n, bonus: P.b, amount: P.p }
    : { order_id: id, user_id: uid, pack: b.pack, coins: 0, bonus: 0, amount: Q.p } });
  const name = P ? '우니조아 엽전 ' + (P.n + P.b).toLocaleString('ko-KR') + '닢' : '우니조아 ' + Q.name;
  return S.send(res, 200, { ok: true, provider: S.CONF.provider, orderId: id, amount: P ? P.p : Q.p, orderName: name, customerKey: cust });
}

async function confirm(req, res){
  const q = req.query || {};
  if (q.paymentId) return confirmPortone(req, res, q);
  const paymentKey = String(q.paymentKey || ''), orderId = String(q.orderId || ''), amount = Number(q.amount);
  if (!paymentKey || !/^wj[a-z0-9]+$/.test(orderId)) return finish(req, res, '/?pay=fail&code=BAD_REQUEST');
  const o = await S.one('orders?order_id=eq.' + orderId + '&select=order_id,user_id,pack,coins,bonus,amount,status');
  if (!o) return finish(req, res, '/?pay=fail&code=NO_ORDER');
  const done = () => finish(req, res, doneUrl(o));
  if (o.status === 'paid') return done();                                   /* 새로고침 등으로 두 번 온 경우 */
  if (o.status !== 'ready') return finish(req, res, '/?pay=fail&code=ORDER_' + o.status.toUpperCase());
  if (amount !== o.amount) return finish(req, res, '/?pay=fail&code=AMOUNT_MISMATCH');   /* 금액 위·변조 차단 */

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
    return finish(req, res, '/?pay=fail&code=' + encodeURIComponent(p.code || 'CONFIRM'));
  }
  await settle(o, { status: 'paid', payment_key: paymentKey, method: p.method || null, receipt_url: (p.receipt && p.receipt.url) || null,
    approved_at: p.approvedAt || new Date().toISOString(), raw: { mId: p.mId, method: p.method, totalAmount: p.totalAmount, card: p.card ? { company: p.card.issuerCode, type: p.card.cardType } : null } });
  return done();
}

/* 주문을 paid 로 바꾸고 엽전·패스를 지급한다 (엽전 원장은 키로 멱등) */
async function settle(o, patch){
  const orderId = o.order_id, pass = PASSES[o.pack], item = itemOf(o.pack);
  await S.db('orders?order_id=eq.' + orderId, { method: 'PATCH', prefer: 'return=minimal', body: patch });
  if (o.user_id && item){   /* 단건: 엽전 0닢 + 구매 기록 키(spend:item). 화면이 같은 item 으로 열면 dup → 차감 없이 열림 */
    const k = item.split(':')[0];
    await S.rpc('coin_apply', { p_user: o.user_id, p_delta: 0, p_kind: 'buy', p_why: (WON_NAMES[k] || '콘텐츠') + ' ' + o.amount.toLocaleString('ko-KR') + '원 결제', p_key: 'spend:' + item, p_day: S.kstDay(), p_daily_max: null, p_paid: 0 });
  }
  else if (o.user_id && pass) await S.rpc('coin_apply', { p_user: o.user_id, p_delta: 0, p_kind: 'pass', p_why: pass.name + ' 시작', p_key: 'pass:' + orderId, p_day: S.kstDay(), p_daily_max: null, p_paid: 0 });
  else if (o.user_id) await S.rpc('coin_apply', { p_user: o.user_id, p_delta: o.coins + o.bonus, p_kind: 'charge', p_why: '엽전 충전 ' + (o.coins + o.bonus).toLocaleString('ko-KR') + '닢', p_key: 'charge:' + orderId, p_day: S.kstDay(), p_daily_max: null, p_paid: o.coins });
}

/* 포트원 V2: 복귀 주소의 paymentId 로 서버에서 결제 건을 직접 조회해 금액·상태를 대조한다 (브라우저가 준 값은 믿지 않는다) */
async function confirmPortone(req, res, q){
  const orderId = String(q.paymentId || '');
  if (!/^wj[a-z0-9]+$/.test(orderId)) return finish(req, res, '/?pay=fail&code=BAD_REQUEST');
  if (q.code) return finish(req, res, '/?pay=fail&code=' + encodeURIComponent(String(q.code).slice(0, 40)));   /* 사용자가 취소했거나 결제 실패 */
  const o = await S.one('orders?order_id=eq.' + orderId + '&select=order_id,user_id,pack,coins,bonus,amount,status');
  if (!o) return finish(req, res, '/?pay=fail&code=NO_ORDER');
  const done = () => finish(req, res, doneUrl(o));
  if (o.status === 'paid') return done();
  if (o.status !== 'ready') return finish(req, res, '/?pay=fail&code=ORDER_' + o.status.toUpperCase());

  const r = await fetch('https://api.portone.io/payments/' + encodeURIComponent(orderId), { headers: { Authorization: 'PortOne ' + process.env.PORTONE_API_SECRET } });
  const p = await r.json().catch(() => ({}));
  if (!r.ok || p.status !== 'PAID'){
    console.error('portone lookup', r.status, p.type, p.status);
    const again = await S.one('orders?order_id=eq.' + orderId + '&select=status');
    if (again && again.status === 'paid') return done();
    if (r.ok && (p.status === 'FAILED' || p.status === 'CANCELLED')) await S.db('orders?order_id=eq.' + orderId + '&status=eq.ready', { method: 'PATCH', prefer: 'return=minimal', body: { status: 'failed', raw: { status: p.status } } });
    return finish(req, res, '/?pay=fail&code=' + encodeURIComponent(p.status || p.type || 'CONFIRM'));
  }
  if (!p.amount || p.amount.total !== o.amount || p.currency !== 'KRW'){   /* 금액 위·변조 → 자동 취소 */
    console.error('portone amount mismatch', orderId);
    await fetch('https://api.portone.io/payments/' + encodeURIComponent(orderId) + '/cancel', { method: 'POST', headers: { Authorization: 'PortOne ' + process.env.PORTONE_API_SECRET, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'amount mismatch' }) }).catch(() => {});
    await S.db('orders?order_id=eq.' + orderId + '&status=eq.ready', { method: 'PATCH', prefer: 'return=minimal', body: { status: 'failed', raw: { code: 'AMOUNT_MISMATCH' } } });
    return finish(req, res, '/?pay=fail&code=AMOUNT_MISMATCH');
  }
  await settle(o, { status: 'paid', payment_key: p.transactionId || orderId, method: (p.method && p.method.type) || null, receipt_url: p.receiptUrl || null,
    approved_at: p.paidAt || new Date().toISOString(), raw: { provider: 'portone', method: p.method && p.method.type, total: p.amount.total } });
  return done();
}
