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
const { PKGS, PKG_SALE, PACKS, PASSES, WON, WON_NAMES, WON_SALE, PASS_SALE, COIN_SALE, COUPON, couponOn, couponPrice } = require('./_lib/shop');
const ITEM_RE = /^([a-z]+):?([^\s]{0,100})$/;   /* api/coins.js 와 같은 규칙 */
const itemOf = pack => (/^buy:/.test(pack || '') ? pack.slice(4) : null);
const pkgOf = pack => (/^pkg:/.test(pack || '') && PKGS[pack.slice(4)]) || null;   /* 묶음 패키지 주문 */
/* 결제 완료 후 돌아갈 곳. 단건은 json=1 이면 JSON, 아니면 /?pay=ok&buy=1 (무엇을 샀는지는 화면이 sessionStorage 에 들고 있다) */
function doneUrl(o){
  if (itemOf(o.pack) || pkgOf(o.pack)) return '/?pay=ok&buy=1';
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
    if (a === 'webhook') return await webhook(req, res);
    return S.send(res, 404, { ok: false });
  } catch (e) {
    console.error('pay', a, e.message);
    if (a === 'confirm') return S.redirect(res, '/?pay=fail&code=SERVER');
    if (a === 'webhook') return S.send(res, 200, { ok: false });   /* 토스는 200 이 아니면 재전송한다. 처리 실패는 로그로 남기고 다음 이벤트·수동 확인으로 */
    return S.send(res, 500, { ok: false, err: 'server' });
  }
};

/* 토스 웹훅(PAYMENT_STATUS_CHANGED 등): 본문은 믿지 않고 paymentKey 로 토스에서 결제를 다시 조회해,
   상점관리자·카드사에서 취소된 건만 주문을 refunded 로 맞춘다. 지급 취소(엽전 회수)는 하지 않고 기록만 한다. */
async function webhook(req, res){
  if (req.method !== 'POST' || !process.env.TOSS_SECRET_KEY) return S.send(res, 200, { ok: true });
  const b = await S.body(req);
  const d = (b && b.data) || {};
  const paymentKey = String(d.paymentKey || '');
  if (!paymentKey || !/^[A-Za-z0-9_\-]{10,200}$/.test(paymentKey)) return S.send(res, 200, { ok: true });
  const r = await fetch('https://api.tosspayments.com/v1/payments/' + encodeURIComponent(paymentKey), { headers: { Authorization: 'Basic ' + Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64') } });
  const p = await r.json().catch(() => ({}));
  if (!r.ok || !/^wj[a-z0-9]+$/.test(String(p.orderId || ''))) return S.send(res, 200, { ok: true });
  if (p.status === 'CANCELED' || p.status === 'PARTIAL_CANCELED'){
    const full = p.status === 'CANCELED';
    const left = Number(p.balanceAmount);
    const refunded = Number(p.totalAmount) - (isFinite(left) ? left : 0);
    const last = (p.cancels && p.cancels.length && p.cancels[p.cancels.length - 1]) || {};
    await S.db('orders?order_id=eq.' + p.orderId + '&payment_key=eq.' + encodeURIComponent(paymentKey) + '&status=eq.paid', { method: 'PATCH', prefer: 'return=minimal',
      body: { status: full ? 'refunded' : 'paid', refunded_at: last.canceledAt || new Date().toISOString(), refund_amount: refunded } });
  }
  return S.send(res, 200, { ok: true });
}

async function order(req, res){
  if (req.method !== 'POST' || !S.sameOrigin(req)) return S.send(res, 405, { ok: false });
  if (!S.CONF.pay) return S.send(res, 503, { ok: false, err: 'off' });   /* 화면의 '준비 중'과 같은 스위치 */
  const uid = S.sessionUid(req); if (!uid) return S.send(res, 401, { ok: false, err: 'login' });
  const b = await S.body(req);
  const id = 'wj' + Date.now().toString(36) + crypto.randomBytes(6).toString('hex');
  const cust = 'wj_' + S.sha(uid).slice(0, 32);
  if (b.item){   /* 콘텐츠 하나 단건 결제 */
    const m = ITEM_RE.exec(String(b.item)), base = m && WON_SALE.includes(m[1]) && WON[m[1]];
    if (!base) return S.send(res, 400, { ok: false, err: 'item' });
    const bought = await S.one('coin_ledger?user_id=eq.' + uid + '&ikey=eq.' + encodeURIComponent('spend:' + m[0]) + '&select=id');
    if (bought) return S.send(res, 409, { ok: false, err: 'owned' });   /* 이미 연 콘텐츠 — 다시 결제하지 않게 */
    /* 출시 기념 첫 결제 할인: 결제 완료(paid·refunded 포함) 이력이 없는 계정만 */
    const coupon = couponOn() && !(await S.one('orders?user_id=eq.' + uid + '&status=in.(paid,refunded,canceled)&select=order_id&limit=1'));
    const won = coupon ? couponPrice(base) : base;
    await S.db('orders', { method: 'POST', prefer: 'return=minimal', body: { order_id: id, user_id: uid, pack: 'buy:' + m[0], coins: 0, bonus: 0, amount: won, raw: coupon ? { coupon: 'launch50', base } : null } });
    return S.send(res, 200, { ok: true, provider: S.CONF.provider, orderId: id, amount: won, base, coupon: coupon ? COUPON.name : null, orderName: '우니조아 ' + WON_NAMES[m[1]], customerKey: cust });
  }
  if (b.pkg){   /* 묶음 패키지: 들어 있는 풀이를 한 번에 결제 */
    const K = PKG_SALE && Object.prototype.hasOwnProperty.call(PKGS, b.pkg) ? PKGS[b.pkg] : null;
    if (!K) return S.send(res, 400, { ok: false, err: 'pkg' });
    const keys = K.items.map(k => 'spend:' + k);
    const had = await S.db('coin_ledger?user_id=eq.' + uid + '&ikey=in.(' + keys.map(encodeURIComponent).join(',') + ')&select=ikey');
    if (Array.isArray(had) && had.length >= keys.length) return S.send(res, 409, { ok: false, err: 'owned' });   /* 이미 전부 열었다 */
    const coupon = couponOn() && !(await S.one('orders?user_id=eq.' + uid + '&status=in.(paid,refunded,canceled)&select=order_id&limit=1'));
    const won = coupon ? couponPrice(K.p) : K.p;
    await S.db('orders', { method: 'POST', prefer: 'return=minimal', body: { order_id: id, user_id: uid, pack: 'pkg:' + b.pkg, coins: 0, bonus: 0, amount: won, raw: coupon ? { coupon: 'launch50', base: K.p } : null } });
    return S.send(res, 200, { ok: true, provider: S.CONF.provider, orderId: id, amount: won, base: K.p, coupon: coupon ? COUPON.name : null, orderName: '우니조아 ' + K.name, customerKey: cust });
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
  const orderId = o.order_id, pass = PASSES[o.pack], item = itemOf(o.pack), pkg = pkgOf(o.pack);
  /* ready → paid 를 한 번만: 같은 주문의 복귀 요청이 동시에 두 번 와도 지급·중복 취소 판단은 먼저 바꾼 쪽만 한다 */
  const upd = await S.db('orders?order_id=eq.' + orderId + '&status=eq.ready', { method: 'PATCH', body: patch });
  if (Array.isArray(upd) && !upd.length) return;
  if (o.user_id && pkg){   /* 패키지: 들어 있는 풀이마다 구매 기록 키. 이미 연 것은 원장이 dup 으로 건너뛴다 */
    let fresh = 0;
    for (const k of pkg.items){ const r = await S.rpc('coin_apply', { p_user: o.user_id, p_delta: 0, p_kind: 'buy', p_why: pkg.name + ' · ' + (WON_NAMES[k] || '콘텐츠'), p_key: 'spend:' + k, p_day: S.kstDay(), p_daily_max: null, p_paid: 0 }); if (r && r.ok && !r.dup) fresh++; }
    if (!fresh) await cancelDup(o, patch);   /* 들어 있는 풀이를 이미 전부 가진 채 결제됨(창 두 개로 동시 결제 등) → 자동 취소 */
  }
  else if (o.user_id && item){   /* 단건: 엽전 0닢 + 구매 기록 키(spend:item). 화면이 같은 item 으로 열면 dup → 차감 없이 열림 */
    const k = item.split(':')[0];
    const r = await S.rpc('coin_apply', { p_user: o.user_id, p_delta: 0, p_kind: 'buy', p_why: (WON_NAMES[k] || '콘텐츠') + ' ' + o.amount.toLocaleString('ko-KR') + '원 결제', p_key: 'spend:' + item, p_day: S.kstDay(), p_daily_max: null, p_paid: 0 });
    if (r && r.ok && r.dup) await cancelDup(o, patch);   /* 이미 연 콘텐츠를 또 결제함(중복 결제) → 자동 취소 */
  }
  else if (o.user_id && pass) await S.rpc('coin_apply', { p_user: o.user_id, p_delta: 0, p_kind: 'pass', p_why: pass.name + ' 시작', p_key: 'pass:' + orderId, p_day: S.kstDay(), p_daily_max: null, p_paid: 0 });
  else if (o.user_id) await S.rpc('coin_apply', { p_user: o.user_id, p_delta: o.coins + o.bonus, p_kind: 'charge', p_why: '엽전 충전 ' + (o.coins + o.bonus).toLocaleString('ko-KR') + '닢', p_key: 'charge:' + orderId, p_day: S.kstDay(), p_daily_max: null, p_paid: o.coins });
}

/* 중복 결제 자동 취소: 같은 콘텐츠를 이미 가진 계정이 또 결제한 경우(결제창을 두 번 연 경우 등). 실패하면 기록만 남기고 고객센터에서 수동 환불 */
async function cancelDup(o, patch){
  const orderId = o.order_id;
  try {
    let ok;
    if (patch.raw && patch.raw.provider === 'portone'){
      const r = await fetch('https://api.portone.io/payments/' + encodeURIComponent(orderId) + '/cancel', { method: 'POST', headers: { Authorization: 'PortOne ' + process.env.PORTONE_API_SECRET, 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: '중복 결제 자동 취소' }) });
      ok = r.ok;
    } else {
      const r = await fetch('https://api.tosspayments.com/v1/payments/' + encodeURIComponent(patch.payment_key) + '/cancel', { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64'), 'Content-Type': 'application/json', 'Idempotency-Key': 'dup-' + orderId }, body: JSON.stringify({ cancelReason: '중복 결제 자동 취소' }) });
      ok = r.ok;
    }
    await S.db('orders?order_id=eq.' + orderId, { method: 'PATCH', prefer: 'return=minimal', body: ok
      ? { status: 'refunded', refunded_at: new Date().toISOString(), refund_amount: o.amount, raw: Object.assign({}, patch.raw, { dup: 'auto_canceled' }) }
      : { raw: Object.assign({}, patch.raw, { dup: 'cancel_failed' }) } });
    if (!ok) console.error('dup cancel failed', orderId);
  } catch (e) { console.error('dup cancel', orderId, e.message); }
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
