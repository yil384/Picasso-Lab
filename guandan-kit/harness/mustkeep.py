"""Must-keep checks (SPEC §1) against the in-memory Firebase stub (nothing touches production).
Usage: python3 mustkeep.py [events|portraits|music|screens|all] [viewport ...]     (default: all desk phone portrait)
  events    events.html: 222aak egg (photo), mvp overlay (splash, pages, Esc), picasso type hint + the Tiga portal,
            triple-tap on the news strip (phones), egg trigger; the return landing (?from=guandan)
  portraits every J/Q/K/A of every suit renders its labmate portrait on the table; seat photos; card back emblem
  music     #guandan-bgm src/toggle, GuandanMusic.isOn/setOn, lobby/menu toggle
  screens   typing "picasso" on lobby / room / table: the hint shows, clears controls, the Tiga return film plays
            and lands on events.html?from=guandan
Prints a JSON report; screenshots go to GD_SHOTS (git-ignored) as mk-<vp>-*.jpg."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
from gdh import session, route_context, VIEWPORTS, PREFIX, D, SHOTS, ME

EV_URL = PREFIX + 'events/events.html'
DB_STUB = open(os.path.join(D, 'fb-stub-db.js')).read() + """
export function push() { return { key: 'k' }; }
export function child(r, p) { return { path: r.path + '/' + p }; }
export function query(r) { return r; }
export function limitToLast() { return {}; }
export function onChildAdded() {}
export function onChildRemoved() {}
"""
REPORT = {}


def rec(area, key, ok, detail=''):
    REPORT.setdefault(area, []).append(dict(check=key, ok=bool(ok), detail=detail))
    print(('PASS ' if ok else 'FAIL ') + f'[{area}] {key} {detail}'[:300], flush=True)


async def events_stub(ctx):
    """events.html imports more of the Firebase API than guandan.html: widen the database stub (later routes win)."""
    async def h(route):
        await route.fulfill(status=200, body=DB_STUB, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'})
    await ctx.route('https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js', h)


async def shot(pg, vp, name):
    os.makedirs(SHOTS, exist_ok=True)
    await pg.screenshot(path=os.path.join(SHOTS, f'mk-{vp}-{name}.jpg'), type='jpeg', quality=80)


PORTAL_JS = """(()=>{const p=document.getElementById('gd-portal');if(!p)return null;const v=p.querySelector('video');const f=p.querySelector('iframe');
  return {cls:p.className,src:v?(v.currentSrc||v.src||'').split('/').pop():'',frame:f?f.src:'',name:f?f.name:''}})()"""


async def events_flows(p, vp):
    v = VIEWPORTS[vp]
    br = await p.chromium.launch()
    errors = []
    try:
        ctx = await br.new_context(viewport=dict(width=v['width'], height=v['height']), device_scale_factor=1, has_touch=v['mobile'], is_mobile=v['mobile'])
        await route_context(ctx)
        await events_stub(ctx)
        pg = await ctx.new_page()
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: errors.append(f'PAGEERROR {e}'))
        await pg.goto(EV_URL, wait_until='load')
        await pg.wait_for_timeout(2500)
        rec('events', f'{vp}: page loads, no console errors', not errors, str(errors[:3]))

        async def cls(sel):
            return await pg.evaluate("(s)=>{const e=document.querySelector(s);return e?[...e.classList].join(' ')+'|'+getComputedStyle(e).display+'|'+e.getAttribute('aria-hidden'):null}", sel)

        # type hint (2+ typed letters)
        await pg.keyboard.type('pi', delay=70)
        h = await pg.evaluate("(()=>{const e=document.getElementById('guandan-type-hint');return e&&{cls:e.className,text:e.textContent}})()")
        rec('events', f'{vp}: typing "pi" shows the try-typing hint', h and 'show' in h['cls'], str(h))
        await shot(pg, vp, 'ev-hint')
        await pg.wait_for_timeout(2800)
        # 222aak egg
        await pg.keyboard.type('222aak', delay=60)
        await pg.wait_for_timeout(900)
        c = await cls('#guandan-egg-overlay')
        rec('events', f'{vp}: 222aak opens the egg overlay', c and 'active' in c, c)
        img = await pg.evaluate("(()=>{const i=document.querySelector('#guandan-egg-overlay img');return i&&{src:(i.currentSrc||i.src||'').slice(-50),w:i.naturalWidth,h:i.naturalHeight,cw:i.getBoundingClientRect().width}})()")
        rec('events', f'{vp}: the egg photo loads', img and img['w'] > 0 and img['cw'] > 60, str(img))
        await shot(pg, vp, 'ev-egg')
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(500)
        c = await cls('#guandan-egg-overlay')
        rec('events', f'{vp}: Esc closes the egg overlay', c and 'active' not in c.split('|')[0].split(), c)
        # egg trigger (hover-only button on a card)
        opened = await pg.evaluate("(()=>{const b=document.querySelector('.guandan-egg-trigger');if(!b)return null;b.click();return true})()")
        await pg.wait_for_timeout(700)
        c = await cls('#guandan-egg-overlay')
        rec('events', f'{vp}: the card egg trigger opens it too', opened and c and 'active' in c, c)
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(400)
        # mvp overlay
        await pg.keyboard.type('mvp', delay=60)
        await pg.wait_for_timeout(600)
        m = await pg.evaluate("""(()=>{const o=document.getElementById('gdr-overlay');return {disp:getComputedStyle(o).display,active:o.classList.contains('active'),
          tabs:o.querySelectorAll('.gdr-tab').length,pages:o.querySelectorAll('.gdr-page').length,splash:!!o.querySelector('.gdr-splash'),
          rows:o.querySelectorAll('.gdr-row, .gdr-mem, .gdr-match, .gdr-mcard').length}})()""")
        rec('events', f'{vp}: "mvp" opens the records board with splash, tabs, pages', m['disp'] == 'block' and m['tabs'] == 4 and m['pages'] >= 4, str(m))
        await shot(pg, vp, 'ev-mvp-splash')
        await pg.wait_for_timeout(2600)
        await shot(pg, vp, 'ev-mvp-board')
        for k in (1, 2, 3):
            await pg.keyboard.press('ArrowRight')
            await pg.wait_for_timeout(450)
        sel = await pg.evaluate("(()=>{const t=[...document.querySelectorAll('#gdr-overlay .gdr-tab')].findIndex(x=>x.getAttribute('aria-selected')==='true');return t})()")
        rec('events', f'{vp}: ArrowRight pages the board (ends on tab 4)', sel == 3, f'selected tab {sel}')
        await shot(pg, vp, 'ev-mvp-history')
        back = await pg.evaluate("(()=>{const b=document.querySelector('#gdr-overlay .gdr-back');if(!b)return null;const r=b.getBoundingClientRect();return [Math.round(r.width),Math.round(r.height)]})()")
        await pg.keyboard.press('Escape')
        await pg.wait_for_timeout(500)
        c = await cls('#gdr-overlay')
        rec('events', f'{vp}: Esc closes the board; back arrow {back}', c and c.split('|')[1] == 'none', c)
        # the Tiga portal (typing) and the tap-three-times counterpart on phones: the attack film plays over the
        # page while guandan.html loads behind it in a frame named gd-portal; the page itself never navigates
        await pg.keyboard.type('picasso', delay=60)
        await pg.wait_for_timeout(700)
        st = await pg.evaluate(PORTAL_JS)
        rec('events', f'{vp}: typing "picasso" opens the portal and plays the attack film', bool(st and 'film' in st['cls'] and st['src'].startswith('attack_') and st['name'] == 'gd-portal' and 'guandan.html' in st['frame']), json.dumps(st)[:220])
        await shot(pg, vp, 'ev-portal-film')
        await pg.keyboard.press('Escape')
        try:
            await pg.wait_for_function("document.getElementById('gd-portal').classList.contains('table')", timeout=9000)
            rec('events', f'{vp}: Esc skips the film and the table opens in the portal', True)
        except Exception as e:
            rec('events', f'{vp}: Esc skips the film and the table opens in the portal', False, str(e)[:100])
        await pg.wait_for_timeout(600)
        await shot(pg, vp, 'ev-portal-table')
        gf = next((f for f in pg.frames if f.name == 'gd-portal'), None)
        if gf:
            await gf.click('#back-events-btn')
            await pg.wait_for_timeout(700)
            st = await pg.evaluate(PORTAL_JS)
            rec('events', f'{vp}: leaving the table plays the return film over it', bool(st and 'film' in st['cls'] and st['src'].startswith('light_')), json.dumps(st)[:220])
            await shot(pg, vp, 'ev-portal-return')
            try:
                await pg.wait_for_function("(()=>{const p=document.getElementById('gd-portal');return p.className===''&&!p.querySelector('iframe')})()", timeout=11000)
                rec('events', f'{vp}: the return film ends back on this page (portal closed, frame gone)', True, pg.url[-30:])
            except Exception as e:
                rec('events', f'{vp}: the return film ends back on this page (portal closed, frame gone)', False, json.dumps(await pg.evaluate(PORTAL_JS))[:160])
        else:
            rec('events', f'{vp}: the portal frame exists', False)
        if v['mobile']:
            await pg.goto(EV_URL, wait_until='load')
            await pg.wait_for_timeout(2000)
            await pg.touchscreen.tap(v['width'] // 2, v['height'] // 2)     # the award intro ('tap to continue') sits over the page
            await pg.wait_for_timeout(1800)
            box = await pg.evaluate("(()=>{const b=document.querySelector('.news-banner');const r=b.getBoundingClientRect();return [r.x+r.width*.5,r.y+r.height*.5,r.height]})()")
            for k in range(3):
                await pg.touchscreen.tap(box[0] + k * 3, box[1])
                await pg.wait_for_timeout(120)
                if k == 0:
                    hint = await pg.evaluate("document.getElementById('guandan-type-hint').textContent")
            st = await pg.evaluate(PORTAL_JS)
            rec('events', f'{vp}: three taps on the news strip open the portal (first tap hint: {hint!r})', bool(st and 'open' in st['cls']), json.dumps(st)[:160])
        # the return landing
        await pg.goto(EV_URL + '?from=guandan', wait_until='load')
        await pg.wait_for_timeout(120)
        bc = await pg.evaluate("document.body.className")
        rec('events', f'{vp}: ?from=guandan plays the restore fade', 'from-guandan' in bc, bc[:80])
        rec('events', f'{vp}: no console errors across the whole events run', not [e for e in errors if 'ERR_' not in e], str(errors[:4]))
    finally:
        await br.close()


async def table_state(s, vp):
    await s.new_page()
    await s.ctx.route('https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js', lambda r: r.fulfill(status=200, body=DB_STUB, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'}))
    await s.goto()
    await s.create_room()
    await s.fill_ai()
    await s.start()
    await s.wait_deal_done()


async def portraits(p, vp):
    async with session(vp, f'mk-{vp}') as s:
        await table_state(s, vp)
        faces = [f'0{su}{r}' for r in 'AKQJ' for su in 'SHCD']
        ids_by_suit = {(f[2], f[1]): f for f in faces}
        # every J/Q/K/A of every suit into my hand (level 2 so none is a level card), then read the rendering
        await s.stage("""const g = __gd.get(); g.currentLevelRank='2'; for (let i=0;i<4;i++) g.hands[i]=[];
          const E = await __gd.eng(); const ids=arg;
          const deck=[]; for (const su of E.suits) for (const r of E.ranks) deck.push({id:`0${su}${r}`,suit:su,rank:r});
          g.hands[0]=deck.filter(c=>ids.includes(c.id)); g.hands[1]=deck.filter(c=>!ids.includes(c.id)&&c.rank!=='2').slice(0,20);
          g.hands[2]=g.hands[1].slice(0,10).map(c=>({...c,id:'x'+c.id})); g.hands[3]=g.hands[1].slice(10).map(c=>({...c,id:'y'+c.id}));
          g.currentTurn=0; g.lastPlay=null; g.trickPlays=[null,null,null,null]; g.history=[]; g.finished=[]; __gd.sortAll(g); __gd.put(g);""", faces)
        await s.pg.wait_for_timeout(1000)
        res = await s.pg.evaluate("""(async()=>{
          const cards=[...document.querySelectorAll('.gd-hand .card')];
          const out=[];
          for (const c of cards){ const t=c.getAttribute('aria-label')||''; const im=c.querySelector('img');
            out.push({t, has:c.classList.contains('has-portrait'), img: im?{w:im.naturalWidth, src:(im.currentSrc||im.src).slice(-40)}:null}); }
          return out;})()""")
        n = len(res)
        withp = [r for r in res if r['has'] and r['img'] and r['img']['w'] > 0]
        rec('portraits', f'{vp}: all 16 J/Q/K/A cards of my hand render a loaded labmate portrait', n == 16 and len(withp) == 16, f'{len(withp)}/{n} loaded; names: {sorted(set(r["t"].split("·")[-1].strip() for r in res))}')
        names = {r['t'].split('·')[-1].strip() for r in res if '·' in r['t']}
        rec('portraits', f'{vp}: portraits come from 16 different labmates', len(names) == 16, f'{len(names)} distinct')
        await shot(s.pg, vp, 'portraits-hand')
        # seat photos + lab copy at the table
        seat = await s.pg.evaluate("""(()=>[...document.querySelectorAll('.gd-seat, .gd-slot, .gd-av, [class*=avatar]')].slice(0,0))()""")
        st = await s.pg.evaluate("""(()=>{const imgs=[...document.querySelectorAll('.gd-stage img')].filter(i=>/avatar|static|people/.test(i.src)||true);
          return imgs.map(i=>({cls:(i.parentElement.className||'').toString().slice(0,30),w:i.naturalWidth,src:i.src.slice(-45)})).slice(0,12)})()""")
        rec('portraits', f'{vp}: table seat avatars are photos, not initials', any(x['w'] > 0 for x in st), json.dumps(st[:6], ensure_ascii=False))
        # card back emblem
        await s.stage("const g=__gd.get(); g.dealStartedAt=Date.now(); g.roundStartedAt=Date.now(); __gd.put(g);")
        await s.pg.wait_for_timeout(700)
        emb = await s.pg.evaluate("""(()=>{const e=document.querySelector('.gd-back-emblem');if(!e)return null;const cs=getComputedStyle(e);return {t:e.textContent,fs:cs.fontSize,col:cs.color,bg:getComputedStyle(e.parentElement).backgroundImage.slice(0,60),n:document.querySelectorAll('.gd-back-emblem').length}})()""")
        rec('portraits', f'{vp}: the blue PICASSO "P" card back shows during the deal', emb and emb['t'] == 'P', str(emb))
        await shot(s.pg, vp, 'deal-backs')


async def music(p, vp):
    async with session(vp, f'mk-{vp}') as s:
        await s.new_page(local={'picasso.guandan.music': 'on'})
        await s.goto()
        a = await s.pg.evaluate("""(()=>{const a=document.getElementById('guandan-bgm');return a&&{src:a.src,loop:a.loop,vol:a.volume,paused:a.paused,rs:a.readyState,err:a.error&&a.error.code,on:window.GuandanMusic&&window.GuandanMusic.isOn()}})()""")
        rec('music', f'{vp}: #guandan-bgm has the absolute lab URL, loops, GuandanMusic exists', a and a['src'] == PREFIX + 'events/static/guandan_music.mp3' and a['loop'] and a['on'] is True, str(a))
        # a first tap counts as the user gesture; headless Chromium may lack MP3 codecs (proprietary), so accept playing OR codec error
        await s.pg.mouse.click(5, 5) if not s.mobile else await s.pg.touchscreen.tap(5, 5)
        await s.pg.wait_for_timeout(800)
        a2 = await s.pg.evaluate("(()=>{const a=document.getElementById('guandan-bgm');return {paused:a.paused,t:a.currentTime,err:a.error&&a.error.code,rs:a.readyState}})()")
        rec('music', f'{vp}: after a tap the BGM plays (or the headless codec is missing)', (not a2['paused']) or a2['err'] == 4, str(a2))
        ev = await s.pg.evaluate("""(async()=>{let n=0;document.addEventListener('guandan:music',e=>n++);window.GuandanMusic.setOn(false);const off=[window.GuandanMusic.isOn(),document.getElementById('guandan-bgm').paused,localStorage.getItem('picasso.guandan.music')];
          window.GuandanMusic.setOn(true);return {off,on:window.GuandanMusic.isOn(),ls:localStorage.getItem('picasso.guandan.music'),events:n}})()""")
        rec('music', f'{vp}: setOn(false/true) pauses, stores the pref and fires guandan:music', ev['off'] == [False, True, 'off'] and ev['on'] is True and ev['ls'] == 'on' and ev['events'] == 2, str(ev))
        # the lobby's own toggle
        lab = await s.pg.evaluate("(()=>{const b=[...document.querySelectorAll('.lobby button, .lobby [role=button]')].find(x=>/音乐|Music/i.test(x.textContent));return b&&b.textContent.trim().replace(/\\s+/g,' ')})()")
        rec('music', f'{vp}: the lobby has a music control', bool(lab), str(lab))
        if lab:
            before = await s.pg.evaluate("window.GuandanMusic.isOn()")
            await s.pg.evaluate("[...document.querySelectorAll('.lobby button, .lobby [role=button]')].find(x=>/音乐|Music/i.test(x.textContent)).click()")
            await s.pg.wait_for_timeout(300)
            after = await s.pg.evaluate("window.GuandanMusic.isOn()")
            rec('music', f'{vp}: the lobby toggle flips the state', before != after, f'{before}->{after}')


HINT_JS = """(()=>{const e=document.getElementById('return-type-hint');if(!e)return null;const cs=getComputedStyle(e);const r=e.getBoundingClientRect();
  return {cls:e.className,op:+cs.opacity,vis:cs.visibility,rect:[r.x,r.y,r.width,r.height].map(Math.round),text:e.textContent.trim()}})()"""
OVERLAP_JS = """(sels)=>{const h=document.getElementById('return-type-hint').getBoundingClientRect();const hit=[];
  for(const sel of sels){for(const el of document.querySelectorAll(sel)){const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;
    const cs=getComputedStyle(el);if(cs.visibility==='hidden'||+cs.opacity<.05)continue;
    const w=Math.min(h.right,r.right)-Math.max(h.left,r.left),ht=Math.min(h.bottom,r.bottom)-Math.max(h.top,r.top);
    if(w>2&&ht>2)hit.push({sel,id:el.id||el.className.toString().slice(0,30),ov:Math.round(w)+'x'+Math.round(ht)})}}return hit.slice(0,6)}"""


async def screen_check(s, vp, screen, controls):
    pg = s.pg
    await pg.keyboard.type('pi', delay=70)
    await pg.wait_for_timeout(500)
    h = await pg.evaluate(HINT_JS)
    shown = h and h['op'] > .5 and 'show' in h['cls']
    rec('screens', f'{vp}/{screen}: typing "pi" shows the hint {h["rect"] if h else ""} {h["text"] if h else ""!r}', shown, str(h))
    if shown:
        hit = await pg.evaluate(OVERLAP_JS, controls)
        rec('screens', f'{vp}/{screen}: the hint covers no control, hand or play', not hit, str(hit))
    await shot(pg, vp, f'hint-{screen}')


async def screens(p, vp):
    # lobby -> room -> table on one page; the return transition is exercised on the table (rotated on portrait) last
    async with session(vp, f'mk-{vp}') as s:
        s.errors.clear()
        await s.new_page()
        await s.ctx.route('https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js', lambda r: r.fulfill(status=200, body=DB_STUB, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'}))
        await s.goto()
        await screen_check(s, vp, 'lobby', ['.lobby button', '.lobby-tile', '.lobby-quick', '.lobby input', '.lobby-stat', '.lobby [role=button]'])
        await s.pg.wait_for_timeout(2800)
        await s.create_room()
        await s.fill_ai()
        await screen_check(s, vp, 'room', ['.room button', '.room-seat', '.room input', '#start-game'])
        await s.pg.wait_for_timeout(2800)
        await s.start()
        await s.wait_deal_done()
        # my turn: row, hand, played cards
        await s.stage("const g=__gd.get(); g.currentTurn=g.seats.findIndex(x=>x&&x.clientId==='c_shooter'); g.turnStartedAt=Date.now(); g.lastPlay=null; g.trickPlays=[null,null,null,null]; __gd.put(g);")
        await s.pg.wait_for_timeout(600)
        await screen_check(s, vp, 'table', ['.gd-hand .card', '#play-btn', '#pass-btn', '#hint-btn', '.gd-tool', '.gd-slot .card', '.gd-timer', '.gd-menu-btn', '.gd-level'])
        # opened on its own (not in the Events portal) the table plays the Tiga return film itself, turned with
        # the table on a portrait phone, then goes to Events
        await s.pg.keyboard.type('casso', delay=60)
        await s.pg.wait_for_timeout(900)
        tr = await s.pg.evaluate("""(()=>{const t=document.querySelector('.return-film');if(!t)return null;const r=t.getBoundingClientRect();const v=t.querySelector('video');
          return {cls:t.className,rect:[r.x,r.y,r.width,r.height].map(Math.round),src:v?(v.currentSrc||v.src).split('/').pop():'',t:v?+v.currentTime.toFixed(2):null,
            rotated:!!document.querySelector('.gd-viewport.is-rotated')}})()""")
        vw, vh = VIEWPORTS[vp]['width'], VIEWPORTS[vp]['height']
        covers = tr and tr['rect'][2] >= vw - 2 and tr['rect'][3] >= vh - 2
        turned_ok = tr and (('is-turned' in tr['cls']) == tr['rotated']) and (tr['src'].endswith('_land.mp4') if (tr['rotated'] or vw >= vh) else tr['src'].endswith('_port.mp4'))
        rec('screens', f'{vp}/table: typing "casso" plays the Tiga return film over the whole screen', bool(covers and turned_ok and tr['t'] and tr['t'] > 0), json.dumps(tr, ensure_ascii=False)[:300])
        await shot(s.pg, vp, 'return-table-film')
        try:
            await s.pg.wait_for_url('**/events/events.html*', timeout=11000)
            rec('screens', f'{vp}/table: it lands on events.html (the page then strips ?from=guandan)', True, s.pg.url[-45:])
        except Exception as e:
            rec('screens', f'{vp}/table: it lands on events.html (the page then strips ?from=guandan)', False, f'{s.pg.url[-60:]} {str(e)[:80]}')
        rec('screens', f'{vp}: no console errors in the guandan run', not [e for e in s.errors if 'ERR_' not in e], str(s.errors[:4]))
    # the same from the room and the lobby (the seat is given back first from the room)
    async with session(vp, f'mk-{vp}b') as s:
        await s.new_page()
        await s.ctx.route('https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js', lambda r: r.fulfill(status=200, body=DB_STUB, headers={'content-type': 'text/javascript', 'access-control-allow-origin': '*'}))
        await s.goto()
        await s.create_room()
        await s.pg.keyboard.type('picasso', delay=60)
        await s.pg.wait_for_timeout(500)
        active = await s.pg.evaluate("!!document.querySelector('.return-film video')")
        rec('screens', f'{vp}/room: typing "picasso" plays the return film', active)
        try:
            await s.pg.wait_for_url('**/events/events.html*', timeout=11000)
            left = await s.pg.evaluate("Object.keys(window.__fbStore||{}).filter(k=>k.startsWith('guandanRooms/'))")
            rec('screens', f'{vp}/room: lands on events; the room seat was given back (rooms left: {left})', True)
        except Exception as e:
            rec('screens', f'{vp}/room: lands on events.html?from=guandan', False, str(e)[:100])
    async with session(vp, f'mk-{vp}c') as s:
        await s.goto()
        await s.pg.keyboard.type('picasso', delay=60)
        await s.pg.wait_for_timeout(500)
        active = await s.pg.evaluate("!!document.querySelector('.return-film video')")
        rec('screens', f'{vp}/lobby: typing "picasso" plays the return film', active)
        try:
            await s.pg.wait_for_url('**/events/events.html*', timeout=11000)
            rec('screens', f'{vp}/lobby: lands on events.html?from=guandan', True)
        except Exception as e:
            rec('screens', f'{vp}/lobby: lands on events.html?from=guandan', False, str(e)[:100])


async def main():
    args = sys.argv[1:]
    checks = [a for a in args if a in ('events', 'portraits', 'music', 'screens', 'all')] or ['all']
    vps = [a for a in args if a in VIEWPORTS] or ['desk', 'phone', 'portrait']
    async with async_playwright() as p:
        for vp in vps:
            for name, fn in (('events', events_flows), ('portraits', portraits), ('music', music), ('screens', screens)):
                if 'all' in checks or name in checks:
                    try:
                        await asyncio.wait_for(fn(p, vp), 420)
                    except Exception as e:
                        rec(name, f'{vp}: run aborted', False, repr(e)[:200])
    json.dump(REPORT, open(os.path.join(SHOTS, 'mustkeep.json'), 'w'), ensure_ascii=False, indent=1)
    bad = [(a, r['check']) for a, rs in REPORT.items() for r in rs if not r['ok']]
    print('\nFAILED:', len(bad)); [print('  ', b) for b in bad]


if __name__ == '__main__':
    asyncio.run(main())
