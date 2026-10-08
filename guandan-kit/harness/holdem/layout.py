"""Table layout checks against the real dealer, for every seat count 2-9 at each viewport (review round 3):
  bets      every bet slot (filled with a sample bet) is nearer its own seat than any other seat (the hero's: its
            cards), and covers no other seat's avatar, plate or card backs
  dealer    over a few hands with the hero away, the dealer button never lies under the button seat's clock
  touch     the raise panel's presets, ‹ › steps and slider, and the pre-action pills, are at least 40 CSS px both
            ways on phones (and nowhere smaller than on desktop)
Usage: python3 layout.py [portrait phone desk hd] [--seats=2-9] [--shots]
Prints PASS / FAIL lines and a JSON summary; --shots writes HD_SHOTS/layout-<vp>-<n>.jpg (bets filled in)."""
import asyncio, json, sys
from live import Service, Player, browser, until, log

PROBE_BETS = r"""() => {
    const stage = document.querySelector('.hd-stage');
    const seats = [...document.querySelectorAll('.hd-seats > .hd-seat')];
    const bets = [...document.querySelectorAll('.hd-bets > .hd-bet')];
    const c = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const hit = (a, b, m = 2) => a.left + m < b.right && b.left + m < a.right && a.top + m < b.bottom && b.top + m < a.bottom;
    const sample = '<span class="hd-chipstack"><svg class="hd-chip c2" viewBox="0 0 40 40" style="--k:0"><use href="#hd-sym-chip"/></svg><svg class="hd-chip c3" viewBox="0 0 40 40" style="--k:1"><use href="#hd-sym-chip"/></svg></span><b>12,500</b>';
    bets.forEach(b => { b.dataset.probe = b.innerHTML; b.innerHTML = sample; });
    const anchors = seats.map((s, k) => {
        const el = k === 0 && document.querySelector('.hd-hero .hd-hole') ? document.querySelector('.hd-hero .hd-hole') : s.querySelector('.hd-av, .hd-vacant, .hd-sit');
        return el ? c(el.getBoundingClientRect()) : null;
    });
    const parts = seats.map(s => [...s.querySelectorAll('.hd-av, .hd-plate, .hd-backs')].map(e => e.getBoundingClientRect()));
    // my clock (shown on my turn) beside my cards: put one in for the measure
    const hero = document.querySelector('.hd-hero');
    let heroClock = hero.querySelector('.hd-hero-clock');
    const added = !heroClock && hero.querySelector('.hd-hole');
    if (added) { hero.insertAdjacentHTML('beforeend', '<div class="hd-hero-clock"><div class="gd-clock hd-clock"><svg viewBox="0 0 100 106"><use href="#gd-sym-clock"/></svg><b>20</b></div></div>'); heroClock = hero.querySelector('.hd-hero-clock'); }
    const clockRect = heroClock ? heroClock.getBoundingClientRect() : null;
    if (added) heroClock.remove();
    const bad = [];
    bets.forEach((b, k) => {
        const r = b.getBoundingClientRect();
        const p = c(r);
        let near = null;
        anchors.forEach((a, j) => { if (!a) return; const d = Math.hypot(a.x - p.x, a.y - p.y); if (!near || d < near.d) near = { j, d }; });
        const own = anchors[k] ? Math.hypot(anchors[k].x - p.x, anchors[k].y - p.y) : null;
        if (near && near.j !== k) bad.push(`bet ${k} nearer seat ${near.j} (${Math.round(near.d)} px) than its own (${Math.round(own)} px)`);
        parts.forEach((list, j) => { if (j !== k && list.some(q => hit(r, q))) bad.push(`bet ${k} covers seat ${j}`); });
        if (k && clockRect && hit(r, clockRect)) bad.push(`bet ${k} under my clock`);
        // the seat's own clock (shown while it acts, e.g. facing a raise over its own bet)
        const slot = k && seats[k].querySelector('.hd-clockslot');
        if (slot && seats[k].querySelector('.hd-av')) {
            const had = slot.innerHTML;
            if (!slot.querySelector('.hd-clock')) slot.innerHTML = '<div class="gd-clock hd-clock"><svg viewBox="0 0 100 106"><use href="#gd-sym-clock"/></svg><b>19</b></div>';
            if (hit(r, slot.querySelector('.hd-clock').getBoundingClientRect())) bad.push(`bet ${k} under its own clock`);
            slot.innerHTML = had;
        }
    });
    return { bad, n: seats.length, s: +getComputedStyle(stage).getPropertyValue('--hd-s') };
}"""

UNPROBE = "() => document.querySelectorAll('.hd-bets > .hd-bet').forEach(b => { if ('probe' in b.dataset) { b.innerHTML = b.dataset.probe; delete b.dataset.probe; } })"

PROBE_DEALER = r"""() => {
    const d = document.querySelector('.hd-dealer.is-on');
    if (!d || d.classList.contains('is-mine')) return null;
    const t = getComputedStyle(d).transform;
    const seats = [...document.querySelectorAll('.hd-seats > .hd-seat')];
    const dr = d.getBoundingClientRect();
    const dc = { x: dr.left + dr.width / 2, y: dr.top + dr.height / 2 };
    // the button seat: the nearest seat to the button
    let best = null;
    seats.forEach((s, k) => { if (!k) return; const a = s.querySelector('.hd-av'); if (!a) return; const r = a.getBoundingClientRect(); const dd = Math.hypot(r.left + r.width / 2 - dc.x, r.top + r.height / 2 - dc.y); if (!best || dd < best.dd) best = { s, k, dd }; });
    if (!best) return null;
    const slot = best.s.querySelector('.hd-clockslot');
    const had = slot.innerHTML;
    if (!slot.querySelector('.hd-clock')) slot.innerHTML = '<div class="gd-clock hd-clock"><svg viewBox="0 0 100 106"><use href="#gd-sym-clock"/></svg><b>19</b></div>';
    const cr = slot.querySelector('.hd-clock').getBoundingClientRect();
    slot.innerHTML = had;
    const m = 2;
    const over = dr.left + m < cr.right && cr.left + m < dr.right && dr.top + m < cr.bottom && cr.top + m < dr.bottom;
    return { seat: best.k, over };
}"""

PROBE_TOUCH = r"""(sel) => [...document.querySelectorAll(sel)].map(e => { const r = e.getBoundingClientRect(); return { sel, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; })"""

RESULTS = []


def check(tag, what, ok, detail=''):
    log(('PASS ' if ok else 'FAIL ') + f'[{tag}] {what}' + (f'  {detail}' if detail else ''))
    RESULTS.append((tag, what, ok, detail))
    return ok


async def table_of(p, n):
    await p.tap('.lobby-tile.is-holdem')
    await p.wait_screen('hroom', 10000)
    await until(lambda: p.code and p.seat is not None, 8)
    for _ in range(9):
        v = await p.pg.evaluate("+(document.querySelector('.hd-step-v')||{}).textContent")
        if v == n:
            break
        await p.tap(f'.room-step-btn[data-v="{v - 1 if v > n else v + 1}"]')
        await until(lambda: p.snap['table']['settings']['seats'] != v, 4)
    await p.tap('[data-host="fillBots"]')
    await until(lambda: all(p.snap['table']['seats']), 8)
    await p.tap('[data-host="start"]')
    await p.wait_screen('htable', 12000)


async def one(br, vp, seats, shots, port):
    svc = Service(tag=f'layout-{vp}', port=port)
    svc.start()
    mobile = vp in ('phone', 'portrait')
    try:
        for n in seats:
            tag = f'{vp}-{n}'
            p = Player(br, vp, f'L{vp[:3]}{n}', svc, client=f'c_layout_{vp}_{n}', tag=f'layout-{vp}-{n}')
            await p.open(wait=1500)
            try:
                await table_of(p, n)
                await until(lambda: p.hand and not p.hand['done'], 20, .1)
                await p.pg.wait_for_timeout(900)
                r = await p.pg.evaluate(PROBE_BETS)
                check(tag, f'bets: each nearer its own seat and clear of the others ({r["n"]} seats)', not r['bad'], '; '.join(r['bad'][:6]))
                if shots:
                    await p.shot('bets')
                await p.pg.evaluate(UNPROBE)
                # touch: the raise panel on my turn
                if await until(lambda: p.hand and p.hand.get('toAct') == p.seat and not p.hand['done'], 25, .1):
                    await p.pg.wait_for_timeout(400)
                    if await p.pg.evaluate("!!document.querySelector('[data-act=raise]')"):
                        await p.tap('[data-act=raise]')
                        await p.pg.wait_for_selector('.hd-raise-panel', timeout=3000)
                        sizes = []
                        for sel in ('[data-preset]', '[data-step]', '.hd-slider'):
                            sizes += await p.pg.evaluate(PROBE_TOUCH, sel)
                        small = [f'{x["sel"]} {x["w"]}x{x["h"]}' for x in sizes if min(x['w'], x['h']) < 40]
                        if mobile:
                            check(tag, f'touch: raise panel controls at least 40 CSS px ({len(sizes)} controls)', not small, ', '.join(small[:6]))
                        if shots and n in (6, 9):
                            await p.shot('raise')
                        await p.pg.keyboard.press('Escape')
                    await p.pg.wait_for_timeout(200)
                    await p.tap('[data-act=fold]' if await p.pg.evaluate("!!document.querySelector('[data-act=fold]')") else '[data-act=check]')
                # dealer button vs the button seat's clock, over hands with me away (two seats: nobody left to deal to)
                if n == 2:
                    continue
                await p.tap('[data-menu]')
                await p.tap('[data-m="away"]')
                seen, overs = set(), []
                for _ in range(240):
                    if len(seen) >= n - 1:
                        break
                    h = p.hand
                    if h and not h['done'] and h['id'] not in seen and h['button'] != p.seat:
                        seen.add(h['id'])
                        await p.pg.wait_for_timeout(500)
                        d = await p.pg.evaluate(PROBE_DEALER)
                        if d and d['over']:
                            overs.append(f'hand {h["no"]} button seat slot {d["seat"]}')
                    # pre-actions are not mine while away; measure them on the first hand only (see touch above)
                    await asyncio.sleep(.25)
                check(tag, f'dealer: never under the button seat\'s clock ({len(seen)} hands)', not overs, ', '.join(overs[:4]))
            except Exception as e:
                check(tag, 'run', False, f'{type(e).__name__}: {str(e)[:160]}')
                await p.shot('fail')
            finally:
                errs = p.console_errors(svc)
                check(tag, 'console: no errors', not errs, json.dumps(errs[:2], ensure_ascii=False) if errs else '')
                await p.ctx.close()
    finally:
        svc.stop()


async def pre_touch(br, port):
    """The pre-action pills (过牌/弃牌 · 跟任何注 · 跟注) on phones: measured while a bot is to act."""
    for vp in ('phone', 'portrait'):
        svc = Service(tag=f'layout-pre-{vp}', port=port)
        svc.start()
        p = Player(br, vp, f'Pre{vp[:3]}', svc, client=f'c_layout_pre_{vp}', tag=f'layout-pre-{vp}')
        try:
            await p.open(wait=1500)
            await table_of(p, 6)
            ok = False
            for _ in range(3):
                # a bot to act while I am still in the hand: my pre-action pills show (on my turn: call, stay in)
                ok = await until(lambda: p.hand and not p.hand['done'] and p.hand.get('toAct') not in (None, p.seat), 6, .05)
                if ok:
                    break
                if p.hand and p.hand.get('toAct') == p.seat:
                    await p.tap('[data-act=call]' if await p.pg.evaluate("!!document.querySelector('[data-act=call]')") else '[data-act=check]')
            got = []
            if ok:
                await p.pg.wait_for_selector('[data-pre]', timeout=4000)
                got = await p.pg.evaluate(PROBE_TOUCH, '[data-pre]')
            small = [f'{x["w"]}x{x["h"]}' for x in got if min(x['w'], x['h']) < 40]
            check(f'{vp}-pre', f'touch: pre-action pills at least 40 CSS px ({len(got)} pills)', bool(got) and not small, ', '.join(small))
        except Exception as e:
            check(f'{vp}-pre', 'run', False, f'{type(e).__name__}: {str(e)[:160]}')
        finally:
            await p.ctx.close()
            svc.stop()


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    opts = dict(a[2:].split('=', 1) if '=' in a else (a[2:], '') for a in sys.argv[1:] if a.startswith('--'))
    vps = args or ['portrait', 'phone', 'desk', 'hd']
    lo, hi = (int(x) for x in opts.get('seats', '2-9').split('-'))
    seats = list(range(lo, hi + 1))
    async with browser() as br:
        await asyncio.gather(*(one(br, vp, seats, 'shots' in opts, 8811 + i) for i, vp in enumerate(vps)))
        if 'nopre' not in opts:
            await pre_touch(br, 8821)
    fails = [r for r in RESULTS if not r[2]]
    print(json.dumps({'checks': len(RESULTS), 'fail': [f'[{t}] {w} {d}' for t, w, _, d in fails]}, ensure_ascii=False, indent=1))
    print('ALL PASS' if not fails else 'FAILURES')
    return not fails


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
