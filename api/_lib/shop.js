/* 엽전 패키지와 무료 적립 규칙 — 서버 기준값. src/app.js 의 COIN_PACKS·보상값과 맞춘다 */
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
const PRICES = { cat: 100, extra: 100, dream: 200, gh: 100, ez: 100, tk: 500 };
/* 광고 보상 엽전: 실제 보상형 광고(Google Ad Manager)가 연결되고 서버 확인이 붙기 전까지 꺼 둔다 → Vercel 환경변수 AD_COIN_ON=1 로 켠다 */
const AD_COIN_ON = process.env.AD_COIN_ON === '1';
const SPEND_MAX = 5000;
module.exports = { PACKS, EARN, PRICES, AD_COIN_ON, SPEND_MAX };
