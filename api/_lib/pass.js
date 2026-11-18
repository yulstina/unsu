/* 우니 패스 기간 계산: 결제 완료(paid)된 패스 주문을 결제 순서대로 이어 붙인다(기간 중 또 사면 끝난 뒤부터 이어짐).
   환불·취소된 주문은 status 가 paid 가 아니라 빠진다. 별도 테이블 없이 orders 만 기준으로 한다 */
const S = require('./srv');
const { PASSES } = require('./shop');

async function passUntil(uid){
  const rows = await S.db('orders?user_id=eq.' + uid + '&status=eq.paid&pack=like.pass*&select=pack,approved_at,created_at&order=approved_at.asc');
  let end = 0;
  (rows || []).forEach(o => {
    const P = PASSES[o.pack]; if (!P) return;
    const at = Date.parse(o.approved_at || o.created_at) || 0;
    end = Math.max(at, end) + P.days * 864e5;
  });
  return end;
}
module.exports = { passUntil };
