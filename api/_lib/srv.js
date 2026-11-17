/* 서버 공통: Supabase(REST) · 로그인 세션 쿠키 · 응답 헬퍼
   환경변수 (Vercel)
     SUPABASE_URL, SUPABASE_SERVICE_KEY      DB. service_role 키는 서버에서만 쓴다(브라우저로 절대 보내지 않음)
     SESSION_SECRET                          세션 쿠키 서명용 임의 문자열(32자 이상)
     KAKAO_REST_KEY, KAKAO_CLIENT_SECRET     카카오 로그인 (CLIENT_SECRET 은 콘솔에서 켰을 때만)
     KAKAO_ADMIN_KEY                         (선택) 탈퇴 시 카카오 연결 끊기
     TOSS_CLIENT_KEY, TOSS_SECRET_KEY        토스페이먼츠 (API 개별 연동 키 · test_ck_ / test_sk_ 로 시작하면 테스트 결제)
   하나라도 비어 있으면 그 기능만 꺼지고, 앱은 예전처럼 기기 저장 모드로 동작한다. */
const crypto = require('crypto');

const E = process.env;
const CONF = {
  db: !!(E.SUPABASE_URL && E.SUPABASE_SERVICE_KEY && E.SESSION_SECRET),
  get kakao(){ return this.db && !!E.KAKAO_REST_KEY; },
  get toss(){ return this.db && !!(E.TOSS_CLIENT_KEY && E.TOSS_SECRET_KEY); }
};

/* ---- Supabase PostgREST ---- */
async function db(path, opt = {}){
  const r = await fetch(E.SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + path, {
    method: opt.method || 'GET',
    headers: Object.assign({
      apikey: E.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + E.SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: opt.prefer || 'return=representation'
    }, opt.headers || {}),
    body: opt.body !== undefined ? JSON.stringify(opt.body) : undefined
  });
  const txt = await r.text();
  let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = txt; }
  if (!r.ok){ const err = new Error('db ' + r.status + ' ' + (data && data.message || txt).slice(0, 200)); err.status = r.status; throw err; }
  return data;
}
const rpc = (fn, args) => db('rpc/' + fn, { method: 'POST', body: args });
const one = async (path) => { const a = await db(path); return Array.isArray(a) ? a[0] || null : a; };

/* ---- 세션 쿠키: base64url(JSON).HMAC ---- */
const COOKIE = 'wj_s', MAX_AGE = 60 * 24 * 3600;
const b64u = b => Buffer.from(b).toString('base64url');
const sign = s => crypto.createHmac('sha256', E.SESSION_SECRET).update(s).digest('base64url');
function makeSession(uid){ const p = b64u(JSON.stringify({ u: uid, e: Date.now() + MAX_AGE * 1000 })); return p + '.' + sign(p); }
function readCookies(req){
  const o = {}; (req.headers.cookie || '').split(/;\s*/).forEach(kv => { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
  return o;
}
function sessionUid(req){
  if (!CONF.db) return null;
  const c = readCookies(req)[COOKIE]; if (!c) return null;
  const [p, s] = c.split('.');
  if (!p || !s) return null;
  const want = sign(p);
  if (want.length !== s.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null;
  try { const o = JSON.parse(Buffer.from(p, 'base64url').toString()); return o.e > Date.now() ? o.u : null; } catch (e) { return null; }
}
function isLocal(req){ return /^(localhost|127\.)/.test(req.headers.host || ''); }
function cookie(req, name, val, maxAge){
  return name + '=' + encodeURIComponent(val) + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + maxAge + (isLocal(req) ? '' : '; Secure');
}
function addCookie(res, c){ const prev = res.getHeader('Set-Cookie'); res.setHeader('Set-Cookie', prev ? [].concat(prev, c) : c); }
const setSession = (req, res, uid) => addCookie(res, cookie(req, COOKIE, makeSession(uid), MAX_AGE));
const clearSession = (req, res) => addCookie(res, cookie(req, COOKIE, '', 0));

/* ---- 기타 ---- */
function origin(req){
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (isLocal(req) ? 'http' : 'https');
  return proto + '://' + host;
}
function kstDay(t){ const d = new Date((t || Date.now()) + 9 * 3600e3); return d.toISOString().slice(0, 10); }
function send(res, code, obj){ res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); }
function redirect(res, url){ res.statusCode = 302; res.setHeader('Location', url); res.setHeader('Cache-Control', 'no-store'); res.end(); }
async function body(req){
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string'){ try { return JSON.parse(req.body); } catch (e) { return {}; } }
  return await new Promise(ok => { let s = ''; req.on('data', c => { s += c; if (s.length > 4e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(s || '{}')); } catch (e) { ok({}); } }); req.on('error', () => ok({})); });
}
/* 같은 사이트에서 온 요청만 (CSRF 방지: 쿠키 로그인 + 상태 변경 요청) */
function sameOrigin(req){
  const o = req.headers.origin; if (!o) return true;   /* 같은 출처 GET/폼 이동은 Origin 이 없을 수 있다 */
  try { return new URL(o).host === (req.headers['x-forwarded-host'] || req.headers.host); } catch (e) { return false; }
}
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

module.exports = { CONF, db, rpc, one, sessionUid, setSession, clearSession, origin, kstDay, send, redirect, body, sameOrigin, sha, readCookies, cookie, addCookie };
