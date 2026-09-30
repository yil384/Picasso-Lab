
const BLOG_ARROW_ICON = '<svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
const BLOG_CAL_ICON = '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
const BLOG_EXT_ICON = '<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
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

const officialBlogState = {
  label: document.querySelector('.blog-hero .label')?.innerHTML || '',
  title: document.querySelector('.blog-hero h1')?.textContent || 'Research Blog',
  desc: document.querySelector('.blog-hero p')?.textContent || '',
  list: document.getElementById('blog-list')?.innerHTML || ''
};

const officialArticleUrls = new Set([...document.querySelectorAll('#blog-list .blog-card')].map(card => card.href));

/* Back/forward (the back button, Chrome's two-finger swipe). Google Sites writes
   this page into an about:blank frame with document.write, and Chrome restores any
   history entry made in that frame as a fresh about:blank: swiping back from an
   open article or demo left the page blank. So this document never touches history
   itself. The open view lives in the fragment of a tiny hidden frame on GitHub
   Pages: opening a view navigates that frame (one entry), back/forward moves only
   that frame, and it posts back the fragment it lands on. Until it loads, views add
   no history. */
const NAV_FRAME_URL = 'https://yil384.github.io/Picasso-Lab/nav-frame.html';

function createNavHistory(onTraverse) {
  const frame = document.createElement('iframe');
  frame.id = 'picasso-nav-frame';
  frame.src = NAV_FRAME_URL;
  frame.title = 'Navigation history';
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(frame);

  const run = Math.random().toString(36).slice(2, 7);
  const pending = new Set();   // fragments we navigated to that have not reported back yet
  let ready = false;
  let seq = 0;
  let depth = 0;               // our own entries stacked above one we can go back to
  let popping = false;
  let popTimer = null;

  window.addEventListener('message', (event) => {
    if (event.source !== frame.contentWindow || typeof event.data?.picassoNav !== 'string') return;
    const hash = event.data.picassoNav;
    const first = !ready;
    ready = true;
    if (pending.delete(hash) || (first && !hash)) return;
    if (popping) popping = false;
    else depth = 0;            // the visitor moved through history: we no longer know what is behind
    const view = Object.fromEntries(new URLSearchParams(hash));
    delete view.n;
    onTraverse(view);
  });

  function go(view, push) {
    if (!ready) return;
    const params = new URLSearchParams();
    Object.entries(view).forEach(([key, value]) => { if (value != null) params.set(key, value); });
    params.set('n', run + (++seq));
    const hash = params.toString();
    pending.add(hash);
    try {
      if (push) frame.contentWindow.location.href = `${NAV_FRAME_URL}#${hash}`;
      else frame.contentWindow.location.replace(`${NAV_FRAME_URL}#${hash}`);
      if (push) depth += 1;
    } catch (_) {
      pending.delete(hash);
    }
  }

  return {
    push: view => go(view, true),
    replace: view => go(view, false),
    /* Leave a view the way the back button would when the entry behind it is ours,
       so a later swipe back leaves the page instead of landing on a duplicate. Called
       from this document, not the nav frame: the host sandboxes the embed, and a
       sandboxed frame may only move history for frames inside its own subtree. */
    pop(view) {
      if (!ready || depth === 0) return go(view, false);
      depth -= 1;
      popping = true;
      clearTimeout(popTimer);
      popTimer = setTimeout(() => { popping = false; }, 1500);   // a back() that moved nothing
      try { history.back(); } catch (_) {}
    }
  };
}

const blogNav = createNavHistory(view => syncBlogFromHistory(view, true));
let blogView = { trueBlogs: false, article: null };   // the view the current history entry holds

function recordBlogView(patch, how) {
  blogView = { ...blogView, ...patch };
  const article = blogView.article;
  blogNav[how]({
    t: blogView.trueBlogs ? '1' : null,
    a: article?.kind === 'official' ? article.url : null,
    f: article?.kind === 'fake' ? String(article.index) : null
  });
}

const fakeBlogs = [
  {
    slug: 'may-20-teacher-rendezvous',
    date: 'May 20, 2026',
    title: 'A May 20 Scheduling Anomaly: Evidence That Professor Guan Asked Professor Fang Out',
    desc: 'We build a calendar-conditioned rumor model and find that the lab gossip posterior shifts sharply when the date feature equals 520.',
    authors: 'Anonymous Lab Statistician, P. Value, Y. Lin',
    tags: ['520', 'Gossip Systems', 'Causal Romance'],
    body: [
      'Abstract: This work studies a previously underexplored scheduling anomaly: why calendar-aware agents suddenly become extremely busy on May 20.',
      'Method: We compare three baselines: random walk, deterministic coffee acquisition, and "I am just passing by" trajectory replay.',
      'Result: The 520-conditioned model rejects the null hypothesis with suspicious confidence. The reviewer notes that the data source is "everyone saw it in the hallway."',
      'Conclusion: The lab recommends future work on June 1, because the model may confuse romance signals with emergency dessert procurement.'
    ]
  },
  {
    slug: 'zhuo-poker-heart-level-cards',
    date: 'May 18, 2026',
    title: 'Two Consecutive Heart Level Cards in Poker: Calibrating Zhuo\'s Expected Level-Card Count to 1.37',
    desc: 'This note introduces Kitchen-Table Monte Carlo, an offline reconstruction of the heart-level-card streak that produces a suspiciously precise expected value of 1.37.',
    authors: 'Z. Chen, DealerNet, Table-4 Consortium',
    tags: ['Poker', 'Wild Cards', 'Monte Carlo'],
    body: [
      'We define a heart-level event as any moment where the table collectively says "how did that happen?" within 1.5 seconds of card reveal.',
      'The estimator uses 100,000 simulated dorm-table universes and one emotionally unreliable witness report.',
      'A surprising result is that 1.37 appears regardless of random seed, which strongly suggests the seed was not changed.',
      'Threats to validity include snacks, table tilt, and the possibility that Zhuo is simply built different.'
    ]
  },
  {
    slug: 'neural-hotpot-temperature-scaling',
    date: 'Apr 1, 2026',
    title: 'Neural Hotpot Temperature Scaling: Why "Mild" Converges to Fire',
    desc: 'We model hotpot broth as a non-convex optimization problem and show how social gradients amplify "just a little spicy" into a red-oil incident.',
    authors: 'Haidilao Systems Group',
    tags: ['Optimization', 'Hotpot', 'Scaling Law'],
    body: [
      'The core theorem states that spice level is not a scalar, but a distributed consensus protocol with poor failure handling.',
      'Every participant votes for mildness, yet the final soup approaches a high-temperature fixed point.',
      'We identify the culprit as repeated local updates: "one more scoop should be fine."',
      'Future work will investigate whether sesame sauce is a regularizer or merely a coping mechanism.'
    ]
  },
  {
    slug: 'birthday-cake-load-balancing',
    date: 'Feb 29, 2026',
    title: 'Birthday Cake Load Balancing: Is Leader Yu\'s Slicing Algorithm Pareto Optimal?',
    desc: 'By observing cake partitioning, fork scheduling, and corner-piece preemption, we propose CakeSched, a fair-sharing protocol for lab gatherings.',
    authors: 'CakeSched Authors',
    tags: ['Scheduling', 'Fairness', 'Cake'],
    body: [
      'CakeSched minimizes envy under the constraint that someone always says "I only want a tiny piece" and then takes a structurally important corner.',
      'The protocol assigns frosting-heavy regions using weighted round-robin, except when the birthday person overrides the scheduler.',
      'Empirically, the algorithm achieves high happiness throughput and low plate starvation.',
      'The only unresolved bug is that the last strawberry disappears before the camera is ready.'
    ]
  }
];

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

function fakeBlogCard(article, index) {
  return `
    <a class="blog-card" href="#${escapeHTML(article.slug)}" data-fake-index="${index}" aria-label="Read ${escapeHTML(article.title)}">
      <span class="egg-art" aria-hidden="true">${EGG_ART[article.slug] || ''}</span>
      <div class="card-top">
        <span class="card-date">${escapeHTML(article.date)}</span>
        <span class="card-source-pill">Classified</span>
      </div>
      <div class="card-title">${escapeHTML(article.title)}</div>
      <div class="card-desc">${escapeHTML(article.desc)}</div>
      <div class="card-bottom">
        <div class="card-authors">${escapeHTML(article.authors)}</div>
        <div class="card-tags">${article.tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join('')}</div>
      </div>
      <div class="card-cta">Read the leak ${BLOG_ARROW_ICON}</div>
    </a>`;
}

/* Google Sites injects a capture-phase click handler into the embed that swallows
   every <a href="#…"> click, so the fake cards never opened there. The window's
   capture phase runs before it. */
window.addEventListener('click', (event) => {
  const card = event.target.closest?.('.blog-card[data-fake-index]');
  if (!card) return;
  event.stopPropagation();
  openFakeArticle(event, Number(card.dataset.fakeIndex));
}, true);

let previousArticleFocus = null;

/* Reusing one iframe made every article after the first add a nested history
   entry, so the Blogs button's history.back() only blanked the frame instead of
   returning to the list. A fresh iframe per article keeps the article's own
   navigations out of the joint session history. */
function mountArticleFrame() {
  const shell = document.querySelector('.article-shell');
  const loading = document.getElementById('article-loading');
  document.getElementById('article-frame')?.remove();

  const frame = document.createElement('iframe');
  frame.id = 'article-frame';
  frame.title = 'Blog article preview';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.addEventListener('load', () => {
    if (frame.dataset.navigated === '1') loading.classList.add('hidden');
  });
  shell.insertBefore(frame, loading);
  return frame;
}

function openArticle(event, url, fromHistory = false) {
  event?.preventDefault();
  if (!url) return;

  const view = document.getElementById('article-view');
  const loading = document.getElementById('article-loading');
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/[?#].*$/, '').replace(/\/$/, '');

  document.getElementById('article-url-text').textContent = displayUrl;
  const openTab = document.getElementById('article-open-tab');
  openTab.href = url;
  openTab.classList.remove('unavailable');
  loading.classList.remove('hidden');

  if (!view.classList.contains('active')) previousArticleFocus = document.activeElement;
  view.classList.add('active');
  view.setAttribute('aria-hidden', 'false');
  document.body.classList.add('article-open');
  view.dataset.articleKey = `official:${url}`;
  if (!fromHistory && (blogView.article?.kind !== 'official' || blogView.article.url !== url)) {
    recordBlogView({ article: { kind: 'official', url } }, 'push');
  }

  const frame = mountArticleFrame();
  const frameUrl = new URL(url);
  frameUrl.searchParams.set('embed', 'lab');
  frame.src = frameUrl.toString();
  frame.dataset.navigated = '1';
  requestAnimationFrame(() => view.querySelector('.article-back')?.focus({ preventScroll: true }));
}

function openFakeArticle(event, index, fromHistory = false) {
  event?.preventDefault();
  const article = fakeBlogs[index];
  if (!article) return;
  const view = document.getElementById('article-view');
  const loading = document.getElementById('article-loading');
  const displayUrl = `picasso-lab.internal/true-blogs/${article.slug}`;

  document.getElementById('article-url-text').textContent = displayUrl;
  const openTab = document.getElementById('article-open-tab');
  openTab.removeAttribute('href');
  openTab.classList.add('unavailable');
  loading.classList.remove('hidden');
  if (!view.classList.contains('active')) previousArticleFocus = document.activeElement;
  view.classList.add('active');
  view.setAttribute('aria-hidden', 'false');
  document.body.classList.add('article-open');
  view.dataset.articleKey = `fake:${index}`;
  if (!fromHistory && (blogView.article?.kind !== 'fake' || blogView.article.index !== index)) {
    recordBlogView({ article: { kind: 'fake', index } }, 'push');
  }

  const frame = mountArticleFrame();
  frame.srcdoc = fakeArticleHTML(article);
  frame.dataset.navigated = '1';
  requestAnimationFrame(() => view.querySelector('.article-back')?.focus({ preventScroll: true }));
}

function fakeArticleHTML(article) {
  const [first, ...rest] = article.body;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<link href="${EGG_FONT_CSS}" rel="stylesheet">
<style>
  :root { --ink: #1b1a1f; --red: #d7263d; --mute: #5d544c; }
  * { box-sizing: border-box; }
  body {
    margin: 0; color: var(--ink); background-color: #f1e8d4;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .29 0 0 0 0 .2 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E");
    font-family: Georgia, 'Times New Roman', serif; line-height: 1.62; -webkit-font-smoothing: antialiased;
  }
  article { max-width: 780px; margin: 0 auto; padding: 30px 22px calc(80px + env(safe-area-inset-bottom)); }
  .flag { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-top: 3px solid var(--ink); border-bottom: 1px solid var(--ink);
    font: 600 11px/1.4 'IBM Plex Mono', ui-monospace, Menlo, monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--mute); }
  .kicker { margin: 22px 0 8px; font: 600 12px/1.3 'IBM Plex Mono', ui-monospace, Menlo, monospace; letter-spacing: .2em; text-transform: uppercase; color: var(--red); }
  h1 { margin: 0 0 12px; font-family: 'Playfair Display', Georgia, serif; font-weight: 900; font-size: clamp(2rem, 5.4vw, 3.3rem); line-height: 1.04; letter-spacing: -.02em; }
  .deck { margin: 0 0 14px; font-style: italic; font-size: 1.12rem; color: #3f3934; }
  .byline { margin: 0 0 22px; padding-bottom: 12px; border-bottom: 1px solid var(--ink); font: 500 12px/1.5 'IBM Plex Mono', ui-monospace, Menlo, monospace; color: var(--mute); }
  figure { margin: 0 0 24px; }
  .art { aspect-ratio: 16 / 10; border: 2px solid var(--ink); box-shadow: 6px 6px 0 var(--ink); background: #fbf1dc; overflow: hidden; }
  .art svg { display: block; width: 100%; height: 100%; }
  figcaption { margin-top: 12px; font: 500 11px/1.5 'IBM Plex Mono', ui-monospace, Menlo, monospace; color: var(--mute); }
  .copy { columns: 2 260px; column-gap: 30px; column-rule: 1px solid rgba(27,26,31,.22); }
  .copy p { margin: 0 0 14px; font-size: 16.5px; }
  .copy p:first-child::first-letter { float: left; margin: 6px 8px 0 0; font-family: 'Playfair Display', Georgia, serif; font-weight: 900; font-size: 3.5em; line-height: .8; color: var(--red); }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 22px 0 0; }
  .tags span { padding: 3px 7px; border: 1.5px solid var(--ink); font: 600 10.5px/1.2 'IBM Plex Mono', ui-monospace, Menlo, monospace; letter-spacing: .08em; text-transform: uppercase; }
  .note { margin: 28px 0 0; padding: 14px 16px; border: 2.5px solid var(--red); border-radius: 4px; color: var(--red); background: rgba(215,38,61,.05);
    font: 600 13px/1.55 'IBM Plex Mono', ui-monospace, Menlo, monospace; transform: rotate(-.8deg); }
  @media (max-width: 600px) {
    article { padding: 20px 16px calc(64px + env(safe-area-inset-bottom)); }
    .flag span:nth-child(2) { display: none; }
    .deck { font-size: 1.02rem; }
    .copy p { font-size: 16px; }
  }
</style>
</head>
<body>
<article>
  <div class="flag"><span>The Real Blogs</span><span>Picasso Lab &middot; Classified edition</span><span>${escapeHTML(article.date)}</span></div>
  <div class="kicker">Leaked from the hallway</div>
  <h1>${escapeHTML(article.title)}</h1>
  <p class="deck">${escapeHTML(article.desc)}</p>
  <div class="byline">By ${escapeHTML(article.authors)}</div>
  <figure><div class="art">${EGG_ART[article.slug] || ''}</div><figcaption>Fig. 1 &mdash; the evidence, as submitted to Reviewer 2.</figcaption></figure>
  <div class="copy">
    <p>${escapeHTML(first)}</p>
    ${rest.map(para => `<p>${escapeHTML(para)}</p>`).join('')}
  </div>
  <div class="tags">${article.tags.map(tag => `<span>${escapeHTML(tag)}</span>`).join('')}</div>
  <div class="note">Reviewer 2: statistically questionable, socially useful, and therefore accepted.</div>
</article>
</body>
</html>`;
}

function closeArticle(fromHistory = false) {
  const view = document.getElementById('article-view');
  const loading = document.getElementById('article-loading');
  const wasOpen = view.classList.contains('active');

  /* Close first: dropping the iframe also drops its history entries, so the
     back() below always pops our own entry and never strands an open viewer. */
  document.getElementById('article-frame')?.remove();
  view.classList.remove('active');
  view.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('article-open');
  delete view.dataset.articleKey;
  loading.classList.remove('hidden');
  if (wasOpen && previousArticleFocus && typeof previousArticleFocus.focus === 'function') {
    previousArticleFocus.focus({ preventScroll: true });
  }

  if (!fromHistory && blogView.article) {
    recordBlogView({ article: null }, 'pop');
  }
}

function renderTrueBlogs() {
  eggFonts();
  document.body.classList.add('true-blogs');
  const label = document.querySelector('.blog-hero .label');
  if (label) label.textContent = 'Picasso Lab \u00b7 Classified edition';
  const title = document.querySelector('.blog-hero h1');
  if (title) title.textContent = 'The Real Blogs';
  const desc = document.querySelector('.blog-hero p');
  if (desc) desc.textContent = 'Peer-reviewed lab folklore, suspicious statistics, and reproducible nonsense from the hallway.';
  window.scrollTo(0, 0);
  document.getElementById('blog-list').innerHTML = fakeBlogs.map(fakeBlogCard).join('');
}

function renderOfficialBlogs() {
  document.body.classList.remove('true-blogs');
  const label = document.querySelector('.blog-hero .label');
  if (label) label.innerHTML = officialBlogState.label;
  const title = document.querySelector('.blog-hero h1');
  if (title) title.textContent = officialBlogState.title;
  const desc = document.querySelector('.blog-hero p');
  if (desc) desc.textContent = officialBlogState.desc;
  document.getElementById('blog-list').innerHTML = officialBlogState.list;
}

/* ════════════════════════════════════════════════════════════════════════
   Transitions between the official blog and the Real Blogs (three.js)

   Official -> Real ("shatter"): a CLASSIFIED stamp slams onto the page, the page
   cracks into cubist facets (Voronoi cells, inked edges) that flip over in a wave
   from the stamp and land as the tabloid.
   Real -> Official ("crumple"): the tabloid is crumpled into a paper ball and
   tossed off-screen, uncovering the official blog underneath.

   Both run on a snapshot of what is on screen (eggSnapshot paints the live DOM
   into a canvas), so they start and end exactly on the real page at any size.
   three.js loads on intent (the first key press or tap), never for visitors who
   don't look for the egg. No WebGL / no three.js / reduced motion -> a paper wipe
   or an instant switch.
   ════════════════════════════════════════════════════════════════════════ */
const EGG_THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';
const EGG_FONT_CSS = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Playfair+Display:wght@800;900&display=swap';
let eggThreePromise = null;
let eggFontsPromise = null;

function eggFonts() {
  if (!eggFontsPromise) {
    eggFontsPromise = new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = EGG_FONT_CSS;
      link.onload = () => {
        Promise.all(['800 20px "Playfair Display"', '900 40px "Playfair Display"',
          '500 12px "IBM Plex Mono"', '600 12px "IBM Plex Mono"'].map(f => document.fonts.load(f)))
          .then(resolve, resolve);
      };
      link.onerror = resolve;
      document.head.appendChild(link);
    });
  }
  return eggFontsPromise;
}
function eggThree() {
  if (!eggThreePromise) eggThreePromise = import(EGG_THREE_URL).catch(() => null);
  return eggThreePromise;
}
function eggPreload() { eggFonts(); eggThree(); }
function eggWithin(promise, ms) {
  return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(undefined), ms))]);
}
function eggFrame() { return new Promise(resolve => requestAnimationFrame(() => resolve())); }
function eggWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) { return false; }
}
function eggViewport() {
  return { W: document.documentElement.clientWidth || innerWidth, H: document.documentElement.clientHeight || innerHeight };
}

/* ── snapshot: paint what is on screen into a canvas ─────────────────────── */
function eggSplitTop(str) {
  const out = []; let depth = 0; let cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
function eggColorStops(parts, gradient) {
  parts.forEach((part, i) => {
    const m = part.match(/^(rgba?\([^)]*\)|#[0-9a-f]+|transparent)\s*(-?[\d.]+%)?/i);
    if (!m) return;
    const color = m[1] === 'transparent' ? 'rgba(0,0,0,0)' : m[1];
    const pos = m[2] ? parseFloat(m[2]) / 100 : (parts.length > 1 ? i / (parts.length - 1) : 0);
    try { gradient.addColorStop(Math.min(1, Math.max(0, pos)), color); } catch (_) {}
  });
}
function eggGradient(g, spec, x, y, w, h) {
  let m = spec.match(/^linear-gradient\((.*)\)$/);
  if (m) {
    const parts = eggSplitTop(m[1]);
    let angle = 180;
    if (/deg$/.test(parts[0])) angle = parseFloat(parts.shift());
    else if (/^to /.test(parts[0])) angle = { 'to top': 0, 'to right': 90, 'to bottom': 180, 'to left': 270 }[parts.shift()] ?? 180;
    const a = angle * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a);
    const len = Math.abs(w * dx) + Math.abs(h * dy);
    const cx = x + w / 2, cy = y + h / 2;
    const gr = g.createLinearGradient(cx - dx * len / 2, cy - dy * len / 2, cx + dx * len / 2, cy + dy * len / 2);
    eggColorStops(parts, gr);
    return gr;
  }
  m = spec.match(/^radial-gradient\((.*)\)$/);
  if (m) {
    const parts = eggSplitTop(m[1]);
    if (!/^(rgb|#|transparent)/i.test(parts[0])) parts.shift();
    const cx = x + w / 2, cy = y + h / 2;
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(w, h) / 2);
    eggColorStops(parts, gr);
    return gr;
  }
  return null;
}
function eggRoundRect(g, x, y, w, h, r) {
  g.beginPath();
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  if (g.roundRect) g.roundRect(x, y, w, h, r);
  else g.rect(x, y, w, h);
}
function eggVisible(color) {
  return color && color !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(color);
}

async function eggSnapshot() {
  const { W, H } = eggViewport();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d');
  const ops = [];
  const loads = [];
  const range = document.createRange();

  function loadImage(src) {
    const img = new Image();
    loads.push(new Promise(resolve => { img.onload = img.onerror = resolve; }));
    img.src = src;
    return img;
  }

  function paintBackground(cs, x, y, w, h, radius) {
    if (eggVisible(cs.backgroundColor)) {
      const color = cs.backgroundColor;
      ops.push(() => { g.fillStyle = color; eggRoundRect(g, x, y, w, h, radius); g.fill(); });
    }
    if (cs.backgroundImage && cs.backgroundImage !== 'none') {
      eggSplitTop(cs.backgroundImage).reverse().forEach(layer => {
        const url = layer.match(/^url\("?(.*?)"?\)$/);
        if (url) {
          const img = loadImage(url[1]);
          ops.push(() => {
            if (!img.naturalWidth) return;
            const pattern = g.createPattern(img, 'repeat');
            if (!pattern) return;
            g.save(); eggRoundRect(g, x, y, w, h, radius); g.clip();
            g.translate(x, y); g.fillStyle = pattern; g.fillRect(0, 0, w, h);
            g.restore();
          });
        } else {
          ops.push(() => {
            const fill = eggGradient(g, layer, x, y, w, h);
            if (!fill) return;
            g.fillStyle = fill; eggRoundRect(g, x, y, w, h, radius); g.fill();
          });
        }
      });
    }
  }

  function paintBox(cs, r) {
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const shadow = cs.boxShadow;
    if (shadow && shadow !== 'none') {
      const first = eggSplitTop(shadow)[0];
      if (!/inset/.test(first)) {
        const color = (first.match(/rgba?\([^)]*\)/) || ['rgba(0,0,0,.2)'])[0];
        const [ox = 0, oy = 0, blur = 0, spread = 0] = (first.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
        ops.push(() => {
          g.save();
          if (blur < 0.5) {
            g.fillStyle = color;
            eggRoundRect(g, r.left + ox - spread, r.top + oy - spread, r.width + spread * 2, r.height + spread * 2, radius);
            g.fill();
          } else {
            g.shadowColor = color; g.shadowBlur = blur * dpr; g.shadowOffsetX = ox * dpr; g.shadowOffsetY = oy * dpr;
            g.fillStyle = eggVisible(cs.backgroundColor) ? cs.backgroundColor : '#fff';
            eggRoundRect(g, r.left - spread, r.top - spread, r.width + spread * 2, r.height + spread * 2, radius);
            g.fill();
          }
          g.restore();
        });
      }
    }
    paintBackground(cs, r.left, r.top, r.width, r.height, radius);
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map(s => [parseFloat(cs[`border${s}Width`]) || 0, cs[`border${s}Color`], cs[`border${s}Style`]]);
    if (!sides.some(([w, c, st]) => w > 0 && eggVisible(c) && st !== 'none')) return;
    const uniform = sides.every(([w, c, st]) => w === sides[0][0] && c === sides[0][1] && st === sides[0][2]);
    if (uniform) {
      const [w, c] = sides[0];
      ops.push(() => {
        g.strokeStyle = c; g.lineWidth = w;
        eggRoundRect(g, r.left + w / 2, r.top + w / 2, r.width - w, r.height - w, Math.max(0, radius - w / 2));
        g.stroke();
      });
    } else {
      ops.push(() => {
        const [[t, tc, ts], [rt, rc, rs], [b, bc, bs], [l, lc, ls]] = sides;
        if (t && ts !== 'none' && eggVisible(tc)) { g.fillStyle = tc; g.fillRect(r.left, r.top, r.width, t); }
        if (b && bs !== 'none' && eggVisible(bc)) { g.fillStyle = bc; g.fillRect(r.left, r.bottom - b, r.width, b); }
        if (l && ls !== 'none' && eggVisible(lc)) { g.fillStyle = lc; g.fillRect(r.left, r.top, l, r.height); }
        if (rt && rs !== 'none' && eggVisible(rc)) { g.fillStyle = rc; g.fillRect(r.right - rt, r.top, rt, r.height); }
      });
    }
  }

  function paintPseudo(el, which, r, cs) {
    const ps = getComputedStyle(el, which);
    if (!ps || ps.content === 'none' || ps.display === 'none' || ps.position !== 'absolute') return;
    const w = parseFloat(ps.width), h = parseFloat(ps.height);
    if (!(w > 0 && h > 0)) return;
    const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
    const x = ps.left !== 'auto' ? r.left + bl + parseFloat(ps.left) : r.right - (parseFloat(cs.borderRightWidth) || 0) - parseFloat(ps.right) - w;
    const y = ps.top !== 'auto' ? r.top + bt + parseFloat(ps.top) : r.bottom - (parseFloat(cs.borderBottomWidth) || 0) - parseFloat(ps.bottom) - h;
    paintBackground(ps, x, y, w, h, parseFloat(ps.borderTopLeftRadius) || 0);
  }

  function paintText(node, cs) {
    const text = node.nodeValue;
    if (!text || !/\S/.test(text)) return;
    const words = [];
    const re = /\S+/g;
    let m;
    while ((m = re.exec(text))) {
      range.setStart(node, m.index); range.setEnd(node, m.index + m[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      if (rects.length === 1) { words.push([m[0], rects[0]]); continue; }
      for (let i = 0; i < m[0].length; i++) {   // a word broken across lines
        range.setStart(node, m.index + i); range.setEnd(node, m.index + i + 1);
        const cr = range.getClientRects()[0];
        if (cr) words.push([m[0][i], cr]);
      }
    }
    if (!words.length) return;
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const color = cs.color;
    const transform = cs.textTransform;
    const spacing = cs.letterSpacing;
    ops.push(() => {
      g.font = font; g.fillStyle = color; g.textBaseline = 'alphabetic';
      if ('letterSpacing' in g) g.letterSpacing = spacing === 'normal' ? '0px' : spacing;
      const metrics = g.measureText('Hg');
      const ascent = metrics.fontBoundingBoxAscent;
      for (const [word, rc] of words) {
        if (rc.bottom < 0 || rc.top > H) continue;
        const s = transform === 'uppercase' ? word.toUpperCase() : transform === 'lowercase' ? word.toLowerCase() : word;
        g.fillText(s, rc.left, rc.top + (ascent || rc.height * 0.8));
      }
    });
  }

  function paintSvg(el, r) {
    const clone = el.cloneNode(true);
    const src = el.querySelectorAll('*');
    const dst = clone.querySelectorAll('*');
    // icons are styled from the page CSS (stroke: currentColor ...): carry the computed values over
    for (let i = 0; i < src.length; i++) {
      const s = getComputedStyle(src[i]);
      ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].forEach(p => {
        const v = s.getPropertyValue(p);
        if (v) dst[i].setAttribute(p, v);
      });
    }
    const top = getComputedStyle(el);
    ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'].forEach(p => {
      const v = top.getPropertyValue(p);
      if (v && !clone.hasAttribute(p)) clone.setAttribute(p, v);
    });
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', r.width);
    clone.setAttribute('height', r.height);
    const img = loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone)));
    ops.push(() => { if (img.naturalWidth) g.drawImage(img, r.left, r.top, r.width, r.height); });
  }

  function walk(el) {
    if (el.nodeType !== 1) return;
    if (el.hasAttribute('data-nopaint') || /^(SCRIPT|STYLE|LINK|IFRAME|TEMPLATE|NOSCRIPT)$/.test(el.tagName)) return;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (cs.position === 'fixed') return;                 // overlays, hints, the article viewer
    const opacity = parseFloat(cs.opacity);
    if (opacity < 0.02) return;
    const r = el.getBoundingClientRect();
    const clips = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
    if ((r.bottom < -60 || r.top > H + 60) && clips) return;
    ops.push(() => { g.save(); g.globalAlpha *= opacity; });
    paintBox(cs, r);
    if (clips) {
      const radius = parseFloat(cs.borderTopLeftRadius) || 0;
      ops.push(() => { eggRoundRect(g, r.left, r.top, r.width, r.height, radius); g.clip(); });
    }
    paintPseudo(el, '::before', r, cs);
    if (el instanceof SVGSVGElement) paintSvg(el, r);
    else if (el.tagName === 'IMG') {
      ops.push(() => { try { if (el.complete && el.naturalWidth) g.drawImage(el, r.left, r.top, r.width, r.height); } catch (_) {} });
    } else {
      for (const child of el.childNodes) {
        if (child.nodeType === 3) paintText(child, cs);
        else walk(child);
      }
    }
    paintPseudo(el, '::after', r, cs);
    ops.push(() => g.restore());
  }

  const bodyStyle = getComputedStyle(document.body);
  const htmlStyle = getComputedStyle(document.documentElement);
  ops.push(() => { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); });
  paintBackground(htmlStyle, 0, 0, W, H, 0);
  paintBackground(bodyStyle, 0, 0, W, H, 0);
  for (const child of document.body.childNodes) {
    if (child.nodeType === 3) paintText(child, bodyStyle);
    else walk(child);
  }
  await Promise.all(loads);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const op of ops) { try { op(); } catch (_) {} }
  return canvas;
}

/* ── shared three.js bits ─────────────────────────────────────────────────── */
function eggLayer(front) {
  const layer = document.createElement('div');
  layer.className = 'egg-fx';
  layer.setAttribute('data-nopaint', '');
  layer.setAttribute('aria-hidden', 'true');
  front.classList.add('egg-cover');
  layer.appendChild(front);                  // the snapshot covers the page while the DOM changes under it
  document.body.appendChild(layer);
  return layer;
}
function eggStage(THREE, layer, W, H, transparent) {
  const canvas = document.createElement('canvas');
  const fx = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  fx.width = Math.round(W * dpr); fx.height = Math.round(H * dpr);
  layer.insertBefore(canvas, layer.firstChild);
  layer.appendChild(fx);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.setSize(W, H, false);
  renderer.setClearColor(transparent ? 0x000000 : 0xe9dfc8, transparent ? 0 : 1);
  const fov = 30;
  const dist = (H / 2) / Math.tan(fov * Math.PI / 360);
  const camera = new THREE.PerspectiveCamera(fov, W / H, 10, dist * 6);
  camera.position.set(0, 0, dist);
  const scene = new THREE.Scene();
  const g = fx.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { renderer, camera, scene, dist, canvas, fx, g, dpr };
}
function eggTexture(THREE, canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}
function eggStampCanvas(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 300;
  const g = c.getContext('2d');
  const red = '#d7263d';
  g.strokeStyle = red; g.fillStyle = red;
  g.lineWidth = 18; eggRoundRect(g, 20, 20, 984, 260, 28); g.stroke();
  g.lineWidth = 6; eggRoundRect(g, 48, 48, 928, 204, 14); g.stroke();
  g.font = '600 132px "IBM Plex Mono", "Courier New", monospace';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '14px';
  g.fillText(text, 519, 156);
  // worn rubber: knock out specks and a few dry streaks
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 1400; i++) {
    g.globalAlpha = Math.random() * 0.9;
    g.beginPath();
    g.arc(Math.random() * 1024, Math.random() * 300, Math.random() * Math.random() * 5 + 0.4, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 0.5; g.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    const y = 40 + Math.random() * 220;
    g.beginPath(); g.moveTo(Math.random() * 300, y); g.lineTo(600 + Math.random() * 424, y + (Math.random() - 0.5) * 30); g.stroke();
  }
  return c;
}
function eggEase(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function eggClamp01(t) { return Math.max(0, Math.min(1, t)); }
function eggRun(duration, live, frame) {
  return new Promise(resolve => {
    let t0 = null;                                  // the first frame's timestamp: t starts at 0 on screen
    function tick(now) {
      if (!live()) return resolve(false);
      if (t0 === null) t0 = now;
      // window.__eggClock lets a test hold the film at chosen times (seconds); unset in normal use
      const t = Math.min(duration, typeof window.__eggClock === 'function' ? window.__eggClock() : (now - t0) / 1000);
      frame(t);
      if (t >= duration) return resolve(true);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
function eggDispose(stage, layer, extras = []) {
  try {
    extras.forEach(x => x && x.dispose && x.dispose());
    stage && stage.scene.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose && o.material.dispose(); });
    stage && stage.renderer.dispose();
    stage && stage.renderer.forceContextLoss();
  } catch (_) {}
  layer && layer.remove();
}
/* comic focus lines around a point (redrawn "on twos") */
function eggFocusLines(g, W, H, cx, cy, strength, frameNo) {
  if (strength <= 0) return;
  let seed = Math.floor(frameNo / 2) * 9301 + 49297;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const n = W < 600 ? 40 : 60;
  const inner = Math.min(W, H) * (0.3 + 0.25 * (1 - strength));   // the lines retreat to the edges as they fade
  const outer = Math.hypot(W, H);
  g.fillStyle = '#1b1a1f';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.09;
    const w = (0.0025 + rnd() * 0.006) * Math.PI;
    const r0 = inner * (0.85 + rnd() * 0.5);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    g.lineTo(cx + Math.cos(a - w) * outer, cy + Math.sin(a - w) * outer);
    g.lineTo(cx + Math.cos(a + w) * outer, cy + Math.sin(a + w) * outer);
    g.closePath();
    g.fill();
  }
}

/* ── official -> Real Blogs: stamp, crack, cubist flip ────────────────────── */
const EGG_SHARD_VERT = `
  attribute vec3 aCenter;
  attribute float aEdge;
  attribute vec4 aParam;          // delay, flip axis angle, lift, spin
  uniform float uTime;
  uniform float uDur;
  varying vec2 vUv;
  varying float vEdge;
  varying float vFacing;
  varying float vFlip;
  varying float vLift;
  vec3 rotAxis(vec3 v, vec3 a, float ang) {
    float c = cos(ang), s = sin(ang);
    return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c);
  }
  void main() {
    float p = clamp((uTime - aParam.x) / uDur, 0.0, 1.0);
    float e = p < 0.5 ? 4.0 * p * p * p : 1.0 - pow(-2.0 * p + 2.0, 3.0) / 2.0;
    vec3 ax = vec3(cos(aParam.y), sin(aParam.y), 0.0);
    vec3 o = position;
    // after a half turn about an in-plane axis a shard is its own mirror image; morph to the mirror
    // while it is edge-on, so it lands exactly on its own cell
    vec3 m = 2.0 * dot(o, ax) * ax - o;
    vec3 lp = mix(o, m, smoothstep(0.42, 0.58, e));
    float ang = 3.14159265 * e;
    vec3 wp = rotAxis(lp, ax, ang);
    vec3 n = rotAxis(vec3(0.0, 0.0, 1.0), ax, ang);
    float sp = aParam.w * sin(3.14159265 * e);
    float cs = cos(sp), sn = sin(sp);
    wp.xy = mat2(cs, sn, -sn, cs) * wp.xy;
    n.xy = mat2(cs, sn, -sn, cs) * n.xy;
    float lift = aParam.z * sin(3.14159265 * e);
    wp += aCenter + vec3(0.0, 0.0, lift);
    vUv = uv;
    vEdge = aEdge;
    vFacing = abs(n.z);
    vFlip = e;
    vLift = lift;
  #ifdef SHADOW
    // a hard comic shadow on the page, offset down-right by the height
    wp = vec3(wp.xy + vec2(0.16, -0.2) * wp.z, -1.0);
  #endif
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }`;
const EGG_SHARD_FRAG = `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uInk;
  uniform float uImpact;
  uniform float uDpr;
  varying vec2 vUv;
  varying float vEdge;
  varying float vFacing;
  varying float vFlip;
  varying float vLift;
  void main() {
    vec3 ink = vec3(0.106, 0.102, 0.122);
  #ifdef SHADOW
    gl_FragColor = vec4(ink, 0.3 * smoothstep(2.0, 40.0, vLift));
  #else
    // the half turn is past edge-on: the new page is facing us
    vec4 c = vFlip > 0.5 ? texture2D(uBack, vUv) : texture2D(uFront, vUv);
    // tilted away from the light: one toon step and a halftone
    float dark = 1.0 - smoothstep(0.3, 0.98, vFacing);
    vec2 gp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / (4.0 * uDpr);
    float d = length(fract(gp) - 0.5);
    float dots = 1.0 - smoothstep(dark * 0.5 - 0.05, dark * 0.5, d);
    vec3 col = c.rgb * (1.0 - 0.07 * step(0.45, dark));
    col = mix(col, ink, dots * 0.26 * step(0.05, dark));
    // inked cell edges (each neighbour draws half of the line)
    float w = fwidth(vEdge);
    float edge = 1.0 - smoothstep(w * 0.5, w * 1.3, vEdge);
    col = mix(col, ink, edge * uInk);
    // impact frame: posterised and inverted for a couple of frames
    if (uImpact > 0.5) {
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(0.97, 0.94, 0.86), ink, step(0.6, l));
    }
    gl_FragColor = vec4(col, 1.0);
  #endif
  }`;

async function eggShatter(THREE, front, back, layer, live) {
  const { W, H } = eggViewport();
  const stage = eggStage(THREE, layer, W, H, false);
  const { renderer, camera, scene, dist, g } = stage;
  const small = Math.min(W, H);

  // impact: on the masthead, where the stamp lands
  const ix = W / 2;
  const iy = Math.max(130, Math.min(420, H * 0.4));

  // front + a copy with the stamp already inked on it (swapped in at the hit)
  const stamp = eggStampCanvas('CLASSIFIED');
  const stampW = Math.min(W * 0.8, 560);
  const stampH = stampW * stamp.height / stamp.width;
  const inked = document.createElement('canvas');
  inked.width = front.width; inked.height = front.height;
  const ig = inked.getContext('2d');
  ig.drawImage(front, 0, 0);
  ig.save();
  ig.scale(front.width / W, front.height / H);
  ig.translate(ix, iy); ig.rotate(-8 * Math.PI / 180);
  ig.globalAlpha = 0.92; ig.globalCompositeOperation = 'multiply';
  ig.drawImage(stamp, -stampW / 2, -stampH / 2, stampW, stampH);
  ig.restore();

  const texFront = eggTexture(THREE, front);
  const texInked = eggTexture(THREE, inked);
  const texBack = eggTexture(THREE, back);
  const texStamp = eggTexture(THREE, stamp);

  // cubist cells: denser around the hit
  const count = Math.max(38, Math.min(110, Math.round(W * H / 7200)));
  const sites = [];
  for (let i = 0; i < count; i++) {
    if (i < count * 0.42) {
      const a = Math.random() * Math.PI * 2, r = Math.abs((Math.random() + Math.random() + Math.random() - 1.5) / 1.5) * small * 0.55;
      sites.push([Math.min(W - 1, Math.max(1, ix + Math.cos(a) * r)), Math.min(H - 1, Math.max(1, iy + Math.sin(a) * r * 0.8))]);
    } else sites.push([Math.random() * W, Math.random() * H]);
  }
  const clip = (poly, mx, my, nx, ny) => {
    const out = [];
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const da = (a[0] - mx) * nx + (a[1] - my) * ny, db = (b[0] - mx) * nx + (b[1] - my) * ny;
      if (da <= 0) out.push(a);
      if ((da <= 0) !== (db <= 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return out;
  };
  const pos = [], cen = [], uvs = [], edge = [], par = [];
  const maxD = Math.hypot(Math.max(ix, W - ix), Math.max(iy, H - iy));
  const T_HIT = 0.22;
  sites.forEach((s, i) => {
    let poly = [[0, 0], [W, 0], [W, H], [0, H]];
    for (let j = 0; j < sites.length && poly.length >= 3; j++) {
      if (j === i) continue;
      const o = sites[j];
      poly = clip(poly, (s[0] + o[0]) / 2, (s[1] + o[1]) / 2, o[0] - s[0], o[1] - s[1]);
    }
    if (poly.length < 3) return;
    let A = 0, cx = 0, cy = 0;
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length], cr = a[0] * b[1] - b[0] * a[1];
      A += cr; cx += (a[0] + b[0]) * cr; cy += (a[1] + b[1]) * cr;
    }
    if (Math.abs(A) < 1) return;
    cx /= 3 * A; cy /= 3 * A;
    const d = Math.hypot(cx - ix, cy - iy) / maxD;
    const dir = Math.atan2(-(cy - iy), cx - ix);                     // world space (y up)
    const axis = dir + Math.PI / 2 + (Math.random() - 0.5) * 0.7;    // flip away from the hit
    const delay = T_HIT + 0.05 + d * 0.42 + Math.random() * 0.07;
    const lift = (70 + Math.random() * 120) * (small / 800 + 0.35);
    const spin = (Math.random() - 0.5) * 0.7;
    const wc = [cx - W / 2, H / 2 - cy, 0];
    for (let k = 0; k < poly.length; k++) {
      const tri = [[cx, cy, 1], [poly[k][0], poly[k][1], 0], [poly[(k + 1) % poly.length][0], poly[(k + 1) % poly.length][1], 0]];
      // keep the triangle counter-clockwise in world space so its front faces the camera
      if (A > 0) tri.reverse();
      for (const [px, py, e] of tri) {
        pos.push(px - cx, -(py - cy), 0);
        cen.push(...wc);
        uvs.push(px / W, 1 - py / H);
        edge.push(e);
        par.push(delay, axis, lift, spin);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aCenter', new THREE.Float32BufferAttribute(cen, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1));
  geo.setAttribute('aParam', new THREE.Float32BufferAttribute(par, 4));
  const DUR = 0.62;
  const mat = new THREE.ShaderMaterial({
    vertexShader: EGG_SHARD_VERT,
    fragmentShader: EGG_SHARD_FRAG,
    side: THREE.DoubleSide,
    extensions: { derivatives: true },
    uniforms: {
      uTime: { value: 0 }, uDur: { value: DUR },
      uFront: { value: texFront }, uBack: { value: texBack },
      uInk: { value: 0 }, uImpact: { value: 0 }, uDpr: { value: stage.dpr }
    }
  });
  const shards = new THREE.Mesh(geo, mat);
  shards.frustumCulled = false;
  shards.renderOrder = 1;
  scene.add(shards);
  const shadowMat = new THREE.ShaderMaterial({
    vertexShader: EGG_SHARD_VERT,
    fragmentShader: EGG_SHARD_FRAG,
    defines: { SHADOW: '' },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    uniforms: mat.uniforms
  });
  const shadows = new THREE.Mesh(geo, shadowMat);
  shadows.frustumCulled = false;
  shadows.renderOrder = 0;
  scene.add(shadows);

  const stampMesh = new THREE.Mesh(new THREE.PlaneGeometry(stampW, stampH),
    new THREE.MeshBasicMaterial({ map: texStamp, transparent: true, depthTest: false, opacity: 0 }));
  stampMesh.position.set(ix - W / 2, H / 2 - iy, dist * 0.8);
  stampMesh.rotation.z = -8 * Math.PI / 180;
  stampMesh.renderOrder = 2;
  scene.add(stampMesh);

  const lastLand = Math.max(...par.filter((_, i) => i % 4 === 0)) + DUR;
  const END = lastLand + 0.06;
  [texFront, texInked, texBack, texStamp].forEach(t => renderer.initTexture(t));
  renderer.render(scene, camera);
  layer.querySelector('.egg-cover')?.remove();

  let frameNo = 0;
  const ok = await eggRun(END, live, (t) => {
    frameNo++;
    mat.uniforms.uTime.value = t;
    // the stamp drops in from above the page and hits at T_HIT
    const s = eggClamp01(t / T_HIT);
    stampMesh.material.opacity = t < T_HIT ? Math.min(1, s * 3) : 0;
    stampMesh.position.z = 1 + (1 - s * s) * dist * 0.8;
    stampMesh.visible = t < T_HIT;
    mat.uniforms.uFront.value = t < T_HIT ? texFront : texInked;
    mat.uniforms.uImpact.value = t >= T_HIT && t < T_HIT + 0.045 ? 1 : 0;
    mat.uniforms.uInk.value = eggClamp01((t - T_HIT) / 0.1) * (1 - eggClamp01((t - (END - 0.3)) / 0.26));
    // camera: shake at the hit, a slow push and a dutch tilt through the flip, back to rest at the end
    const k = Math.sin(Math.PI * eggClamp01((t - T_HIT) / (END - T_HIT)));
    const shake = t > T_HIT ? Math.exp(-(t - T_HIT) * 14) * small * 0.012 : 0;
    camera.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, dist * (1 - 0.05 * k));
    camera.rotation.z = -0.035 * k;
    renderer.render(scene, camera);
    g.clearRect(0, 0, W, H);
    eggFocusLines(g, W, H, ix, iy, t >= T_HIT ? 1 - eggClamp01((t - T_HIT) / 0.34) : 0, frameNo);
  });
  if (ok) {
    stage.canvas.classList.add('egg-fade');
    stage.canvas.style.opacity = '0';
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  eggDispose(stage, layer, [texFront, texInked, texBack, texStamp]);
}

/* ── Real Blogs -> official: crumple into a ball, toss it away ───────────── */
const EGG_PAPER_VERT = `
  uniform float uC;
  uniform vec3 uG;
  uniform vec3 uBall;
  uniform float uR;
  uniform float uSpin;
  uniform float uLift;
  uniform vec2 uHalf;
  varying vec2 vUv;
  varying vec3 vW;
  varying float vC;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    vec3 p0 = position;
    vec2 d = p0.xy - uG.xy;
    // distance to the sheet's edge in this direction: every edge ends up on the back of the ball
    vec2 dir = d / max(length(d), 0.001);
    float tx = dir.x > 0.0001 ? (uHalf.x - uG.x) / dir.x : dir.x < -0.0001 ? (-uHalf.x - uG.x) / dir.x : 1e9;
    float ty = dir.y > 0.0001 ? (uHalf.y - uG.y) / dir.y : dir.y < -0.0001 ? (-uHalf.y - uG.y) / dir.y : 1e9;
    float rn = clamp(length(d) / max(min(tx, ty), 1.0), 0.0, 1.0);
    float c = clamp(uC * 1.4 - rn * 0.4, 0.0, 1.0);       // the middle goes first, the edges follow
    c = c * c * (3.0 - 2.0 * c);
    float n1 = vnoise(p0.xy * 0.02) - 0.5;
    float n2 = vnoise(p0.xy * 0.047 + 7.0) - 0.5;
    float th = 3.14159 * rn * 0.97 + n1 * 0.7 * c;
    float ph = atan(d.y, d.x) + n2 * 0.9 * c;
    vec3 s = vec3(sin(th) * cos(ph), sin(th) * sin(ph), cos(th));
    float cs = cos(uSpin), sn = sin(uSpin);
    s = vec3(cs * s.x - sn * s.z, s.y, sn * s.x + cs * s.z);
    float c2 = cos(uSpin * 0.6), s2 = sin(uSpin * 0.6);
    s.xy = mat2(c2, s2, -s2, c2) * s.xy;
    vec3 ball = uBall + s * uR * (1.0 + 0.3 * n1 + 0.16 * n2);
    vec3 rest = p0 + vec3(0.0, 0.0, uLift * (1.0 - rn));
    vec3 wp = mix(rest, ball, c);
    wp.z += sin(3.14159 * c) * (n1 * 110.0 + n2 * 60.0) * (1.0 - rn * 0.4);
    vUv = uv;
    vW = wp;
    vC = c;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }`;
const EGG_PAPER_FRAG = `
  uniform sampler2D uTex;
  uniform float uDpr;
  varying vec2 vUv;
  varying vec3 vW;
  varying float vC;
  void main() {
    vec3 n = normalize(cross(dFdx(vW), dFdy(vW)));
    if (n.z < 0.0) n = -n;
    vec3 L = normalize(vec3(-0.45, 0.55, 0.72));
    float lit = dot(n, L) / 0.72;                          // 1 on the flat sheet
    vec3 ink = vec3(0.106, 0.102, 0.122);
    vec3 paper = gl_FrontFacing ? texture2D(uTex, vUv).rgb : vec3(0.95, 0.92, 0.85);
    float band = lit > 0.9 ? 1.0 : lit > 0.55 ? 0.92 : 0.8;
    vec3 col = paper * mix(1.0, band, smoothstep(0.0, 0.08, vC));
    float dark = (1.0 - smoothstep(0.45, 0.95, lit)) * smoothstep(0.0, 0.1, vC);
    vec2 gp = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / (4.5 * uDpr);
    float dots = 1.0 - smoothstep(dark * 0.6 - 0.05, dark * 0.6, length(fract(gp) - 0.5));
    col = mix(col, ink, dots * 0.38 * step(0.02, dark));
    float crease = length(fwidth(n));
    col = mix(col, ink, smoothstep(0.55, 1.2, crease) * 0.7 * smoothstep(0.05, 0.25, vC));
    gl_FragColor = vec4(col, 1.0);
  }`;

async function eggCrumple(THREE, front, layer, live) {
  const { W, H } = eggViewport();
  const stage = eggStage(THREE, layer, W, H, true);
  const { renderer, camera, scene, g } = stage;
  const small = Math.min(W, H);
  const tex = eggTexture(THREE, front);
  const sx = Math.max(24, Math.min(72, Math.round(W / 14)));
  const sy = Math.max(24, Math.min(110, Math.round(H / 14)));
  const geo = new THREE.PlaneGeometry(W, H, sx, sy);
  const G = new THREE.Vector3(W * 0.08, -H * 0.04, 0);   // grab point, a little right of centre
  const R = Math.max(40, Math.min(100, small * 0.12));
  const exit = new THREE.Vector3(-W / 2 - R * 3, H / 2 + R * 2.2, 60);
  const mat = new THREE.ShaderMaterial({
    vertexShader: EGG_PAPER_VERT,
    fragmentShader: EGG_PAPER_FRAG,
    side: THREE.DoubleSide,
    extensions: { derivatives: true },
    uniforms: {
      uC: { value: 0 }, uG: { value: G }, uBall: { value: G.clone() }, uR: { value: R },
      uSpin: { value: 0 }, uLift: { value: 0 }, uTex: { value: tex }, uDpr: { value: stage.dpr },
      uHalf: { value: new THREE.Vector2(W / 2, H / 2) }
    }
  });
  const paper = new THREE.Mesh(geo, mat);
  paper.frustumCulled = false;
  scene.add(paper);
  renderer.initTexture(tex);
  renderer.render(scene, camera);
  layer.querySelector('.egg-cover')?.remove();

  const END = 1.04;
  const toScreen = (v) => [v.x + W / 2, H / 2 - v.y];
  let frameNo = 0;
  await eggRun(END, live, (t) => {
    frameNo++;
    const lift = eggClamp01(t / 0.14);
    mat.uniforms.uLift.value = 36 * Math.sin(lift * Math.PI / 2);
    const c = 1 - Math.pow(1 - eggClamp01((t - 0.03) / 0.5), 2.4);   // a quick squeeze that tightens
    mat.uniforms.uC.value = c;
    const toss = eggClamp01((t - 0.5) / 0.5);
    const k = toss * toss * (3 - 2 * toss);
    const ball = new THREE.Vector3().lerpVectors(G, exit, k);
    ball.y += Math.sin(Math.PI * k) * H * 0.16;
    ball.z = 40 + Math.sin(Math.PI * Math.min(1, k * 1.2)) * 140;
    mat.uniforms.uBall.value.copy(ball);
    mat.uniforms.uSpin.value = c * 1.2 + toss * toss * 9;
    renderer.render(scene, camera);
    // soft shadow of the ball on the page, and a whoosh behind it
    g.clearRect(0, 0, W, H);
    if (c > 0.2) {
      const [bx, by] = toScreen(ball);
      const hgt = eggClamp01((ball.z - 30) / 160);
      g.save();
      g.globalAlpha = 0.28 * (1 - hgt * 0.6) * eggClamp01((c - 0.2) / 0.3);
      g.fillStyle = '#0b1b2a';
      g.beginPath();
      g.ellipse(bx + R * (0.25 + hgt * 0.8), by + R * (0.9 + hgt * 1.4), R * (1.05 + hgt * 0.3), R * 0.34, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    if (toss > 0.04 && toss < 0.97) {
      const pathAt = (kk) => {
        const p = new THREE.Vector3().lerpVectors(G, exit, Math.max(0, kk));
        p.y += Math.sin(Math.PI * Math.max(0, kk)) * H * 0.16;
        return toScreen(p);
      };
      const [hx, hy] = pathAt(k);
      const [tx, ty] = pathAt(k - 0.04);
      const len = Math.hypot(hx - tx, hy - ty) || 1;
      const nx = -(hy - ty) / len, ny = (hx - tx) / len;
      g.save();
      g.strokeStyle = '#1b1a1f';
      g.lineCap = 'round';
      [-0.75, -0.25, 0.3, 0.8].forEach((off, j) => {
        g.globalAlpha = 0.7 - Math.abs(off) * 0.25;
        g.lineWidth = 2.6 - Math.abs(off);
        g.beginPath();
        for (let i = 0; i <= 10; i++) {
          const [x, y] = pathAt(k - 0.03 - i * (0.018 + j * 0.004));
          const o = off * R * (1 - i / 14);
          if (i === 0) g.moveTo(x + nx * o, y + ny * o); else g.lineTo(x + nx * o, y + ny * o);
        }
        g.stroke();
      });
      g.restore();
    }
  });
  eggDispose(stage, layer, [tex]);
}

/* no WebGL: a paper-coloured iris wipe */
async function eggWipe(toTrue, live) {
  const wipe = document.createElement('div');
  wipe.className = 'egg-wipe' + (toTrue ? '' : ' official');
  wipe.setAttribute('data-nopaint', '');
  document.body.appendChild(wipe);
  await eggFrame(); await eggFrame();
  wipe.classList.add('cover');
  await new Promise(resolve => setTimeout(resolve, 440));
  if (live()) {
    if (toTrue) renderTrueBlogs(); else renderOfficialBlogs();
    window.scrollTo(0, 0);
  }
  wipe.style.transition = 'opacity .3s ease';
  wipe.style.opacity = '0';
  await new Promise(resolve => setTimeout(resolve, 320));
  wipe.remove();
}

const blogMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
let desiredTrueBlogs = false;
let blogTransitionToken = 0;
let blogTransitionTarget = null;   // the state a running transition is heading to

function blockScrollDuringTransition(event) {
  if (document.body.classList.contains('blog-transitioning')) event.preventDefault();
}
window.addEventListener('wheel', blockScrollDuringTransition, { passive: false });
window.addEventListener('touchmove', blockScrollDuringTransition, { passive: false });

function renderBlogMode(toTrue) {
  if (toTrue) renderTrueBlogs();
  else renderOfficialBlogs();
  window.scrollTo(0, 0);
}

function reconcileBlogMode(animate = true) {
  // leaving the Real Blogs pops our history entry, and the nav frame then reports the entry it
  // landed on: that echo asks for the state we are already animating to, so let the film play on
  if (blogTransitionTarget === desiredTrueBlogs) return;
  const token = ++blogTransitionToken;
  blogTransitionTarget = null;
  document.querySelectorAll('.egg-fx, .egg-wipe').forEach(el => el.remove());   // a newer request wins at once
  const currentlyTrue = document.body.classList.contains('true-blogs');
  if (currentlyTrue === desiredTrueBlogs) {
    document.body.classList.remove('blog-transitioning', 'egg-hold-fonts');
    return;
  }
  const articleOpen = document.getElementById('article-view').classList.contains('active');
  if (!animate || blogMotionQuery.matches || articleOpen) {
    document.body.classList.remove('blog-transitioning', 'egg-hold-fonts');
    renderBlogMode(desiredTrueBlogs);
    return;
  }
  hideBlogTypeHint();
  runEggTransition(desiredTrueBlogs, token);
}

async function runEggTransition(toTrue, token) {
  const live = () => token === blogTransitionToken;
  blogTransitionTarget = toTrue;
  document.body.classList.add('blog-transitioning');
  try {
    eggPreload();
    const THREE = await eggWithin(eggThree(), 1500);
    await eggWithin(eggFonts(), 600);
    if (!live()) return;
    const fontsIn = document.fonts.check('900 40px "Playfair Display"') && document.fonts.check('600 12px "IBM Plex Mono"');
    if (!fontsIn) document.body.classList.add('egg-hold-fonts');
    if (!THREE || !eggWebGL()) { await eggWipe(toTrue, live); return; }
    const front = await eggSnapshot();
    if (!live()) return;
    const layer = eggLayer(front);            // covers the page with its own picture
    renderBlogMode(toTrue);                   // the DOM changes underneath
    await eggFrame();
    const back = toTrue ? await eggSnapshot() : null;
    if (!live()) { layer.remove(); return; }
    if (toTrue) await eggShatter(THREE, front, back, layer, live);
    else await eggCrumple(THREE, front, layer, live);
  } catch (err) {
    console.warn('Real Blogs transition skipped:', err);
    document.querySelectorAll('.egg-fx, .egg-wipe').forEach(el => el.remove());
    if (live() && document.body.classList.contains('true-blogs') !== toTrue) renderBlogMode(toTrue);
  } finally {
    if (live()) {
      blogTransitionTarget = null;
      document.body.classList.remove('blog-transitioning', 'egg-hold-fonts');
    }
  }
}

function startBlogSecretTransition(fromHistory = false) {
  desiredTrueBlogs = true;
  if (!fromHistory && !blogView.trueBlogs) {
    recordBlogView({ trueBlogs: true, article: null }, 'push');
  }
  reconcileBlogMode(true);
}

function startBlogReturnTransition() {
  desiredTrueBlogs = false;
  reconcileBlogMode(true);
}

function requestBlogReturn() {
  if (blogView.trueBlogs) {
    recordBlogView({ trueBlogs: false, article: null }, 'pop');
  }
  desiredTrueBlogs = false;
  reconcileBlogMode(true);
}

const blogTypeHint = document.getElementById('blog-type-hint');
const blogTypeHintMarkup = blogTypeHint.innerHTML;
let blogHintTimer = null;
let blogBuffer = '';
let blogKeyboardPrimed = false;

function showBlogTypeHint() {
  blogTypeHint.innerHTML = blogTypeHintMarkup;
  blogTypeHint.classList.add('show');
  clearTimeout(blogHintTimer);
  blogHintTimer = setTimeout(() => blogTypeHint.classList.remove('show'), 2600);
}

function showBlogTapHint(remaining) {
  blogTypeHint.textContent = remaining === 1
    ? 'One more tap to open the hidden blogs'
    : 'Tap the header twice more';
  blogTypeHint.classList.add('show');
  clearTimeout(blogHintTimer);
  blogHintTimer = setTimeout(() => blogTypeHint.classList.remove('show'), 1100);
}

function hideBlogTypeHint() {
  clearTimeout(blogHintTimer);
  blogTypeHint.classList.remove('show');
}

// Mobile counterpart to typing "picasso": three quick taps on the hero.
function installPicassoTripleTap(target, activate) {
  if (!target) return;
  let press = null;
  let taps = 0;
  let firstTapAt = 0;
  let lastX = 0;
  let lastY = 0;
  let resetTimer = null;
  const reset = () => {
    press = null;
    taps = 0;
    firstTapAt = 0;
    clearTimeout(resetTimer);
  };

  target.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' || event.isPrimary === false) return;
    if (event.target.closest?.('a, button, input, textarea, select, video, [contenteditable="true"]')) return;
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() };
    eggPreload();
  });
  target.addEventListener('pointerup', (event) => {
    if (!press || press.id !== event.pointerId) return;
    const start = press;
    press = null;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 18 || performance.now() - start.at > 420) {
      reset();
      return;
    }

    const now = performance.now();
    if (!taps || now - firstTapAt > 950 || Math.hypot(event.clientX - lastX, event.clientY - lastY) > 56) {
      taps = 1;
      firstTapAt = now;
    } else {
      taps += 1;
    }
    lastX = event.clientX;
    lastY = event.clientY;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(reset, Math.max(120, 980 - (now - firstTapAt)));
    if (taps < 3) showBlogTapHint(3 - taps);
    if (taps === 3) {
      reset();
      activate();
    }
  });
  target.addEventListener('pointercancel', reset);
}

installPicassoTripleTap(document.querySelector('.blog-hero'), () => {
  if (document.body.classList.contains('true-blogs')) requestBlogReturn();
  else startBlogSecretTransition();
});

/* Back/forward landed on another view: show it without recording it again. */
function syncBlogFromHistory(view, animate = true) {
  const articleView = document.getElementById('article-view');
  const fakeIndex = Number(view.f);
  let articleState = null;
  if (officialArticleUrls.has(view.a)) articleState = { kind: 'official', url: view.a };
  else if (view.f != null && fakeBlogs[fakeIndex]) articleState = { kind: 'fake', index: fakeIndex };
  blogView = { trueBlogs: view.t === '1', article: articleState };

  if (!articleState && articleView.classList.contains('active')) {
    closeArticle(true);
  }

  desiredTrueBlogs = blogView.trueBlogs;
  reconcileBlogMode(animate);

  if (articleState?.kind === 'official' && articleState.url) {
    const key = `official:${articleState.url}`;
    if (articleView.dataset.articleKey !== key) {
      openArticle(null, articleState.url, true);
    }
  } else if (
    articleState?.kind === 'fake' &&
    Number.isInteger(articleState.index) &&
    fakeBlogs[articleState.index]
  ) {
    const key = `fake:${articleState.index}`;
    if (articleView.dataset.articleKey !== key) {
      openFakeArticle(null, articleState.index, true);
    }
  }
}

function primeBlogKeyboardCapture() {
  if (!document.body) return;
  if (document.activeElement?.closest?.('input, textarea, [contenteditable="true"]')) return;
  if (!document.body.hasAttribute('tabindex')) document.body.tabIndex = -1;
  try {
    document.body.focus({ preventScroll: true });
    blogKeyboardPrimed = true;
  } catch (_) {}
}

window.addEventListener('load', () => setTimeout(primeBlogKeyboardCapture, 0), { once: true });
window.addEventListener('pageshow', () => setTimeout(primeBlogKeyboardCapture, 0));
window.addEventListener('focus', primeBlogKeyboardCapture);
document.addEventListener('pointerenter', primeBlogKeyboardCapture);
document.addEventListener('mousemove', () => {
  if (!blogKeyboardPrimed) primeBlogKeyboardCapture();
}, { once: true });

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && document.getElementById('article-view').classList.contains('active')) {
    closeArticle();
    return;
  }
  if (event.target?.closest?.('input, textarea, [contenteditable="true"]')) return;
  if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
  blogKeyboardPrimed = true;
  eggPreload();
  blogBuffer = (blogBuffer + event.key.toLowerCase()).slice(-7);
  if (blogBuffer.endsWith('picasso') || blogBuffer.endsWith('picaso')) {
    blogBuffer = '';
    if (document.body.classList.contains('true-blogs')) requestBlogReturn();
    else startBlogSecretTransition();
    return;
  }
  if (blogBuffer.length >= 2) showBlogTypeHint();
}, true);
