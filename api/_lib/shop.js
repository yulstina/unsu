/* 엽전 패키지와 무료 적립 규칙 — 서버 기준값. src/app.js 의 COIN_PACKS·보상값과 맞춘다
   2026-11-21 소율 결정: PG 심사(포인트·사이버머니 충전 = 위험업종) 때문에 엽전은 팔지 않는다.
   엽전은 출석·가입·선물로만 쌓는 무료 적립 포인트, 유료는 원화 단건 결제(WON) + 우니 패스.
   COIN_SALE=1(Vercel 환경변수)일 때만 예전 충전 패키지를 다시 판다 — PG 계약에서 충전이 허용된 뒤에만 켤 것 */
const PACKS = {
  p300:  { n: 300,  b: 0,    p: 3300 },
  p1000: { n: 1000, b: 100,  p: 9900 },
  p2000: { n: 2000, b: 300,  p: 18900 },
  p5000: { n: 5000, b: 1000, p: 44000 }
};
/* 무료 적립: kind → 한 번에 주는 양, 하루(한국 시간) 최대 횟수 */
const EARN = {
  att:     { n: 10,  max: 1 },   /* 출석 체크 */
  streak:  { n: 30,  max: 1 },   /* 7일 연속 보너스 */
  ad:      { n: 20,  max: 3 },   /* 광고 보상 (AD_LIMIT) */
  peek:    { n: 20,  max: 1 },   /* 우니 꾹 뽑기 */
  todo:    { n: 30,  max: 1 },   /* 오늘 할 일 3/3 */
  petgift: { n: 100, max: 1 },   /* 우니의 선물 */
  invite:  { n: 20,  max: 5 }    /* 초대 수락 선물 */
};
/* 엽전으로 여는 상품 가격 — src/app.js 의 COST 와 같아야 한다. 서버는 브라우저가 보낸 금액 대신 이 값으로 차감한다 */
const PRICES = { cat: 100, dream: 200, gh: 100, ez: 100, tk: 500, tj: 100, cal: 100, lv: 200, chat: 100 };
/* 광고 보상 엽전: 실제 보상형 광고(Google Ad Manager)가 연결되고 서버 확인이 붙기 전까지 꺼 둔다 → Vercel 환경변수 AD_COIN_ON=1 로 켠다 */
const AD_COIN_ON = process.env.AD_COIN_ON === '1';
/* 우니 패스: 원화 바로 결제하는 기간권. 기간 동안 엽전 콘텐츠를 엽전 없이 열고 광고를 숨긴다(자동 결제 아님).
   AI 를 쓰는 꿈 풀이 리포트만 하루 PASS_DREAM_MAX 번까지. 가격은 src/app.js PASS 와 같이 바꾼다 */
/* 원화 단건 결제 가격(원). 결제 즉시 그 콘텐츠 하나가 열린다. src/app.js 의 WON 과 같이 바꾼다.
   */
const WON = { cat: 990, dream: 1900, gh: 990, ez: 990, tk: 4900, tj: 990, cal: 990, lv: 1900, chat: 990 };
/* 결제창·구매 내역에 나오는 상품명 — '로또·당첨·번호 추천' 같은 말은 쓰지 않는다(PG 심사) */
const WON_NAMES = { cat: '분야별 운세', dream: '꿈 풀이 리포트', gh: '궁합 상세 리포트', ez: '쉬운 사주 풀이', tk: '중요한 날 잡기', tj: '2027 토정비결', cal: '월별 운세 달력', lv: '연애·결혼 시기', chat: 'AI 상담 질문권 5회' };
const COIN_SALE = process.env.COIN_SALE === '1';
/* 원화로 실제 판매하는 상품 (2026-11-21 GPT 최종 검토: 첫 판매는 3종만 — 사주 이야기책·궁합 상세·중요한 날 잡기).
   나머지 상품은 미리보기 + 무료 적립 엽전으로만 연다. PG 승인 범위가 넓어지면 Vercel 환경변수 WON_SALE=ez,gh,tk,tj 처럼 늘린다 */
const WON_SALE = (process.env.WON_SALE || 'ez,gh,tk').split(',').map(s => s.trim()).filter(k => WON[k]);
/* 우니 패스 판매: 첫 출시엔 끔(환불·한도 조건 확정 후 PASS_SALE=1) */
const PASS_SALE = process.env.PASS_SALE === '1';
const PASSES = { pass30: { days: 30, p: 12900, name: '우니 패스 30일' } };
const PASS_DREAM_MAX = 1;
const SPEND_MAX = 5000;
module.exports = { PACKS, WON, WON_NAMES, WON_SALE, PASS_SALE, COIN_SALE, EARN, PRICES, AD_COIN_ON, PASSES, PASS_DREAM_MAX, SPEND_MAX };
