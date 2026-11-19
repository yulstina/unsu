# 계정·결제 켜기 (카카오 로그인 · Supabase · 토스페이먼츠)

코드는 들어가 있고, 아래 환경변수가 Vercel에 들어가는 순간 기능이 켜진다. 비어 있으면 예전처럼 "이 기기에만 저장" 모드로 동작한다(로그인 버튼은 미리보기용 흉내).

| 환경변수 | 어디서 | 비고 |
|---|---|---|
| `SUPABASE_URL` | Supabase › Project Settings › API › Project URL | |
| `SUPABASE_SERVICE_KEY` | 같은 화면 › `service_role` 키 (secret) | **서버 전용**. 절대 화면 코드에 넣지 않는다 |
| `SESSION_SECRET` | 아무 긴 임의 문자열(40자 이상) | 바꾸면 모두 로그아웃됨 |
| `KAKAO_REST_KEY` | 카카오 디벨로퍼스 › 내 애플리케이션 › 앱 키 › REST API 키 | |
| `KAKAO_CLIENT_SECRET` | 카카오 로그인 › 보안 › Client Secret (켰을 때만) | 권장 |
| `KAKAO_ADMIN_KEY` | 앱 키 › Admin 키 (선택) | 탈퇴 시 카카오 연결 끊기 |
| `GOOGLE_CLIENT_ID` | Google Cloud › API 및 서비스 › 사용자 인증 정보 › OAuth 클라이언트 ID | 구글 로그인 |
| `GOOGLE_CLIENT_SECRET` | 같은 화면 › 클라이언트 보안 비밀 | **서버 전용** |
| `TOSS_CLIENT_KEY` | 토스페이먼츠 개발자센터 › API 키 › **API 개별 연동 키** 클라이언트 키 | `test_ck_…` 면 테스트 결제 |
| `TOSS_SECRET_KEY` | 같은 화면 › 시크릿 키 | `test_sk_…` |
| `PAY_LIVE` | (실결제 때만) `1` | 라이브 키(`live_ck_…`)를 넣어도 이게 `1` 이고 **12/4(개업일) 이후**일 때만 결제가 열려요. 테스트 키는 이것과 무관하게 열림 |
| `PAY_OFF` | (비상용) `1` | 문제가 생기면 이걸 `1` 로 → 모든 결제 버튼이 즉시 “결제 준비 중”으로 돌아가요 (재배포 필요) |
| `AD_COIN_ON` | (선택) 실제 보상형 광고 + 서버 확인이 붙은 뒤에만 `1` | 비워 두면 “광고 보고 +20닢”이 꺼져요 |

## 구글 로그인 (선택, 카카오와 함께 보인다)
1. console.cloud.google.com › 새 프로젝트 `woonijoa`.
2. API 및 서비스 › OAuth 동의 화면: 앱 이름 우니조아, 지원 이메일, 승인된 도메인 `woonijoa.com`. 범위는 기본(`openid`, `profile`)만. **게시 상태를 "프로덕션"으로** 바꿔야 누구나 로그인할 수 있다(기본 범위만이라 심사 불필요).
3. 사용자 인증 정보 › OAuth 클라이언트 ID 만들기 › 웹 애플리케이션 › 승인된 리디렉션 URI `https://woonijoa.com/auth/google/callback`.
4. 나온 클라이언트 ID/보안 비밀을 Vercel 환경변수에 넣고 재배포.

## 1. Supabase
1. 새 프로젝트 `woonijoa`, 지역 **Northeast Asia (Seoul)**.
2. SQL Editor 에 `supabase/001_init.sql` 전체를 붙여 넣고 Run.
3. API 화면에서 URL과 `service_role` 키를 복사해 Vercel에 넣는다.
4. 무료 플랜은 1주일 동안 요청이 없으면 일시정지된다 → 출시 후엔 사용자가 있으니 괜찮지만, 출시 전 테스트 기간엔 주의.

## 2. 카카오 로그인
1. developers.kakao.com › 내 애플리케이션 › 애플리케이션 추가 (앱 이름 우니조아, 사업자명 SYLO).
2. 플랫폼 › Web › 사이트 도메인: `https://woonijoa.com`
3. 카카오 로그인 › 활성화 ON, Redirect URI:
   - `https://woonijoa.com/auth/kakao/callback`
   - (미리보기에서도 시험하려면) `https://<미리보기 주소>/auth/kakao/callback`
4. 동의항목 › **닉네임** 만 "필수 동의"로. 이메일·전화번호는 받지 않는다(비즈 앱 심사 불필요).
5. 보안 › Client Secret 코드 생성 + 활성화 → `KAKAO_CLIENT_SECRET`.

## 3. 토스페이먼츠
1. 가입 후 개발자센터에서 **테스트 키**를 바로 쓸 수 있다(심사 전에도 가능, 실제 청구 없음).
2. 결제 방식은 "결제창(API 개별 연동)". 결제위젯 키(`gck`)가 아니라 `ck`/`sk` 키를 쓴다.
3. 심사 통과 후 라이브 키로 바꾸면 끝. **12/4 개업 전엔 라이브 키 금지.**

## 동작 요약
- 로그인: `/auth/kakao` → 카카오 동의 → `/auth/kakao/callback` → 서버가 회원 생성(첫 가입 +500닢) → 세션 쿠키(60일).
- 엽전: 서버 원장(`coin_ledger`)이 기준. 출석·광고 등 무료 적립은 서버가 정한 양과 하루 한도(`api/_lib/shop.js`)로만, 사용은 잔액 검사 후 무료 엽전부터 차감.
- 충전: 서버가 금액을 정해 주문 생성 → 토스 결제창 → `/pay/success` 에서 금액 대조 후 승인 API → 유료/보너스 엽전 적립. 새로고침해도 한 번만 적립.
- 탈퇴: 개인 데이터 삭제, 결제 기록은 5년 보관, 1년 안에 재가입하면 가입 선물 없음.

## 환불 처리 (지금은 수동)
1. 토스페이먼츠 상점관리자에서 해당 결제 취소(전액/부분).
2. Supabase SQL Editor:
   ```sql
   update orders set status='refunded', refunded_at=now(), refund_amount=<원> where order_id='<주문번호>';
   select coin_apply('<user_id>', -<회수할 엽전>, 'refund', '환불', 'refund:<주문번호>', current_date, null, 0);
   ```
