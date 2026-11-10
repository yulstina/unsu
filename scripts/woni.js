/* 운이 캐릭터 정적 SVG (앱 아이콘·시작 화면·상단 로고 공용). app.js petSVG('happy', 2)와 같은 모양 */
function woni(id){
  return '<defs><radialGradient id="' + id + 'b" cx="38%" cy="30%" r="75%"><stop offset="0" stop-color="#eef3ff"/><stop offset=".45" stop-color="#b9a8ff"/><stop offset="1" stop-color="#6a45f0"/></radialGradient></defs>' +
    '<path d="M60 38c-6 0-8-8-2-16" fill="none" stroke="#c9b9ff" stroke-width="2.6" stroke-linecap="round"/><circle cx="70" cy="18" r="9" fill="#f3dca0" opacity=".25"/>' +
    '<path d="M70 10l2.4 5 5.4.8-3.9 3.8.9 5.4L70 22.5 65.2 25l.9-5.4-3.9-3.8 5.4-.8z" fill="#f3dca0"/>' +
    '<ellipse cx="45" cy="101" rx="9" ry="5" fill="#5b3be8"/><ellipse cx="75" cy="101" rx="9" ry="5" fill="#5b3be8"/>' +
    '<path d="M60 36c22 0 38 15 38 36c0 18-16 30-38 30S22 90 22 72c0-21 16-36 38-36z" fill="url(#' + id + 'b)"/>' +
    '<ellipse cx="45" cy="50" rx="11" ry="6" fill="#fff" opacity=".55" transform="rotate(-22 45 50)"/>' +
    '<ellipse cx="37" cy="79" rx="6.5" ry="4" fill="#ff8fb1" opacity=".45"/><ellipse cx="83" cy="79" rx="6.5" ry="4" fill="#ff8fb1" opacity=".45"/>' +
    '<circle cx="46" cy="67" r="4.8" fill="#221a4a"/><circle cx="74" cy="67" r="4.8" fill="#221a4a"/><circle cx="47.6" cy="65.3" r="1.6" fill="#fff"/><circle cx="75.6" cy="65.3" r="1.6" fill="#fff"/>' +
    '<path d="M52 77q8 9 16 0z" fill="#3a1d5c"/>';
}
const icon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>' +
  '<radialGradient id="bg1" cx=".3" cy=".15" r=".9"><stop offset="0" stop-color="#3b2f78"/><stop offset=".55" stop-color="#1a1540"/><stop offset="1" stop-color="#0d0b1e"/></radialGradient>' +
  '<radialGradient id="bg2" cx=".85" cy=".95" r=".7"><stop offset="0" stop-color="#8cd6c8" stop-opacity=".35"/><stop offset="1" stop-color="#8cd6c8" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="gl" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="#a593ff" stop-opacity=".55"/><stop offset="1" stop-color="#a593ff" stop-opacity="0"/></radialGradient></defs>' +
  '<rect width="512" height="512" fill="url(#bg1)"/><rect width="512" height="512" fill="url(#bg2)"/>' +
  '<circle cx="256" cy="280" r="210" fill="url(#gl)"/>' +
  '<g fill="#fff"><circle cx="96" cy="110" r="4" opacity=".8"/><circle cx="420" cy="140" r="3" opacity=".6"/><circle cx="430" cy="380" r="2.5" opacity=".5"/><circle cx="80" cy="400" r="3" opacity=".5"/></g>' +
  '<g transform="translate(46 50) scale(3.5)">' + woni('w') + '</g></svg>';
module.exports = { woni, icon };
if (require.main === module) require('fs').writeFileSync(require('path').join(__dirname, '../public/icon.svg'), icon);
