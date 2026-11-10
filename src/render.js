var FIG_UID = 0;
var TINT = { fire:'#ffb3a1', earth:'#ffd98a', air:'#d9c2ff', water:'#9ff0e4', wood:'#b4f0c0', metal:'#eef2fa' };
function figSVG(key, el, cls){
  var f = FIG[key]; if (!f) return '';
  var u = 'f' + (++FIG_UID);
  var tint = TINT[el] || '#cfc6fb';
  var s = '<svg class="' + (cls || 'fig') + '" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  s += '<defs>'
    + '<radialGradient id="' + u + 'g"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="#cfe6ff" stop-opacity=".45"/><stop offset="1" stop-color="#8fb8ff" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="' + u + 'l" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="180"><stop offset="0" stop-color="#eaf5ff"/><stop offset="1" stop-color="#9cc4f2"/></linearGradient>'
    + '<filter id="' + u + 'n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -.6 1.1" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>'
    + '<linearGradient id="' + u + 'f" gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="175"><stop offset="0" stop-color="#dcefff" stop-opacity=".30"/><stop offset="1" stop-color="#9cc4f2" stop-opacity=".05"/></linearGradient>'
    + '<radialGradient id="' + u + 'a"><stop offset="0" stop-color="' + tint + '" stop-opacity=".34"/><stop offset=".55" stop-color="' + tint + '" stop-opacity=".08"/><stop offset="1" stop-color="' + tint + '" stop-opacity="0"/></radialGradient>'
    + '</defs><circle cx="100" cy="104" r="96" fill="url(#' + u + 'a)"/>';
  /* gouache fill */
  s += '<g filter="url(#' + u + 'n)" fill="url(#' + u + 'f)" stroke="none">';
  f.p.forEach(function(d){ if (/[Zz]\s*$/.test(d) || /a\d/.test(d)) s += '<path d="' + d + '"/>'; });
  s += '</g>';
  /* line art */
  s += '<g fill="none" stroke="url(#' + u + 'l)" stroke-linecap="round" stroke-linejoin="round">';
  f.p.forEach(function(d){ s += '<path class="fig-line" pathLength="1" d="' + d + '" stroke-width="1.3" stroke-opacity=".85"/>'; });
  f.d.forEach(function(d){ s += '<path class="fig-line" pathLength="1" d="' + d + '" stroke-width=".9" stroke-opacity=".5"/>'; });
  s += '</g>';
  /* constellation links */
  s += '<g stroke="#fff" stroke-width=".8" stroke-opacity=".6" class="fig-links">';
  f.l.forEach(function(p){ var a = f.s[p[0]], b = f.s[p[1]]; s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; });
  s += '</g>';
  /* stars */
  f.s.forEach(function(st, i){
    var x = st[0], y = st[1], r = st[2];
    s += '<g class="fig-star" style="--d:' + (i * 0.37 % 2.4).toFixed(2) + 's">';
    s += '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 5) + '" fill="url(#' + u + 'g)"/>';
    if (r >= 2.4){
      var k = r * 4.2, w = r * .45;
      s += '<path fill="#fff" d="M' + x + ' ' + (y - k) + ' L' + (x + w) + ' ' + (y - w) + ' L' + (x + k) + ' ' + y + ' L' + (x + w) + ' ' + (y + w) + ' L' + x + ' ' + (y + k) + ' L' + (x - w) + ' ' + (y + w) + ' L' + (x - k) + ' ' + y + ' L' + (x - w) + ' ' + (y - w) + ' Z" opacity=".9"/>';
    }
    s += '<circle cx="' + x + '" cy="' + y + '" r="' + r * .8 + '" fill="#fff"/>';
    s += '</g>';
  });
  return s + '</svg>';
}

/* 우니 일러스트 (단순·귀여운 버전) — 반투명 라벤더 몸통 + 점 눈 + 작은 미소 + 별 더듬이 + 반짝이.
   첫 화면·사주 입력 화면의 큰 그림으로 쓴다. 120×120 좌표계 */
function woniFigSVG(cls){
  var u = 'wf' + (++FIG_UID);
  var body = 'M60 38c22 0 38 15 38 36c0 18-16 30-38 30S22 92 22 74c0-21 16-36 38-36z';
  function spark(x, y, k, d){ var w = k * .32; return '<path class="fig-star" style="--d:' + d + 's" fill="#fff" d="M' + x + ' ' + (y - k) + ' L' + (x + w) + ' ' + (y - w) + ' L' + (x + k) + ' ' + y + ' L' + (x + w) + ' ' + (y + w) + ' L' + x + ' ' + (y + k) + ' L' + (x - w) + ' ' + (y + w) + ' L' + (x - k) + ' ' + y + ' L' + (x - w) + ' ' + (y - w) + ' Z"/>'; }
  return '<svg class="' + (cls || 'fig') + ' woni-fig" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>'
    + '<radialGradient id="' + u + 'a" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#b3a8ff" stop-opacity=".4"/><stop offset="1" stop-color="#b3a8ff" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="' + u + 'b" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#f4f1ff"/><stop offset=".5" stop-color="#c4b8ff"/><stop offset="1" stop-color="#8f7df0"/></radialGradient>'
    + '</defs><circle cx="60" cy="70" r="56" fill="url(#' + u + 'a)"/>'
    + '<path d="M60 38c-6 0-8-8-2-16" fill="none" stroke="#dcd5ff" stroke-width="2.2" stroke-linecap="round"/>'
    + '<ellipse cx="45" cy="101" rx="9" ry="5" fill="#9f8ff5" opacity=".85"/><ellipse cx="75" cy="101" rx="9" ry="5" fill="#9f8ff5" opacity=".85"/>'
    + '<path d="' + body + '" fill="url(#' + u + 'b)" fill-opacity=".92" stroke="#f1edff" stroke-opacity=".7" stroke-width="1"/>'
    + '<ellipse cx="45" cy="52" rx="11" ry="6" fill="#fff" opacity=".5" transform="rotate(-22 45 52)"/>'
    + '<circle cx="47" cy="72" r="4.6" fill="#2a2058"/><circle cx="73" cy="72" r="4.6" fill="#2a2058"/><circle cx="48.6" cy="70.2" r="1.6" fill="#fff"/><circle cx="74.6" cy="70.2" r="1.6" fill="#fff"/>'
    + '<path d="M54 82q6 5 12 0" fill="none" stroke="#2a2058" stroke-width="2.2" stroke-linecap="round"/>'
    + '<path d="M70 11l2.4 5 5.4.8-3.9 3.8.9 5.4L70 23.5 65.2 26l.9-5.4-3.9-3.8 5.4-.8z" fill="#f3dca0"/>'
    + spark(20, 46, 5, '0') + spark(102, 36, 4, '.8') + spark(100, 92, 3.4, '1.6') + spark(16, 96, 3, '.4')
    + '</svg>';
}
