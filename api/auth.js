/* 카카오 로그인 (OAuth 2.0, REST API 방식)
   GET  /auth/kakao            → 카카오 동의 화면으로 (vercel.json rewrite → /api/auth?a=kakao)
   GET  /auth/kakao/callback   → 토큰 교환 · 회원 조회/생성 · 세션 쿠키 → /?login=kakao
   GET  /auth/google           → 구글 동의 화면으로 (이름만 받는다: scope openid profile)
   GET  /auth/google/callback  → 토큰 교환 · 회원 조회/생성 · 세션 쿠키 → /?login=google
   GET  /auth/naver            → 네이버 동의 화면으로 (별명만 받는다)
   GET  /auth/naver/callback   → 토큰 교환 · 회원 조회/생성 · 세션 쿠키 → /?login=naver
   POST /api/auth?a=email      { email }        → 인증번호 6자리를 메일로 보낸다 (비밀번호 없음)
   POST /api/auth?a=verify     { email, code }  → 맞으면 회원 조회/생성 · 세션 쿠키 → { ok, url:'/?login=email' }
        메일 주소는 저장하지 않는다 — 회원 키는 'e:' + sha256(소문자 메일)
   POST /api/auth?a=logout     → 세션 쿠키 삭제
   카카오 콘솔에 등록할 Redirect URI: https://woonijoa.com/auth/kakao/callback (미리보기 주소도 쓰려면 같이 등록)
   구글 콘솔 Redirect URI: https://woonijoa.com/auth/google/callback
   네이버 개발자센터 Callback URL: https://woonijoa.com/auth/naver/callback (서비스 URL: https://woonijoa.com) */
const crypto = require('crypto');
const S = require('./_lib/srv');

const SIGNUP_COINS = 500;

module.exports = async (req, res) => {
  const a = (req.query && req.query.a) || '';
  try {
    if (a === 'logout'){
      if (req.method !== 'POST' || !S.sameOrigin(req)) return S.send(res, 405, { ok: false });
      S.clearSession(req, res); return S.send(res, 200, { ok: true });
    }
    if (a === 'kakao') return start(req, res);
    if (a === 'callback') return await callback(req, res);
    if (a === 'google') return startGoogle(req, res);
    if (a === 'gcallback') return await callbackGoogle(req, res);
    if (a === 'naver') return startNaver(req, res);
    if (a === 'ncallback') return await callbackNaver(req, res);
    if (a === 'email') return await emailSend(req, res);
    if (a === 'verify') return await emailVerify(req, res);
    return S.send(res, 404, { ok: false });
  } catch (e) {
    console.error('auth', e && e.message);
    if (a === 'email' || a === 'verify') return S.send(res, 500, { ok: false, err: 'server' });
    return S.redirect(res, '/?login=error');
  }
};

function redirectUri(req){ return S.origin(req) + '/auth/kakao/callback'; }

function start(req, res){
  if (!S.CONF.kakao) return S.redirect(res, '/?login=off');
  const state = crypto.randomBytes(16).toString('base64url');
  S.addCookie(res, S.cookie(req, 'wj_st', state, 600));
  const q = new URLSearchParams({ client_id: process.env.KAKAO_REST_KEY, redirect_uri: redirectUri(req), response_type: 'code', state });
  return S.redirect(res, 'https://kauth.kakao.com/oauth/authorize?' + q);
}

async function callback(req, res){
  const q = req.query || {};
  const st = S.readCookies(req).wj_st;
  S.addCookie(res, S.cookie(req, 'wj_st', '', 0));
  if (q.error) return S.redirect(res, '/?login=cancel');
  if (!q.code || !st || st !== q.state) return S.redirect(res, '/?login=error');

  /* 1) 코드 → 토큰 */
  const form = new URLSearchParams({ grant_type: 'authorization_code', client_id: process.env.KAKAO_REST_KEY, redirect_uri: redirectUri(req), code: q.code });
  if (process.env.KAKAO_CLIENT_SECRET) form.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
  const tr = await fetch('https://kauth.kakao.com/oauth/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: form });
  const tok = await tr.json();
  if (!tr.ok || !tok.access_token){ console.error('kakao token', tr.status, tok && tok.error_code); return S.redirect(res, '/?login=error'); }

  /* 2) 사용자 정보 (닉네임만 — 이메일 등은 받지 않는다) */
  const ur = await fetch('https://kapi.kakao.com/v2/user/me', { headers: { Authorization: 'Bearer ' + tok.access_token } });
  const me = await ur.json();
  if (!ur.ok || !me.id){ console.error('kakao me', ur.status); return S.redirect(res, '/?login=error'); }
  const pid = String(me.id);
  const nick = ((me.kakao_account && me.kakao_account.profile && me.kakao_account.profile.nickname) || (me.properties && me.properties.nickname) || '').slice(0, 30) || null;

  return await finish(req, res, 'kakao', pid, nick);
}

/* 회원 조회/생성 → 세션 → 앱으로 (카카오·구글 공통) */
async function finish(req, res, provider, pid, nick, json){
  let user = await S.one('users?provider=eq.' + provider + '&provider_id=eq.' + encodeURIComponent(pid) + '&select=id,deleted_at');
  let isNew = false;
  if (!user){
    const rows = await S.db('users', { method: 'POST', body: { provider, provider_id: pid, nick, last_login_at: new Date().toISOString() } });
    user = rows[0]; isNew = true;
    /* 가입 선물: 탈퇴 후 1년 안에 다시 가입하면 주지 않는다 */
    const prev = await S.one('users?provider=eq.' + provider + '&provider_id=eq.' + encodeURIComponent('deleted:' + S.sha(pid)) + '&deleted_at=gt.' + new Date(Date.now() - 365 * 864e5).toISOString() + '&select=id');
    if (!prev) await S.rpc('coin_apply', { p_user: user.id, p_delta: SIGNUP_COINS, p_kind: 'signup', p_why: '가입 환영 선물', p_key: 'signup', p_day: S.kstDay(), p_daily_max: null, p_paid: 0 });
  } else {
    await S.db('users?id=eq.' + user.id, { method: 'PATCH', body: { nick, last_login_at: new Date().toISOString() }, prefer: 'return=minimal' });
  }
  S.setSession(req, res, user.id);
  const url = '/?login=' + provider + (isNew ? '&new=1' : '');
  return json ? S.send(res, 200, { ok: true, url }) : S.redirect(res, url);
}

/* ---- 구글 ---- */
function gRedirectUri(req){ return S.origin(req) + '/auth/google/callback'; }

function startGoogle(req, res){
  if (!S.CONF.google) return S.redirect(res, '/?login=off');
  const state = crypto.randomBytes(16).toString('base64url');
  S.addCookie(res, S.cookie(req, 'wj_st', state, 600));
  const q = new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, redirect_uri: gRedirectUri(req), response_type: 'code', scope: 'openid profile', state, prompt: 'select_account' });
  return S.redirect(res, 'https://accounts.google.com/o/oauth2/v2/auth?' + q);
}

async function callbackGoogle(req, res){
  const q = req.query || {};
  const st = S.readCookies(req).wj_st;
  S.addCookie(res, S.cookie(req, 'wj_st', '', 0));
  if (q.error) return S.redirect(res, '/?login=cancel');
  if (!q.code || !st || st !== q.state) return S.redirect(res, '/?login=error');
  const form = new URLSearchParams({ grant_type: 'authorization_code', client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET, redirect_uri: gRedirectUri(req), code: q.code });
  const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  const tok = await tr.json();
  if (!tr.ok || !tok.access_token){ console.error('google token', tr.status, tok && tok.error); return S.redirect(res, '/?login=error'); }
  /* 이름만 쓴다 — 이메일은 요청하지도 저장하지도 않는다 */
  const ur = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tok.access_token } });
  const me = await ur.json();
  if (!ur.ok || !me.sub){ console.error('google me', ur.status); return S.redirect(res, '/?login=error'); }
  const nick = String(me.name || me.given_name || '').slice(0, 30) || null;
  return await finish(req, res, 'google', String(me.sub), nick);
}

/* ---- 네이버 ---- */
function nRedirectUri(req){ return S.origin(req) + '/auth/naver/callback'; }

function startNaver(req, res){
  if (!S.CONF.naver) return S.redirect(res, '/?login=off');
  const state = crypto.randomBytes(16).toString('base64url');
  S.addCookie(res, S.cookie(req, 'wj_st', state, 600));
  const q = new URLSearchParams({ response_type: 'code', client_id: process.env.NAVER_CLIENT_ID, redirect_uri: nRedirectUri(req), state });
  return S.redirect(res, 'https://nid.naver.com/oauth2.0/authorize?' + q);
}

async function callbackNaver(req, res){
  const q = req.query || {};
  const st = S.readCookies(req).wj_st;
  S.addCookie(res, S.cookie(req, 'wj_st', '', 0));
  if (q.error) return S.redirect(res, '/?login=cancel');
  if (!q.code || !st || st !== q.state) return S.redirect(res, '/?login=error');
  const form = new URLSearchParams({ grant_type: 'authorization_code', client_id: process.env.NAVER_CLIENT_ID, client_secret: process.env.NAVER_CLIENT_SECRET, code: q.code, state: q.state });
  const tr = await fetch('https://nid.naver.com/oauth2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }, body: form });
  const tok = await tr.json();
  if (!tr.ok || !tok.access_token){ console.error('naver token', tr.status, tok && tok.error); return S.redirect(res, '/?login=error'); }
  /* 별명만 쓴다 — 개발자센터 '제공 정보'에서 별명(선택)만 체크한다 */
  const ur = await fetch('https://openapi.naver.com/v1/nid/me', { headers: { Authorization: 'Bearer ' + tok.access_token } });
  const me = await ur.json();
  const r = me && me.response;
  if (!ur.ok || !r || !r.id){ console.error('naver me', ur.status, me && me.resultcode); return S.redirect(res, '/?login=error'); }
  const nick = String(r.nickname || '').slice(0, 30) || null;
  return await finish(req, res, 'naver', String(r.id), nick);
}

/* ---- 이메일 인증번호 로그인 (비밀번호 없음) ----
   테이블: supabase/002_email_login.sql (email_codes). 메일 발송: Resend (RESEND_API_KEY, MAIL_FROM) */
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,24}$/i;
const CODE_TTL = 10 * 60e3, RESEND_GAP = 60e3, MAX_TRIES = 5, DAY_MAX = 10;
const ehash = e => S.sha('mail:' + String(e).trim().toLowerCase());
const chash = (eh, c) => S.sha('code:' + eh + ':' + c + ':' + (process.env.SESSION_SECRET || ''));

async function emailSend(req, res){
  if (req.method !== 'POST' || !S.sameOrigin(req)) return S.send(res, 405, { ok: false });
  if (!S.CONF.email) return S.send(res, 503, { ok: false, err: 'off' });
  const b = await S.body(req);
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return S.send(res, 400, { ok: false, err: 'email' });
  const eh = ehash(email), now = Date.now();
  const prev = await S.one('email_codes?email_hash=eq.' + eh + '&select=sent_at,day,day_count');
  const today = S.kstDay();
  if (prev && now - Date.parse(prev.sent_at) < RESEND_GAP) return S.send(res, 429, { ok: false, err: 'wait', wait: Math.ceil((RESEND_GAP - (now - Date.parse(prev.sent_at))) / 1000) });
  const dayCount = prev && prev.day === today ? prev.day_count : 0;
  if (dayCount >= DAY_MAX) return S.send(res, 429, { ok: false, err: 'day' });
  const code = String(crypto.randomInt(0, 1e6)).padStart(6, '0');
  await S.db('email_codes', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: { email_hash: eh, code_hash: chash(eh, code), expires_at: new Date(now + CODE_TTL).toISOString(), tries: 0, sent_at: new Date(now).toISOString(), day: today, day_count: dayCount + 1 } });
  const html = '<div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#2a2340">' +
    '<p style="font-size:15px">우니조아 로그인 인증번호예요.</p>' +
    '<p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0">' + code + '</p>' +
    '<p style="font-size:13px;color:#6b6585">10분 안에 입력해 주세요. 직접 요청하지 않았다면 이 메일은 무시해도 돼요.</p></div>';
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || '우니조아 <login@woonijoa.com>', to: [email], subject: '[우니조아] 로그인 인증번호 ' + code, html }) });
  if (!r.ok){ console.error('resend', r.status, (await r.text()).slice(0, 200)); return S.send(res, 502, { ok: false, err: 'mail' }); }
  return S.send(res, 200, { ok: true });
}

async function emailVerify(req, res){
  if (req.method !== 'POST' || !S.sameOrigin(req)) return S.send(res, 405, { ok: false });
  if (!S.CONF.email) return S.send(res, 503, { ok: false, err: 'off' });
  const b = await S.body(req);
  const email = String(b.email || '').trim().toLowerCase(), code = String(b.code || '').replace(/\D/g, '');
  if (!EMAIL_RE.test(email) || code.length !== 6) return S.send(res, 400, { ok: false, err: 'code' });
  const eh = ehash(email);
  const row = await S.one('email_codes?email_hash=eq.' + eh + '&select=code_hash,expires_at,tries');
  if (!row || !row.code_hash || Date.parse(row.expires_at) < Date.now()) return S.send(res, 400, { ok: false, err: 'expired' });
  if (row.tries >= MAX_TRIES) return S.send(res, 429, { ok: false, err: 'tries' });
  const want = Buffer.from(row.code_hash), got = Buffer.from(chash(eh, code));
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)){
    await S.db('email_codes?email_hash=eq.' + eh, { method: 'PATCH', prefer: 'return=minimal', body: { tries: row.tries + 1 } });
    return S.send(res, 400, { ok: false, err: 'code', left: MAX_TRIES - row.tries - 1 });
  }
  await S.db('email_codes?email_hash=eq.' + eh, { method: 'PATCH', prefer: 'return=minimal', body: { code_hash: null, tries: 0 } });   /* 한 번 쓴 번호는 버린다 */
  return await finish(req, res, 'email', 'e:' + eh, null, true);
}
