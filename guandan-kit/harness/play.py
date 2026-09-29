"""Full rounds vs AI into round 2 (through the tribute) on one viewport, against the in-memory Firebase stub.
Usage: python3 play.py [desk|hd|ifr|phone|portrait] [rounds=2]
Prints the state after each round, console errors and long tasks; screenshots go to shots/ (git-ignored)."""
import asyncio, json, sys
from gdh import session


async def main():
    vp = sys.argv[1] if len(sys.argv) > 1 else 'desk'
    rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 2
    async with session(vp, f'play-{vp}') as s:
        await s.goto()
        await s.shot('01-lobby')
        await s.create_room()
        await s.shot('02-room')
        await s.fill_ai()
        await s.start()
        await s.pg.wait_for_timeout(900)
        await s.shot('03-dealing')
        await s.wait_deal_done()
        shot_turn = {'done': False}

        async def on_turn(sess, n):
            if not shot_turn['done']:
                await sess.pg.wait_for_timeout(400)
                await sess.shot('04-myturn')
                shot_turn['done'] = True
        for rnd in range(1, rounds + 1):
            r = await s.play_round(on_turn=on_turn)
            print(f'ROUND {rnd} END', json.dumps(r))
            await s.pg.wait_for_timeout(1800)
            await s.shot(f'05-r{rnd}-result')
            if r['state']['phase'] != 'roundOver' or rnd == rounds:
                break
            await s.next_round()
            await s.pg.wait_for_timeout(2900)
            await s.shot(f'06-r{rnd + 1}-tribute')
            await s.wait_deal_done()
            print(f'ROUND {rnd + 1} START', json.dumps(await s.state()))
        print('ERRORS', s.errors)
        print('LONG TASKS >50ms', await s.long_tasks())


if __name__ == '__main__':
    asyncio.run(main())
