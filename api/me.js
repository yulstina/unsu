/* /api/me — 로그인 상태 · 엽전 · 결제 기록 · 앱 데이터 동기화
   GET     설정(로그인·결제 켜짐 여부) + 로그인했으면 회원 정보
   PUT     { snapshot }   앱 데이터 저장 (엽전·결제는 서버가 기준이라 제외)
   POST    { consent }    약관·마케팅 동의 기록
   DELETE  { confirm:1 }  회원 탈퇴 */
const S = require('./_lib/srv');
const { PACKS, AD_COIN_ON, PASSES, PASS_DREAM_MAX, WON, WON_NAMES, WON_SALE, PASS_SALE, COIN_SALE } = require('./_lib/shop');
const { passUntil } = require('./_lib/pass');

const SERVER_KEYS = ['unsu_coin', 'unsu_coinlog'];   /* 서버가 기준인 값 — 스냅샷에 저장하지 않는다 */

function cfg(){
  const ck = process.env.TOSS_CLIENT_KEY || '';
  return {
    on: S.CONF.db,
    login: { kakao: S.CONF.kakao, google: S.CONF.google },
    pay: { on: S.CONF.pay, provider: S.CONF.pay ? S.CONF.provider : null,
           clientKey: S.CONF.pay && S.CONF.provider === 'toss' ? ck : null,
           storeId: S.CONF.pay && S.CONF.provider === 'portone' ? process.env.PORTONE_STORE_ID : null,
           channelKey: S.CONF.pay && S.CONF.provider === 'portone' ? process.env.PORTONE_CHANNEL_KEY : null,
           kakaoChannelKey: S.CONF.pay && S.CONF.provider === 'portone' ? process.env.PORTONE_KAKAOPAY_CHANNEL_KEY || null : null,   /* 카카오페이 채널(선택) */
           test: S.CONF.payTest },
    packs: COIN_SALE ? PACKS : null,   /* 엽전 판매는 기본 꺼짐(2026-11-21) */
    won: WON, wonNames: WON_NAMES, wonSale: WON_SALE,
    passes: PASS_SALE ? PASSES : null, passDreamMax: PASS_DREAM_MAX,
    adCoin: AD_COIN_ON,
    kakaoJs: process.env.KAKAO_JS_KEY || null,   /* 카카오톡 카드 공유(공개 키). 없으면 공유 시트에 카카오 버튼이 안 뜬다 */
    nums: process.env.LUCKY_NUMS !== '0'   /* 부적·꿈 처방의 행운 숫자. PG 심사 중 숨기려면 LUCKY_NUMS=0 */
  };
}

module.exports = async (req, res) => {
  const c = cfg();
  const uid = S.sessionUid(req);
  try {
    if (req.method === 'GET'){
      if (!uid) return S.send(res, 200, { cfg: c, user: null });
      /* 운영자 열쇠: /?owner=열쇠 → 앱이 /api/me?owner=열쇠 로 넘긴다. off 면 해제 */
      const ok = req.query && req.query.owner;
      let owner = S.isOwner(req, uid);
      if (ok === 'off'){ S.clearOwner(req, res); owner = false; }
      else if (ok && S.ownerKeyOk(ok)){ S.setOwner(req, res, uid); owner = true; }
      const u = await S.one('users?id=eq.' + uid + '&deleted_at=is.null&select=provider,nick,consent,snapshot,snapshot_at,coin_free,coin_paid,created_at');
      if (!u){ S.clearSession(req, res); return S.send(res, 200, { cfg: c, user: null }); }
      const [led, ord, pu] = await Promise.all([
        S.db('coin_ledger?user_id=eq.' + uid + '&select=delta,delta_paid,kind,why,created_at&order=created_at.desc&limit=50'),
        S.db('orders?user_id=eq.' + uid + '&status=neq.ready&select=order_id,pack,coins,bonus,amount,status,method,receipt_url,approved_at,refunded_at,created_at&order=created_at.desc&limit=50'),
        passUntil(uid)
      ]);
      return S.send(res, 200, { cfg: c, user: {
        provider: u.provider, nick: u.nick, created: u.created_at, consent: u.consent,
        snapshot: u.snapshot, snapshotAt: u.snapshot_at ? Date.parse(u.snapshot_at) : 0,
        coins: { free: u.coin_free, paid: u.coin_paid, bal: u.coin_free + u.coin_paid },
        ledger: led.map(x => ({ t: Date.parse(x.created_at), n: x.delta, p: x.delta_paid || 0, k: x.kind, why: x.why || '' })),
        orders: ord, passUntil: owner ? S.OWNER_UNTIL : pu, owner, customerKey: 'wj_' + S.sha(uid).slice(0, 32)
      } });
    }
    if (!uid) return S.send(res, 401, { ok: false, err: 'login' });
    if (!S.sameOrigin(req)) return S.send(res, 403, { ok: false });
    const b = await S.body(req);

    if (req.method === 'PUT'){
      const snap = b.snapshot && typeof b.snapshot === 'object' ? b.snapshot : null;
      if (!snap) return S.send(res, 400, { ok: false });
      SERVER_KEYS.forEach(k => { delete snap[k]; });
      if (JSON.stringify(snap).length > 300000) return S.send(res, 413, { ok: false, err: 'big' });
      await S.db('users?id=eq.' + uid, { method: 'PATCH', body: { snapshot: snap, snapshot_at: new Date().toISOString() }, prefer: 'return=minimal' });
      return S.send(res, 200, { ok: true, at: Date.now() });
    }
    if (req.method === 'POST'){
      const cs = b.consent && typeof b.consent === 'object' ? b.consent : null;
      if (!cs) return S.send(res, 400, { ok: false });
      const keep = {}; ['terms', 'privacy', 'age', 'mkt', 'night'].forEach(k => { keep[k] = Number(cs[k]) || 0; }); keep.v = String(cs.v || '').slice(0, 20);
      await S.db('users?id=eq.' + uid, { method: 'PATCH', body: { consent: keep }, prefer: 'return=minimal' });
      return S.send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE'){
      if (!b.confirm) return S.send(res, 400, { ok: false });
      const u = await S.one('users?id=eq.' + uid + '&select=provider,provider_id');
      if (!u) return S.send(res, 200, { ok: true });
      const pid = u.provider_id;
      await S.db('users?id=eq.' + uid, { method: 'PATCH', prefer: 'return=minimal', body: {
        provider_id: 'deleted:' + S.sha(pid), nick: null, consent: null, snapshot: null, snapshot_at: null, coin_free: 0, coin_paid: 0, deleted_at: new Date().toISOString()
      } });
      await S.db('coin_ledger?user_id=eq.' + uid + '&kind=not.in.(charge,refund)', { method: 'DELETE', prefer: 'return=minimal' });
      if (u.provider === 'kakao' && process.env.KAKAO_ADMIN_KEY && /^\d+$/.test(pid)){
        try { await fetch('https://kapi.kakao.com/v1/user/unlink', { method: 'POST', headers: { Authorization: 'KakaoAK ' + process.env.KAKAO_ADMIN_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'target_id_type=user_id&target_id=' + pid }); } catch (e) { console.error('unlink', e.message); }
      }
      S.clearSession(req, res);
      return S.send(res, 200, { ok: true });
    }
    return S.send(res, 405, { ok: false });
  } catch (e) {
    console.error('me', e.message);
    return S.send(res, 500, { ok: false, err: 'server', cfg: c });
  }
};
