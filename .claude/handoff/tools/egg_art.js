/* Comic illustrations for the Real Blogs, one per story (inline SVG: ink lines, flat colour, halftone).
   Text inside uses only Georgia / Courier (system fonts), so the page snapshot drawn for the
   transition renders them exactly like the page does. */
const EGG_INK = '#1b1a1f';
const EGG_HEART = 'M0 7C-9 0-13-5-13-10C-13-15-9-18-5-18C-2.5-18-.8-16.5 0-14.5C.8-16.5 2.5-18 5-18C9-18 13-15 13-10C13-5 9 0 0 7Z';
function eggDots(id, color, size, r, opacity, angle) {
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}" fill-opacity="${opacity}"/></pattern>`;
}
function eggBurst(cx, cy, n, r0, r1, color, width, opacity) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    d += `M${(cx + Math.cos(a) * r0).toFixed(1)} ${(cy + Math.sin(a) * r0).toFixed(1)}L${(cx + Math.cos(a) * r1).toFixed(1)} ${(cy + Math.sin(a) * r1).toFixed(1)}`;
  }
  return `<path d="${d}" stroke="${color}" stroke-width="${width}" stroke-opacity="${opacity}" stroke-linecap="round"/>`;
}
const EGG_ART = {
  /* 520: a torn calendar page, and a posterior that spikes on May 20 */
  'may-20-teacher-rendezvous': `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="A calendar page for May 20 beside a chart with a single spike topped by a heart">
  <defs>${eggDots('e1d', '#d7263d', 7, 1.7, .26, 30)}${eggDots('e1k', EGG_INK, 5, 1.2, .4, 45)}</defs>
  <rect width="320" height="200" fill="#fbeedd"/><rect width="320" height="200" fill="url(#e1d)"/>
  ${eggBurst(84, 104, 22, 58, 150, '#f2b632', 9, .38)}
  <g transform="rotate(-6 84 108)" stroke="${EGG_INK}" stroke-width="3" stroke-linejoin="round">
    <rect x="34" y="52" width="104" height="112" rx="6" fill="#fffaf0"/>
    <path d="M34 80V58Q34 52 40 52H132Q138 52 138 58V80Z" fill="#d7263d"/>
    <rect x="52" y="42" width="9" height="20" rx="4.5" fill="${EGG_INK}"/><rect x="111" y="42" width="9" height="20" rx="4.5" fill="${EGG_INK}"/>
    <path d="M44 150H128" stroke-width="1.5" stroke-opacity=".3"/><path d="M44 156H110" stroke-width="1.5" stroke-opacity=".3"/>
    <path d="M138 146L124 164H138Z" fill="#efe2c6" stroke-width="2.4"/>
  </g>
  <g transform="rotate(-6 84 108)">
    <text x="86" y="74" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-weight="700" font-size="15" letter-spacing="3" fill="#fffaf0">MAY</text>
    <text x="86" y="140" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="56" fill="${EGG_INK}">20</text>
  </g>
  <g transform="translate(166 30)" stroke="${EGG_INK}" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M6 134V8M6 134H142" stroke-width="3"/><path d="M1 14L6 6L11 14M134 129L142 134L134 139" stroke-width="3"/>
    <path d="M90 128L96 30L102 128Z" fill="url(#e1k)" stroke="none"/>
    <path d="M8 124C18 122 24 127 32 122S48 125 56 120S72 124 80 118L88 116L96 30L104 116L112 119C118 122 126 117 134 120" stroke-width="3"/>
    <path d="M96 36V132" stroke="#d7263d" stroke-width="2" stroke-dasharray="4 4"/>
  </g>
  <path transform="translate(262 42) scale(1.05)" d="${EGG_HEART}" fill="#d7263d" stroke="${EGG_INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <text x="262" y="182" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-weight="700" font-size="13" fill="#d7263d">5/20</text>
  <text x="178" y="48" font-family="'Courier New', Courier, monospace" font-weight="700" font-size="10.5" fill="${EGG_INK}">p &lt; 0.05</text>
</svg>`,

  /* poker: two heart level cards back to back, E[X] = 1.37 chalked on the felt */
  'zhuo-poker-heart-level-cards': `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="Two playing cards with hearts on a green table, chalked E of X equals 1.37">
  <defs>${eggDots('e2f', '#0d3b25', 6, 1.5, .35, 20)}${eggDots('e2b', '#fffaf0', 6, 1.1, .5, 45)}</defs>
  <rect width="320" height="200" fill="#2e7a4f"/><rect width="320" height="200" fill="url(#e2f)"/>
  <ellipse cx="160" cy="210" rx="210" ry="70" fill="#256641" stroke="${EGG_INK}" stroke-width="3"/>
  <g fill="#fffaf0" fill-opacity=".75">
    <circle cx="36" cy="30" r="2.2"/><circle cx="58" cy="52" r="2.2"/><circle cx="24" cy="70" r="2.2"/><circle cx="72" cy="22" r="2.2"/><circle cx="46" cy="96" r="2.2"/>
    <circle cx="282" cy="34" r="2.2"/><circle cx="296" cy="64" r="2.2"/><circle cx="268" cy="80" r="2.2"/><circle cx="300" cy="100" r="2.2"/>
  </g>
  <g transform="rotate(-18 120 110)" stroke="${EGG_INK}" stroke-width="3" stroke-linejoin="round">
    <rect x="84" y="50" width="74" height="104" rx="8" fill="#1f5fa8"/><rect x="91" y="57" width="60" height="90" rx="4" fill="url(#e2b)" stroke-width="1.5"/>
  </g>
  <g transform="rotate(-9 150 112)" stroke="${EGG_INK}" stroke-width="3" stroke-linejoin="round">
    <rect x="112" y="54" width="76" height="108" rx="8" fill="#fffaf0"/>
    <path transform="translate(150 114) scale(1.35)" d="${EGG_HEART}" fill="#d7263d" stroke-width="2"/>
  </g>
  <g transform="rotate(9 196 112)" stroke="${EGG_INK}" stroke-width="3" stroke-linejoin="round">
    <rect x="158" y="54" width="76" height="108" rx="8" fill="#fffaf0"/>
    <path transform="translate(196 114) scale(1.35)" d="${EGG_HEART}" fill="#d7263d" stroke-width="2"/>
  </g>
  <g font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="17" fill="#d7263d">
    <text transform="rotate(-9 150 112)" x="120" y="76">2</text><text transform="rotate(9 196 112)" x="166" y="76">2</text>
  </g>
  <text x="252" y="178" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-weight="700" font-size="17" fill="#fffaf0" transform="rotate(-4 252 178)">E[X]=1.37</text>
  <path d="M206 186C230 190 262 190 292 184" stroke="#fffaf0" stroke-width="2" stroke-linecap="round" fill="none" stroke-opacity=".8"/>
</svg>`,

  /* hotpot: the red half wins, the thermometer is past MILD */
  'neural-hotpot-temperature-scaling': `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="A split hotpot, one side red with chillies, and a thermometer past mild into fire">
  <defs>${eggDots('e3d', '#e8741f', 7, 1.8, .3, 30)}${eggDots('e3k', EGG_INK, 5, 1.2, .35, 45)}</defs>
  <rect width="320" height="200" fill="#fbe7cf"/><rect width="320" height="200" fill="url(#e3d)"/>
  <g fill="none" stroke="${EGG_INK}" stroke-width="3" stroke-linecap="round" stroke-opacity=".75">
    <path d="M92 58C84 48 100 40 92 30C86 22 96 16 94 10"/><path d="M132 52C124 42 140 34 132 24C126 16 136 10 134 4"/><path d="M172 58C164 48 180 40 172 30C166 22 176 16 174 10"/>
  </g>
  <g transform="translate(-8 0)"><g stroke="${EGG_INK}" stroke-width="3" stroke-linejoin="round">
    <path d="M30 118C30 150 70 176 132 176C194 176 234 150 234 118Z" fill="#8e969f"/>
    <path d="M30 118C30 150 70 176 132 176C194 176 234 150 234 118Z" fill="url(#e3k)"/>
    <ellipse cx="132" cy="112" rx="104" ry="46" fill="#c8ccd2"/>
    <ellipse cx="132" cy="112" rx="92" ry="38" fill="#f5e6b8"/>
    <path d="M132 74C104 88 160 136 132 150C88 150 40 134 40 112C40 90 88 74 132 74Z" fill="#d7263d"/>
    <path d="M26 114L14 110M238 114L250 110" stroke-width="5" stroke-linecap="round"/>
  </g>
  <g stroke="${EGG_INK}" stroke-width="2" stroke-linejoin="round">
    <path d="M64 100C70 92 82 92 86 98C80 100 72 104 64 100Z" fill="#2f8f3e"/><path d="M66 100C60 110 62 120 70 124C74 116 76 106 76 100Z" fill="#ff5a1f"/>
    <path d="M92 118C98 110 110 112 112 118C106 120 100 124 92 118Z" fill="#2f8f3e"/><path d="M94 118C90 128 94 136 102 138C104 130 104 122 104 118Z" fill="#ff5a1f"/>
    <rect x="160" y="96" width="16" height="16" rx="2" fill="#fffaf0"/><rect x="184" y="112" width="16" height="16" rx="2" fill="#fffaf0"/>
    <circle cx="200" cy="96" r="8" fill="#a8743f"/>
  </g></g>
  <g transform="translate(276 28)" stroke="${EGG_INK}" stroke-width="3" stroke-linejoin="round">
    <rect x="-9" y="0" width="18" height="118" rx="9" fill="#fffaf0"/>
    <circle cx="0" cy="130" r="17" fill="#d7263d"/>
    <rect x="-3.5" y="10" width="7" height="116" rx="3.5" fill="#d7263d" stroke="none"/>
    <path d="M9 96H20M9 70H18M9 44H18M9 18H20" stroke-width="2"/>
  </g>
  <text x="262" y="140" text-anchor="end" font-family="'Courier New', Courier, monospace" font-weight="700" font-size="10.5" fill="${EGG_INK}">MILD</text>
  <path d="M232 138L264 130" stroke="#d7263d" stroke-width="2.6" stroke-linecap="round"/>
  <text x="262" y="50" text-anchor="end" font-family="'Courier New', Courier, monospace" font-weight="700" font-size="10.5" fill="#d7263d">FIRE</text>
  <path d="M290 10C284 0 294-6 292-14C300-6 304 2 298 10Z" fill="#ffb21f" stroke="${EGG_INK}" stroke-width="2" transform="translate(-6 16)"/>
</svg>`,

  /* cake: a pie chart you can eat; one slice scheduled away, the last strawberry already gone */
  'birthday-cake-load-balancing': `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" role="img" aria-label="A round cake cut into unequal slices, one slice pulled out with a fork, and a missing strawberry">
  <defs>${eggDots('e4d', '#e25b8a', 7, 1.7, .26, 30)}${eggDots('e4k', EGG_INK, 5, 1.1, .3, 45)}</defs>
  <rect width="320" height="200" fill="#fbe8e6"/><rect width="320" height="200" fill="url(#e4d)"/>
  <ellipse cx="132" cy="112" rx="100" ry="82" fill="#fffaf0" stroke="${EGG_INK}" stroke-width="3"/>
  <ellipse cx="132" cy="108" rx="84" ry="68" fill="#f7c6d0" stroke="${EGG_INK}" stroke-width="3"/>
  <g stroke="${EGG_INK}" stroke-width="3" stroke-linecap="round">
    <path d="M132 108L132 40"/><path d="M132 108L205 76"/><path d="M132 108L60 140"/><path d="M132 108L84 56"/><path d="M132 108L156 174"/>
  </g>
  <path d="M132 108L205 76A84 68 0 0 1 208 132Z" fill="url(#e4k)" stroke="none"/>
  <g stroke="${EGG_INK}" stroke-width="2.4" stroke-linejoin="round">
    <path d="M212 88L286 60A100 82 0 0 1 292 120Z" fill="#f7c6d0" stroke-width="3"/>
    <path d="M212 88L292 120" stroke-width="3"/>
    <circle cx="104" cy="74" r="9" fill="#d7263d"/><circle cx="160" cy="62" r="9" fill="#d7263d"/><circle cx="96" cy="126" r="9" fill="#d7263d"/><circle cx="264" cy="90" r="9" fill="#d7263d"/>
  </g>
  <circle cx="150" cy="140" r="9.5" fill="none" stroke="${EGG_INK}" stroke-width="2" stroke-dasharray="3 3"/>
  <text x="150" y="145" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="13" fill="${EGG_INK}">?</text>
  <g transform="translate(270 58) rotate(32)" stroke="${EGG_INK}" stroke-width="2.6" stroke-linejoin="round" fill="#d3d9df">
    <rect x="-3.5" y="-58" width="7" height="50" rx="3.5"/>
    <path d="M-10 -8H10V2Q10 8 4 8H-4Q-10 8-10 2Z"/>
    <path d="M-9 8V26M-3 8V26M3 8V26M9 8V26" fill="none" stroke-width="3" stroke-linecap="round"/>
  </g>
  <rect x="164" y="166" width="144" height="17" rx="2" fill="#fbe8e6"/>
  <text x="236" y="178" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-weight="700" font-size="10.5" fill="${EGG_INK}">corner piece: preempted</text>
</svg>`
};
