/* 카카오 로그인 (OAuth 2.0, REST API 방식)
   GET  /auth/kakao            → 카카오 동의 화면으로 (vercel.json rewrite → /api/auth?a=kakao)
   GET  /auth/kakao/callback   → 토큰 교환 · 회원 조회/생성 · 세션 쿠키 → /?login=kakao
   GET  /auth/google           → 구글 동의 화면으로 (이름만 받는다: scope openid profile)
   GET  /auth/google/callback  → 토큰 교환 · 회원 조회/생성 · 세션 쿠키 → /?login=google
   POST /api/auth?a=logout     → 세션 쿠키 삭제
   카카오 콘솔에 등록할 Redirect URI: https://woonijoa.com/auth/kakao/callback (미리보기 주소도 쓰려면 같이 등록)
   구글 콘솔 Redirect URI: https://woonijoa.com/auth/google/callback */
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
    return S.send(res, 404, { ok: false });
  } catch (e) {
    console.error('auth', e && e.message);
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
async function finish(req, res, provider, pid, nick){
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
  return S.redirect(res, '/?login=' + provider + (isNew ? '&new=1' : ''));
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
