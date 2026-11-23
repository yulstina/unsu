-- 이메일 인증번호 로그인 (2026-11-23)
-- 메일 주소 원문은 저장하지 않는다: email_hash = sha256('mail:' || 소문자 메일), 회원은 users(provider='email', provider_id='e:'||email_hash)
-- 인증번호도 해시로만 저장하고, 쓰거나 5번 틀리면 못 쓴다. 브라우저(anon)는 접근 불가(RLS 켜고 정책 없음)
create table if not exists public.email_codes (
  email_hash text primary key,
  code_hash  text,
  expires_at timestamptz not null,
  tries      integer not null default 0,
  sent_at    timestamptz not null default now(),
  day        date not null,
  day_count  integer not null default 1
);
alter table public.email_codes enable row level security;
