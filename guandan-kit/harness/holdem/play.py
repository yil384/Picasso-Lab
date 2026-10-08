"""Plays Hold'em hands through the real UI against a games service (HD_DEALER=real: events/holdem-dealer, else the fake).
Usage: HD_DEALER=real python3 play.py [desk|hd|ifr|phone|portrait] [hands=6] [practice|room]
practice: 人机练习 (6-max, 5 AI, starts at once). room: 德州扑克 tile -> waiting room -> AI 补位 -> 开始游戏.
Each decision uses the pills by real clicks / taps: check when free, else call (a raise through the panel now and
then, a fold sometimes). Prints hands seen, decisions, console errors; screenshots to HD_SHOTS."""
import asyncio, json, sys, time
from hdh import dealer, hsession

STATE_JS = """(()=>{const v=document.querySelector('.hd-stage');if(!v)return null;
 const btn=s=>!!document.querySelector(s);
 return {screen:document.body.dataset.screen, turn:btn('.hd-actions [data-act]:not([data-act=show])'),
   check:btn('[data-act=check]'), call:btn('[data-act=call]'), raise:btn('[data-act=raise]'),
   board:document.querySelectorAll('.hd-board .card').length, hand:(document.querySelector('.hd-mark span')||{}).textContent||'',
   word:(document.querySelector('.hd-word .gd-word')||{}).textContent||'', status:(document.querySelector('.hd-status')||{}).textContent||''}})()"""


async def main():
    vp = sys.argv[1] if len(sys.argv) > 1 else 'desk'
    want = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    mode = sys.argv[3] if len(sys.argv) > 3 else 'practice'
    with dealer() as d:
        async with hsession(vp, d, f'play-{d.kind}-{vp}') as s:
            await s.goto(wait=1500)
            if mode == 'room':
                await s.press('.lobby-tile.is-holdem')
                await s.wait_screen('hroom')
                await s.pg.wait_for_timeout(800)
                await s.shot('room')
                await s.press('[data-host="fillBots"]')
                await s.pg.wait_for_timeout(800)
                await s.shot('room-full')
                await s.press('[data-host="start"]')
            else:
                await s.press('.lobby-tile.is-practice')
            await s.wait_screen('htable', 10000)
            hands, decisions, words, t0 = set(), 0, set(), time.time()
            shot_turn = shot_flop = shot_word = False
            while time.time() - t0 < 60 + want * 30:
                st = await s.pg.evaluate(STATE_JS)
                if not st:
                    await s.pg.wait_for_timeout(300)
                    continue
                if st['hand']:
                    hands.add(st['hand'])
                if st['word'] and st['word'] not in words:
                    words.add(st['word'])
                    if not shot_word:
                        await s.pg.wait_for_timeout(700)
                        await s.shot('showdown')
                        shot_word = True
                if len(hands) > want:
                    break
                if st['turn']:
                    if not shot_turn:
                        await s.shot('my-turn')
                        shot_turn = True
                    if st['board'] >= 3 and not shot_flop:
                        await s.shot('my-turn-flop')
                        shot_flop = True
                    decisions += 1
                    if st['raise'] and decisions % 5 == 2:
                        await s.press('[data-act=raise]')
                        await s.pg.wait_for_timeout(300)
                        await s.press('[data-preset="0.5"]')
                        await s.pg.wait_for_timeout(200)
                        await s.press('[data-act=confirm]')
                    elif st['check']:
                        await s.press('[data-act=check]')
                    elif decisions % 7 == 6:
                        await s.press('[data-act=fold]')
                    else:
                        await s.press('[data-act=call]')
                    await s.pg.wait_for_timeout(500)
                else:
                    await s.pg.wait_for_timeout(250)
            await s.shot('end')
            print(json.dumps({'dealer': d.kind, 'vp': vp, 'hands_seen': sorted(hands), 'decisions': decisions, 'words': sorted(words),
                              'errors': s.errors, 'long_tasks': await s.long_tasks()}, ensure_ascii=False))
            return not s.errors


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main()) else 1)
