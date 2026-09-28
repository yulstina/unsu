var FIG_UID = 0;
var TINT = { fire:'#ffb3a1', earth:'#ffd98a', air:'#d9c2ff', water:'#9ff0e4', wood:'#b4f0c0', metal:'#eef2fa' };
function figSVG(key, el, cls){
  var f = FIG[key]; if (!f) return '';
  var u = 'f' + (++FIG_UID);
  var tint = TINT[el] || '#b6d9fc';
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
