// Generates a publicly shareable 1200 x 630 PNG from our real WP logo.
// Usage: NODE_PATH=/tmp/washpilot-social-deps/node_modules node scripts/generate-social-card.cjs
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

(async () => {
  const root = path.resolve(__dirname, '..');
  const logo = fs.readFileSync(path.join(root, 'wp-management-white.svg'), 'utf8');
  const pathMatch = logo.match(/<path\b[^>]*\/>/);
  if (!pathMatch) throw new Error('Cannot locate the official white WP Management Solutions vector logo.');
  const logoShape = pathMatch[0];

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">',
    '<defs>',
    ' <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#05182F"/><stop offset="0.58" stop-color="#0C2445"/><stop offset="1" stop-color="#162E5A"/></linearGradient>',
    ' <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2187FF"/><stop offset="1" stop-color="#29DAFC"/></linearGradient>',
    ' <radialGradient id="glow"><stop offset="0" stop-color="#1B61F2" stop-opacity=".25"/><stop offset="1" stop-color="#1B61F2" stop-opacity="0"/></radialGradient>',
    ' <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#000B20" flood-opacity=".38"/></filter>',
    '</defs>',
    '<rect width="1200" height="630" fill="url(#bg)"/>',
    '<circle cx="1098" cy="66" r="355" fill="url(#glow)"/>',
    '<circle cx="1006" cy="577" r="312" fill="url(#glow)" opacity=".7"/>',
    '<g opacity=".17" stroke="#8FB7E9" stroke-width="1"><path d="M0 586H1200"/><path d="M0 588H1200"/></g>',
    // Real logo: one existing source reused, never redrawn or changed.
    '<g transform="translate(59 41) scale(.315)">', logoShape, '</g>',
    '<text x="75" y="323" font-family="DejaVu Sans,Arial,sans-serif" font-size="46" font-weight="700" letter-spacing="-1.7" fill="#FFFFFF">Run your carwash.</text>',
    '<text x="75" y="388" font-family="DejaVu Sans,Arial,sans-serif" font-size="52" font-weight="800" letter-spacing="-2.0" fill="#64BBFF">All in one place.</text>',
    '<text x="78" y="442" font-family="DejaVu Sans,Arial,sans-serif" font-size="21" fill="#C9D9F0">Digital POS  &#8226;  Online Booking  &#8226;  Service Queue</text>',
    '<rect x="74" y="503" width="395" height="55" rx="27.5" fill="url(#accent)"/>',
    '<text x="105" y="539" font-family="DejaVu Sans,Arial,sans-serif" font-size="17" font-weight="700" letter-spacing=".4" fill="#061C37">START FREE  &#8226;  7-DAY PREMIUM TRIAL</text>',
    '<g filter="url(#shadow)">',
    '<rect x="738" y="123" width="411" height="405" rx="29" fill="#122F54" stroke="#375B87" stroke-width="1.6"/>',
    '<text x="774" y="174" font-family="DejaVu Sans,Arial,sans-serif" font-size="17" font-weight="700" letter-spacing="1" fill="#A9CEFF">YOUR SERVICE WORKFLOW</text>',
    '<rect x="773" y="205" width="340" height="78" rx="14" fill="#1B3A65" stroke="#37618D" stroke-width=".8"/>',
    '<circle cx="801" cy="245" r="11" fill="#FFBD38"/>',
    '<text x="827" y="237" font-family="DejaVu Sans,Arial,sans-serif" font-size="19" font-weight="700" fill="#FFFFFF">Online Booking</text>',
    '<text x="828" y="258" font-family="DejaVu Sans,Arial,sans-serif" font-size="14" fill="#B3C9E5">Waiting for service</text>',
    '<rect x="773" y="299" width="340" height="78" rx="14" fill="#1B3A65" stroke="#37618D" stroke-width=".8"/>',
    '<circle cx="801" cy="339" r="11" fill="#62B6FF"/>',
    '<text x="827" y="331" font-family="DejaVu Sans,Arial,sans-serif" font-size="19" font-weight="700" fill="#FFFFFF">In Progress</text>',
    '<text x="828" y="353" font-family="DejaVu Sans,Arial,sans-serif" font-size="14" fill="#B3C9E5">Track every job</text>',
    '<rect x="773" y="393" width="340" height="78" rx="14" fill="#1B3A65" stroke="#37618D" stroke-width=".8"/>',
    '<circle cx="801" cy="433" r="11" fill="#42D7A2"/>',
    '<text x="827" y="425" font-family="DejaVu Sans,Arial,sans-serif" font-size="19" font-weight="700" fill="#FFFFFF">Ready for Pickup</text>',
    '<text x="828" y="447" font-family="DejaVu Sans,Arial,sans-serif" font-size="14" fill="#B3C9E5">Keep customers moving</text>',
    '</g>',
    '</svg>'
  ].join('\n');

  const outfile = path.join(root, 'washpilot-social-preview.png');
  const info = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outfile);
  if (info.width !== 1200 || info.height !== 630) throw new Error('Unexpected image dimensions');
  console.log('Social preview generated:', outfile, info.width + 'x' + info.height, info.size + ' bytes');
})().catch((e) => { console.error(e); process.exitCode = 1; });
