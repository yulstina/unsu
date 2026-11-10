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

/* 우니 별자리 일러스트 — 별자리 그림(figSVG)과 같은 결: 반투명 구아슈 면 + 가는 선 + 별 마디 + 별빛.
   첫 화면·사주 입력 화면의 큰 그림으로 쓴다. 120×120 좌표계 */
function woniFigSVG(cls){
  var u = 'wf' + (++FIG_UID);
  var body = 'M60 38c22 0 38 15 38 36c0 18-16 30-38 30S22 92 22 74c0-21 16-36 38-36z';
  var st = [[60,38,2.6],[98,74,1.7],[60,104,1.7],[22,74,1.7],[78,49,1.3],[42,49,1.3],[89,95,1.2],[31,95,1.2],[46,67,1.5],[74,67,1.5],[60,79,1.2],[70,10,3.4],[45,101,1.4],[75,101,1.4],[37,79,1.1],[83,79,1.1]];
  var links = [[0,4],[4,1],[1,6],[6,2],[2,7],[7,3],[3,5],[5,0],[0,11],[8,14],[9,15],[2,12],[2,13]];
  var s = '<svg class="' + (cls || 'fig') + ' woni-fig" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>'
    + '<radialGradient id="' + u + 'a" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#b3a8ff" stop-opacity=".42"/><stop offset=".6" stop-color="#b3a8ff" stop-opacity=".1"/><stop offset="1" stop-color="#b3a8ff" stop-opacity="0"/></radialGradient>'
    + '<radialGradient id="' + u + 'g"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".3" stop-color="#d9d2ff" stop-opacity=".45"/><stop offset="1" stop-color="#b3a8ff" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="' + u + 'l" gradientUnits="userSpaceOnUse" x1="0" y1="30" x2="0" y2="105"><stop offset="0" stop-color="#f1edff"/><stop offset="1" stop-color="#b3a8ff"/></linearGradient>'
    + '<linearGradient id="' + u + 'f" gradientUnits="userSpaceOnUse" x1="0" y1="38" x2="0" y2="104"><stop offset="0" stop-color="#e3dcff" stop-opacity=".38"/><stop offset="1" stop-color="#9d8cf5" stop-opacity=".08"/></linearGradient>'
    + '<filter id="' + u + 'n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -.6 1.1" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>'
    + '</defs><circle cx="60" cy="68" r="58" fill="url(#' + u + 'a)"/>';
  s += '<g filter="url(#' + u + 'n)" fill="url(#' + u + 'f)"><path d="' + body + '"/><ellipse cx="45" cy="101" rx="9" ry="5"/><ellipse cx="75" cy="101" rx="9" ry="5"/></g>';
  s += '<g fill="none" stroke="url(#' + u + 'l)" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".9">'
    + '<path d="' + body + '" stroke-width=".9"/><path d="M60 38c-6 0-8-8-2-16" stroke-width=".8"/>'
    + '<ellipse cx="45" cy="101" rx="9" ry="5" stroke-width=".7" stroke-opacity=".6"/><ellipse cx="75" cy="101" rx="9" ry="5" stroke-width=".7" stroke-opacity=".6"/>'
    + '<path d="M40 66q6 -7 12 0M68 66q6 -7 12 0" stroke-width=".9"/><path d="M52 77q8 9 16 0" stroke-width=".9"/></g>';
  s += '<g stroke="#fff" stroke-width=".45" stroke-opacity=".55">';
  links.forEach(function(p){ var a = st[p[0]], b = st[p[1]]; s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '"/>'; });
  s += '</g>';
  st.forEach(function(p, i){
    var x = p[0], y = p[1], r = p[2];
    s += '<g class="fig-star" style="--d:' + (i * 0.37 % 2.4).toFixed(2) + 's"><circle cx="' + x + '" cy="' + y + '" r="' + (r * 4.5) + '" fill="url(#' + u + 'g)"/>';
    if (r >= 2.4){ var k = r * 3.4, w = r * .4; s += '<path fill="#f3dca0" d="M' + x + ' ' + (y - k) + ' L' + (x + w) + ' ' + (y - w) + ' L' + (x + k) + ' ' + y + ' L' + (x + w) + ' ' + (y + w) + ' L' + x + ' ' + (y + k) + ' L' + (x - w) + ' ' + (y + w) + ' L' + (x - k) + ' ' + y + ' L' + (x - w) + ' ' + (y - w) + ' Z"/>'; }
    s += '<circle cx="' + x + '" cy="' + y + '" r="' + r * .75 + '" fill="#fff"/></g>';
  });
  return s + '</svg>';
}
