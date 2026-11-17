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
const SPEND_MAX = 5000;
module.exports = { PACKS, EARN, SPEND_MAX };
