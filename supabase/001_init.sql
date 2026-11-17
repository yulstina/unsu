-- 우니조아 서버 저장소 (Supabase / Postgres)
-- 모든 테이블은 RLS 를 켜고 정책을 두지 않는다 → 브라우저(anon 키)로는 아무것도 못 읽고 못 쓴다.
-- 서버리스 함수(api/*)만 service_role 키로 접근한다.

create extension if not exists pgcrypto;

-- 회원
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,                 -- 'kakao'
  provider_id   text not null,                 -- 카카오 회원번호. 탈퇴하면 'deleted:' || sha256 값으로 바꾼다
  nick          text,
  consent       jsonb,                         -- {terms, privacy, age, mkt, night, v} 동의 시각(ms)
  snapshot      jsonb,                         -- 사주 목록·출석 등 앱 데이터(엽전·결제 제외)
  snapshot_at   timestamptz,
  coin_free     integer not null default 0 check (coin_free >= 0),
  coin_paid     integer not null default 0 check (coin_paid >= 0),
  created_at    timestamptz not null default now(),
  last_login_at timestamptz,
  deleted_at    timestamptz,
  unique (provider, provider_id)
);

-- 엽전 원장: 모든 적립·사용을 한 줄씩. 잔액은 users 에 캐시
create table if not exists public.coin_ledger (
  id         bigserial primary key,
  user_id    uuid references public.users(id) on delete cascade,
  delta      integer not null,
  delta_paid integer not null default 0,       -- 이 줄에서 바뀐 유료 엽전(환불 계산용)
  kind       text not null,                    -- signup att streak ad peek todo petgift invite spend charge refund admin
  why        text,
  day        date not null,                    -- 한국 시간 기준 날짜 (하루 한도 계산)
  ikey       text,                             -- 같은 요청이 두 번 와도 한 번만 (멱등 키)
  bal_after  integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, ikey)
);
create index if not exists coin_ledger_user_day on public.coin_ledger (user_id, day, kind);
create index if not exists coin_ledger_user_time on public.coin_ledger (user_id, created_at desc);

-- 결제(충전) 주문. 전자상거래법상 5년 보관 → 회원 탈퇴해도 지우지 않는다(user_id 는 남기되 회원 정보는 지워짐)
create table if not exists public.orders (
  order_id     text primary key,
  user_id      uuid references public.users(id) on delete set null,
  pack         text not null,
  coins        integer not null,               -- 유료 엽전
  bonus        integer not null default 0,     -- 보너스(무료) 엽전
  amount       integer not null,               -- 원
  status       text not null default 'ready',  -- ready paid failed canceled refunded
  payment_key  text,
  method       text,
  receipt_url  text,
  approved_at  timestamptz,
  refunded_at  timestamptz,
  refund_amount integer,
  raw          jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists orders_user on public.orders (user_id, created_at desc);

alter table public.users enable row level security;
alter table public.coin_ledger enable row level security;
alter table public.orders enable row level security;

-- 엽전 증감을 한 트랜잭션으로: 행 잠금 → 멱등 키 확인 → 하루 한도 → 잔액 확인 → 기록
-- p_delta > 0: p_paid 만큼은 유료, 나머지는 무료로 적립
-- p_delta < 0: 무료 엽전 먼저, 모자라면 유료 엽전에서 차감
create or replace function public.coin_apply(
  p_user uuid, p_delta integer, p_kind text, p_why text, p_key text,
  p_day date, p_daily_max integer default null, p_paid integer default 0
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  u public.users%rowtype;
  n integer;
  take_free integer; take_paid integer;
  nf integer; np integer;
begin
  select * into u from public.users where id = p_user and deleted_at is null for update;
  if not found then return jsonb_build_object('ok', false, 'err', 'no_user'); end if;

  if p_key is not null and exists (select 1 from public.coin_ledger where user_id = p_user and ikey = p_key) then
    return jsonb_build_object('ok', true, 'dup', true, 'free', u.coin_free, 'paid', u.coin_paid, 'bal', u.coin_free + u.coin_paid);
  end if;

  if p_daily_max is not null then
    select count(*) into n from public.coin_ledger where user_id = p_user and day = p_day and kind = p_kind;
    if n >= p_daily_max then
      return jsonb_build_object('ok', false, 'err', 'limit', 'free', u.coin_free, 'paid', u.coin_paid, 'bal', u.coin_free + u.coin_paid);
    end if;
  end if;

  if p_delta >= 0 then
    np := u.coin_paid + least(greatest(p_paid, 0), p_delta);
    nf := u.coin_free + p_delta - least(greatest(p_paid, 0), p_delta);
    take_paid := -(np - u.coin_paid);
  else
    if u.coin_free + u.coin_paid < -p_delta then
      return jsonb_build_object('ok', false, 'err', 'short', 'free', u.coin_free, 'paid', u.coin_paid, 'bal', u.coin_free + u.coin_paid);
    end if;
    take_free := least(u.coin_free, -p_delta);
    take_paid := -p_delta - take_free;
    nf := u.coin_free - take_free;
    np := u.coin_paid - take_paid;
  end if;

  update public.users set coin_free = nf, coin_paid = np where id = p_user;
  insert into public.coin_ledger (user_id, delta, delta_paid, kind, why, day, ikey, bal_after)
    values (p_user, p_delta, np - u.coin_paid, p_kind, p_why, p_day, p_key, nf + np);
  return jsonb_build_object('ok', true, 'free', nf, 'paid', np, 'bal', nf + np);
end $$;

revoke all on function public.coin_apply(uuid, integer, text, text, text, date, integer, integer) from public, anon, authenticated;
grant execute on function public.coin_apply(uuid, integer, text, text, text, date, integer, integer) to service_role;
