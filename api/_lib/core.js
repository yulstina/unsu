/* 브라우저용 계산 코드(public/js/lunar.js + core.js)를 서버에서 그대로 불러 쓴다.
   → 링크 미리보기(og)와 실제 화면이 같은 엔진으로 계산된다. 빌드 결과물이라 `npm run build:site` 후에 반영된다. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
let ctx = null;
module.exports = function core() {
  if (ctx) return ctx;
  const dir = path.join(__dirname, '..', '..', 'public', 'js');
  const c = vm.createContext({ console, Buffer });
  vm.runInContext(fs.readFileSync(path.join(dir, 'lunar.js'), 'utf8'), c, { filename: 'lunar.js' });
  vm.runInContext(fs.readFileSync(path.join(dir, 'core.js'), 'utf8'), c, { filename: 'core.js' });
  ctx = c;
  return ctx;
};
/* 링크 코드 → { S, card } · 잘못된 코드면 null */
module.exports.read = function (code) {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{8,400}$/.test(code)) return null;
  try {
    const { SHARE } = module.exports();
    const S = SHARE.decode(code);
    return S ? { S, card: SHARE.card(S) } : null;
  } catch (e) { return null; }
};
