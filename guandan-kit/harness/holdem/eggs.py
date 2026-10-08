"""Must-keep on the Hold'em screens: the "try typing picasso" hint and the picasso return film on the Hold'em lobby,
room and table; the keyboard shortcuts never eat the c of picasso; BGM and the table sounds from the ☰ menu.
Usage: python3 eggs.py [desk|hd|ifr]  (fake dealer by default; HD_DEALER=real plays real hands)"""
import asyncio, sys
from hdh import dealer, hsession

FAILS = []


def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + (f' {detail}' if detail else ''), flush=True)
    if not ok:
        FAILS.append(name)


HINT = "document.getElementById('return-type-hint').classList.contains('show')"
FILM = "!!document.querySelector('.return-film video')"


async def hint_and_film(s, screen):
    await s.pg.keyboard.type('pi', delay=60)
    await s.pg.wait_for_timeout(250)
    check(f'{screen}: typing "pi" shows the hint', await s.pg.evaluate(HINT))
    await s.shot(f'hint-{screen}')
    await s.pg.wait_for_timeout(2800)
    await s.pg.keyboard.type('picasso', delay=60)
    await s.pg.wait_for_timeout(500)
    check(f'{screen}: typing "picasso" plays the return film', await s.pg.evaluate(FILM))


async def main(vp):
    with dealer() as d:
        async with hsession(vp, d, f'eggs-{vp}') as s:
            await s.goto(wait=1500)
            await hint_and_film(s, 'lobby')
            await s.goto(wait=1500)
            await s.press('.lobby-tile.is-holdem')
            await s.wait_screen('hroom')
            await s.pg.wait_for_timeout(700)
            await hint_and_film(s, 'hroom')
            await s.goto(wait=1500)
            await s.pg.evaluate("""() => { window.__sfx = []; const play = HTMLMediaElement.prototype.play;
                HTMLMediaElement.prototype.play = function () { if (this.src.includes('/holdem-sfx/')) window.__sfx.push(this.src.split('/').pop()); return play.call(this); }; }""")
            await s.press('.lobby-tile.is-practice')
            await s.wait_screen('htable', 10000)
            await s.pg.wait_for_selector('.hd-actions [data-act]', timeout=30000)
            await s.pg.wait_for_timeout(500)
            await s.pg.keyboard.type('pic', delay=60)
            await s.pg.wait_for_timeout(700)
            check('htable: the c of "pic" is not a call', await s.pg.evaluate("!!document.querySelector('.hd-actions [data-act]')"))
            await s.pg.wait_for_timeout(2600)
            await s.pg.wait_for_selector('.hd-actions [data-act=raise], .hd-actions [data-act=bet]', timeout=30000)
            await s.pg.keyboard.press('r')
            await s.pg.wait_for_timeout(300)
            check('htable: R opens the raise panel', await s.pg.evaluate("!!document.querySelector('.hd-raise-panel')"))
            await s.pg.keyboard.press('Escape')
            await s.pg.wait_for_timeout(300)
            check('htable: Esc closes it', await s.pg.evaluate("!document.querySelector('.hd-raise-panel')"))
            await s.pg.evaluate("""() => { window.__sent = []; const send = WebSocket.prototype.send;
                WebSocket.prototype.send = function (d) { try { const m = JSON.parse(d); if (m.t === 'act') window.__sent.push(m.action); } catch (_) {} return send.call(this, d); }; }""")
            await s.pg.wait_for_selector('.hd-actions [data-act=call], .hd-actions [data-act=check]', timeout=30000)
            await s.pg.keyboard.press('c')
            await s.pg.wait_for_timeout(600)
            sent = await s.pg.evaluate("window.__sent")
            check('htable: C calls / checks', sent in (['call'], ['check']), str(sent))
            await s.press('[data-menu]')
            await s.pg.wait_for_timeout(300)
            before = await s.pg.evaluate("window.GuandanMusic.isOn()")
            await s.press('[data-m="music"]')
            await s.pg.wait_for_timeout(300)
            after = await s.pg.evaluate("window.GuandanMusic.isOn()")
            check('htable: ☰ 音乐 toggles the BGM', before != after, f'{before} -> {after}')
            sounds = await s.pg.evaluate("performance.getEntriesByType('resource').filter(e => e.name.includes('/holdem-sfx/')).map(e => e.name.split('/').pop())")
            check('htable: the five table sounds load', len(set(sounds)) == 5, str(sorted(set(sounds))))
            played = await s.pg.evaluate("window.__sfx")
            # the fake dealer's scripted table never deals a hand in front of me: no deal sound there
            want = {'deal.mp3', 'bet.mp3'} if d.kind == 'real' else {'bet.mp3'}
            check('htable: sounds play with the cards and chips', want <= set(played), str(sorted(set(played))))
            await s.press('[data-menu]')
            await s.pg.wait_for_timeout(300)
            label = await s.pg.evaluate("document.querySelector('[data-m=sfx]')?.textContent.trim()")
            await s.press('[data-m="sfx"]')
            await s.pg.wait_for_timeout(300)
            stored = await s.pg.evaluate("localStorage.getItem('picasso.holdem.sfx')")
            check('htable: ☰ 音效 switches the sounds off', label in ('音效：开', 'Sound: on') and stored == 'off', f'{label} -> {stored}')
            await s.press('[data-menu]')
            await s.pg.wait_for_timeout(300)
            await s.press('[data-m="sfx"]')
            await s.pg.wait_for_timeout(300)
            check('htable: and on again', await s.pg.evaluate("localStorage.getItem('picasso.holdem.sfx')") == 'on')
            await hint_and_film(s, 'htable')
            errors = [e for e in s.errors if 'WebSocket' not in e]
            check('no console errors', not errors, str(errors[:3]))
    print('FAILED' if FAILS else 'ALL PASS', FAILS)
    return not FAILS


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'desk')) else 1)
