"""Capture every screen and rare state on the chosen viewports (SPEC §6) against the in-memory Firebase stub.
Table states are staged deterministically with stage.js (real engine combos), so before/after shots compare 1:1.
Usage: python3 scenes.py [viewport ...] [--only group,group]   (groups: lobby room guest table result en spectator)
Writes shots/<vp>-<scene>.jpg and shots/<vp>-scenes.json (scene -> caption, console errors, long tasks)."""
import asyncio, json, os, sys
from gdh import session, SHOTS, VIEWPORTS

# ---- staged table states (JS run with stage.js helpers; `code` = the attached room) ----
BASE = "const g = await __gd.make({code, seed: 11, level: '7', round: 3, levels: ['7', '5']});"
FOLLOW = BASE + """
const pair = __gd.sameRank(g, 3, 2); __gd.play(g, 3, pair); __gd.pass(g, 2); __gd.pass(g, 1); __gd.turn(g, 0);
__gd.put(g);"""
OTHERS = BASE + """
__gd.trim(g, 1, 6); __gd.trim(g, 2, 9);
const pair = __gd.sameRank(g, 0, 2); __gd.play(g, 0, pair); __gd.turn(g, 3);
__gd.put(g);"""
BOMB_PRE = BASE + """
const pair = __gd.sameRank(g, 3, 2); __gd.give(g, 2, arg.bomb); __gd.give(g, 1, arg.bomb2 || []);
__gd.play(g, 3, pair); __gd.turn(g, 2); __gd.put(g); window.__stagedBomb = g;"""
BOMB_GO = """const g = window.__stagedBomb; __gd.play(g, arg.seat, arg.ids); __gd.turn(g, (arg.seat + 3) % 4); __gd.put(g);"""
RIBBONS = BASE + """
g.hands[2] = []; g.hands[1] = []; g.finished = [2, 1]; __gd.trim(g, 3, 4); __gd.trim(g, 0, 11);
const pair = __gd.sameRank(g, 3, 2); if (pair.length) __gd.play(g, 3, pair);
__gd.turn(g, 0); __gd.put(g);"""
FIRST_LEAD = """const g = await __gd.make({code, seed: 5, level: '2', round: 1, levels: ['2', '2'], dealAgo: arg.ago});
const c = g.hands[1][9]; g.startingCard = { rank: c.rank, suit: c.suit }; __gd.turn(g, 1); g.message = '第 1 局开始，打 2。';
__gd.put(g);"""
TRIBUTE = """const g = await __gd.make({code, seed: 23, level: '9', round: 4, levels: ['9', '6'], dealAgo: arg.ago});
const rows = [];
const mk = (payer, receiver) => { const t = __gd.high(g, payer); const r = g.hands[receiver].filter(c => !c.joker && c.rank !== '9').slice(-1)[0];
  g.hands[payer] = g.hands[payer].filter(c => c.id !== t.id); g.hands[receiver].push(t);
  g.hands[receiver] = g.hands[receiver].filter(c => c.id !== r.id); g.hands[payer].push(r);
  rows.push({ text: `${g.seats[payer].name} 进贡 X 给 ${g.seats[receiver].name}`, payerSeat: payer, receiverSeat: receiver, tributeCard: t, returnCard: r }); };
mk(arg.pay[0], arg.recv[0]); if (arg.pay.length > 1) mk(arg.pay[1], arg.recv[1]);
__gd.sortAll(g); g.selectedTributes = rows; __gd.turn(g, arg.pay[0]); g.message = `第 4 局 · ${rows.map(r => r.text).join('；')}`;
__gd.put(g);"""
KANGGONG = """const g = await __gd.make({code, seed: 23, level: '9', round: 4, levels: ['9', '6'], dealAgo: arg.ago});
__gd.give(g, 1, ['0RJ']); __gd.give(g, 3, ['1RJ']); g.publicJokerSeats = [1, 3];
g.selectedTributes = [{ text: '抗贡成功，头游先出牌。' }]; __gd.turn(g, 0); g.message = '第 4 局 · 抗贡成功，头游先出牌。';
__gd.put(g);"""
RESULT = """const g = await __gd.make({code, seed: 11, level: arg.level || '7', round: 3, levels: arg.before, aceFailures: arg.fails || [0, 0], me: arg.me ?? 0, host: arg.host ?? 0});
__gd.put(g); await new Promise(r => setTimeout(r, 300));
g.phase = arg.phase || 'roundOver'; g.finished = arg.order; g.levels = arg.after; g.aceFailures = arg.failsAfter || arg.fails || [0, 0];
for (const s of arg.order.slice(0, 2)) g.hands[s] = [];
g.roundResult = Object.assign({ first: arg.order[0], firstTeam: arg.order[0] % 2, order: arg.order, advance: arg.advance || 0, aceChallenge: false, acePassed: false, tributePayers: [arg.order[3]], nextStarter: arg.order[0] }, arg.extra || {});
__gd.put(g);"""
SPECTATE = BASE.replace("{code,", "{code, me: 9, host: 1,") + """
const pair = __gd.sameRank(g, 3, 2); __gd.play(g, 3, pair); __gd.pass(g, 2); __gd.turn(g, 1); __gd.put(g);"""


class Run:
    def __init__(self, s, vp):
        self.s, self.vp, self.meta = s, vp, {}

    async def shot(self, name, caption):
        await self.s.shot(name)
        self.meta[name] = caption

    async def typehint(self, name, caption):
        await self.s.pg.keyboard.type('pi', delay=60)
        await self.s.pg.wait_for_timeout(250)
        await self.shot(name, caption)
        await self.s.pg.wait_for_timeout(2600)

    async def table_page(self, lang='zh'):
        s = self.s
        await s.goto(lang=lang)
        await s.create_room()
        await s.pg.wait_for_timeout(1800)   # the room's 房间已创建 toast is gone before any table state

    async def hint(self):
        s = self.s
        if await s.pg.evaluate("!!document.querySelector('#hint-btn')"):
            await s.press('#hint-btn')
            for _ in range(40):
                await s.pg.wait_for_timeout(100)
                if await s.pg.evaluate("(()=>{const b=document.querySelector('#play-btn');return !!b&&b.getAttribute('aria-disabled')!=='true'})()"):
                    break
        await s.pg.wait_for_timeout(250)


async def group_lobby(r):
    s = r.s
    await s.goto()
    await r.shot('lobby', 'Lobby (大厅), zh')
    await r.typehint('lobby-typehint', 'Lobby with the "try typing picasso" hint (typed "pi")')
    await s.press('.lobby-tile.is-rules'); await s.pg.wait_for_timeout(500)
    await r.shot('lobby-rules', 'Rules popup from the lobby (基本玩法 tab)')
    await s.pg.keyboard.press('Escape'); await s.pg.wait_for_timeout(300)
    await s.press('.lobby-nav-item:last-child'); await s.pg.wait_for_timeout(500)
    await r.shot('lobby-settings', 'Settings popup (设置)')
    await s.pg.keyboard.press('Escape'); await s.pg.wait_for_timeout(300)
    await s.press('.lobby-tile.is-lab'); await s.pg.wait_for_timeout(700)
    await r.shot('lobby-labdeck', 'Lab deck popup (实验室牌组: signature cards)')
    await s.pg.keyboard.press('Escape'); await s.pg.wait_for_timeout(300)
    await s.press('.lobby-tile.is-peak'); await s.pg.wait_for_timeout(900)
    await r.shot('records-latest', '巅峰对决 board: 最新战报 page')
    for page in ('mvp', 'board', 'history'):
        await s.pg.keyboard.press('ArrowRight'); await s.pg.wait_for_timeout(600)
        await r.shot(f'records-{page}', f'巅峰对决 board: {page} page')
    await s.pg.keyboard.press('Escape'); await s.pg.wait_for_timeout(400)
    await s.pg.evaluate('window.__fbDelay = 2500')
    await s.press('#create-room'); await s.pg.wait_for_timeout(700)
    await r.shot('lobby-loading', 'Lobby while 经典 waits on Firebase (2.5 s latency): loading feedback')
    await s.pg.wait_for_selector('.room', timeout=12000)
    await s.pg.evaluate('window.__fbDelay = 0')


async def group_room(r):
    s = r.s
    await s.goto()
    await s.create_room()
    await s.pg.wait_for_timeout(100)
    await r.shot('room-alone-toast', 'Room right after creation (host alone, 房间已创建 toast)')
    await s.pg.wait_for_timeout(2000)
    await r.shot('room-alone', 'Room, host alone, empty seats with the host AI badge')
    await r.typehint('room-typehint', 'Room with the picasso type hint')
    await s.fill_ai(); await s.pg.wait_for_timeout(300)
    await r.shot('room-full', 'Room full (host + 3 AI)')
    await s.press('#delete-room'); await s.pg.wait_for_timeout(500)
    await r.shot('room-dissolve', 'Dissolve confirmation (解散房间)')
    await s.pg.keyboard.press('Escape'); await s.pg.wait_for_timeout(300)
    # guest view: host is a labmate on seat 2, one AI, one open seat
    g = await s.get_game()
    g['seats'] = [dict(g['seats'][0], host=False),
                  {'clientId': 'ai_1_x', 'name': '西家 AI', 'botIndex': 1, 'type': 'ai', 'team': 1, 'ready': True, 'host': False},
                  {'clientId': 'c_lab2', 'name': 'Zhengding', 'type': 'human', 'team': 0, 'ready': True, 'host': True}, None]
    code = g['roomCode']
    await s.goto(f'?room={code}', store={f'guandanRooms/{code}': g}, wait=1500)
    await r.shot('room-guest', 'Room seen by a guest (host = Zhengding on the top seat)')


async def group_en(r):
    s = r.s
    await s.goto(lang='en')
    await r.shot('en-lobby', 'Lobby in English')
    await s.create_room(); await s.fill_ai(); await s.pg.wait_for_timeout(1800)
    await r.shot('en-room', 'Room in English (full)')
    await s.stage(FOLLOW); await s.pg.wait_for_timeout(700)
    await r.hint()
    await r.shot('en-table-follow', 'Table in English: my turn to follow, 提示 pressed')
    await s.press('[data-act="menu"]'); await s.pg.wait_for_timeout(400)
    await r.shot('en-table-menu', 'Table menu in English')
    await s.press('.gd-scrim', timeout=3000) if await s.pg.evaluate("!!document.querySelector('.gd-scrim')") else None
    await s.pg.wait_for_timeout(300)
    await s.stage(RESULT, dict(before=['7', '5'], after=['10', '5'], order=[0, 2, 3, 1], advance=3)); await s.pg.wait_for_timeout(2000)
    await r.shot('en-result-win', 'Round result in English (victory, double win +3)')


async def group_table(r):
    s = r.s
    await r.table_page()
    # match intro + deal + 首出 on a round-1 deal
    await s.stage(FIRST_LEAD, dict(ago=100)); await s.until_deal(700)
    await r.shot('t-intro', 'Match intro 巅峰对决 VS over the first deal (round 1)')
    await s.until_deal(1900)
    await r.shot('t-dealing', 'Dealing (card backs flying to the seats)')
    await s.until_deal(3150)
    await r.shot('t-firstlead', '首出 popup: the starting card at the centre flying to its holder')
    await s.until_deal(4600)
    await r.shot('t-opening-other', 'Opening lead by the left opponent (untimed clock, 首 tag)')
    # my lead with 提示
    await s.stage(BASE + "__gd.turn(g, 0); __gd.put(g);"); await s.pg.wait_for_timeout(600)
    await r.shot('t-mylead', 'My lead: action row [timer][提示][出牌] (no 不出 on a lead)')
    await r.hint()
    await r.shot('t-mylead-hint', 'My lead after 提示 (cards selected, 出牌 enabled)')
    await s.stage(FOLLOW); await s.pg.wait_for_timeout(700)
    await r.shot('t-follow', 'My turn to follow: right played a pair, top/left 不出; [不出][timer][提示][出牌]')
    await r.hint()
    await r.shot('t-follow-hint', 'Following after 提示')
    await s.stage(OTHERS); await s.pg.wait_for_timeout(700)
    await r.shot('t-others', "Right opponent's turn (gold alarm clock), my pair on the table, 剩6张 report on the left")
    await r.typehint('t-typehint', 'Table with the picasso type hint')
    # bombs: 4-bomb by the partner, 6-bomb, straight flush, joker bomb (left opponent)
    for name, bomb, cap in (
            ('t-bomb4', ['0S9', '1S9', '0D9', '1D9'], '炸弹 (four 9s) by the partner: burst FX'),
            ('t-bomb6', ['0S9', '1S9', '0D9', '1D9', '0C9', '1C9'], '六炸 (six 9s) by the partner: bigger burst FX'),
            ('t-flush', ['0C8', '0C9', '0C10', '0CJ', '0CQ'], '同花顺 (8-Q clubs) by the partner: gold ring sweep'),
            ('t-joker', ['0BJ', '1BJ', '0RJ', '1RJ'], '天王炸 by the partner: vertical word over three explosions')):
        await s.stage(BOMB_PRE, dict(bomb=bomb)); await s.pg.wait_for_timeout(600)
        await s.stage(BOMB_GO, dict(seat=2, ids=bomb))
        await s.pg.wait_for_timeout(420)
        await r.shot(name, cap)
        await s.pg.wait_for_timeout(500)
        await r.shot(name + '-late', cap + ' (later frame)')
        await s.pg.wait_for_timeout(1400)
    await s.stage(RIBBONS); await s.pg.wait_for_timeout(900)
    await r.shot('t-ribbons', 'Finish ribbons: partner 头游, left 二游; my turn')
    await s.stage(FOLLOW); await s.pg.wait_for_timeout(600)
    await s.press('[data-act="menu"]'); await s.pg.wait_for_timeout(400)
    await r.shot('t-menu', 'Table ☰ menu open')
    await s.press('.gd-scrim'); await s.pg.wait_for_timeout(300)
    await s.press('[data-act="tracker"]'); await s.pg.wait_for_timeout(400)
    await r.shot('t-tracker', '记牌器 open (counts)')
    await s.press('[data-act="tracker-tab"][data-tab="log"]'); await s.pg.wait_for_timeout(300)
    await r.shot('t-tracker-log', '记牌器: 出牌记录 tab')
    await s.press('[data-act="tracker-tab"][data-tab="count"]'); await s.pg.wait_for_timeout(200)
    await s.press('[data-act="tracker"]'); await s.pg.wait_for_timeout(300)
    await s.press('.gd-hud-right [data-act="rules"]'); await s.pg.wait_for_timeout(500)
    await r.shot('t-rules', 'Rules popup inside the table stage')
    await s.pg.keyboard.press('Escape'); await s.pg.wait_for_timeout(300)
    await s.press('[data-act="hengpai"]'); await s.pg.wait_for_timeout(500)
    await r.shot('t-rowmode', '横排 (row) hand mode')
    await s.press('[data-act="hengpai"]'); await s.pg.wait_for_timeout(300)
    # tribute moments (round 4): single, double, blocked
    for name, arg, cap in (('t-tribute', dict(pay=[1], recv=[0]), '进贡 (left pays me) then 还贡'),
                           ('t-tribute2', dict(pay=[1, 3], recv=[0, 2]), '双贡: both opponents pay'),):
        await s.stage(TRIBUTE, dict(arg, ago=2500)); await s.until_deal(2800)
        await r.shot(name, cap + ' (tribute card in flight)')
        await s.until_deal(3250)
        await r.shot(name + '-return', cap + ' (return card in flight)')
        await s.pg.wait_for_timeout(1500)
    await s.stage(KANGGONG, dict(ago=2500)); await s.until_deal(2900)
    await r.shot('t-kanggong', '抗贡 centre word')
    await s.pg.wait_for_timeout(1600)
    await r.shot('t-kanggong-after', '抗贡: revealed Red Jokers at the paying seats, my lead')
    await s.stage(FOLLOW); await s.pg.wait_for_timeout(500)
    await s.pg.keyboard.type('picasso', delay=40); await s.pg.wait_for_timeout(700)
    await r.shot('t-return', 'Typing picasso on the table: the return transition mid-way')


async def group_result(r):
    s = r.s
    await r.table_page()
    await s.stage(RESULT, dict(before=['7', '5'], after=['10', '5'], order=[0, 2, 3, 1], advance=3)); await s.pg.wait_for_timeout(2100)
    await r.shot('r-win', 'Round result, host, 胜利 (双上 +3: 7 → 10)')
    await s.press('[data-act="result-peek"]'); await s.pg.wait_for_timeout(500)
    await r.shot('r-peek', 'Result folded away (查看牌桌)')
    await s.stage(RESULT, dict(before=['7', '5'], after=['7', '6'], order=[1, 0, 3, 2], advance=1)); await s.pg.wait_for_timeout(2100)
    await r.shot('r-lose', 'Round result, 失败 (they +1)')
    await s.stage(RESULT, dict(level='A', before=['A', '9'], after=['A', '9'], fails=[0, 0], failsAfter=[1, 0], order=[0, 1, 3, 2], advance=1,
                               extra=dict(aceChallenge=True, aceFailureCount=1, aceReset=False))); await s.pg.wait_for_timeout(2100)
    await r.shot('r-afail', 'A-challenge failed (冲A失败 1/3)')
    await s.stage(RESULT, dict(level='A', before=['A', 'Q'], after=['A', 'Q'], order=[0, 2, 1, 3], phase='gameOver',
                               extra=dict(aceChallenge=True, acePassed=True, advance=0, tributePayers=[]))); await s.pg.wait_for_timeout(2100)
    await r.shot('r-gameover', 'Match over (过A, 比赛结束)')
    # a guest's view of a round result: 等待房主
    g = await s.get_game()
    code = g['roomCode']
    g['phase'] = 'roundOver'
    g['roundResult'] = dict(first=2, firstTeam=0, order=[2, 0, 1, 3], advance=3, aceChallenge=False, acePassed=False, tributePayers=[1, 3], nextStarter=2)
    g['finished'] = [2, 0, 1, 3]; g['levels'] = ['10', 'Q']
    g['seats'][0]['host'] = False; g['seats'][2]['host'] = True
    await s.goto(f'?room={code}', store={f'guandanRooms/{code}': g}, wait=1800)
    await r.shot('r-guest', "A guest's round result (等待房主), opened by reload")


async def group_spectator(r):
    s = r.s
    await r.table_page()
    await s.stage(SPECTATE); await s.pg.wait_for_timeout(500)
    g = await s.get_game()
    code = g['roomCode']
    await s.goto(f'?room={code}', store={f'guandanRooms/{code}': g}, wait=1800)
    await r.shot('spectator', 'Spectator view (not seated), mid-trick')


GROUPS = dict(lobby=group_lobby, room=group_room, table=group_table, result=group_result, en=group_en, spectator=group_spectator)


async def run_vp(vp, only):
    async with session(vp) as s:
        r = Run(s, vp)
        report = {}
        for name, fn in GROUPS.items():
            if only and name not in only:
                continue
            s.errors.clear()
            try:
                await fn(r)
                report[name] = dict(errors=list(s.errors), long_tasks=[t for t in await s.long_tasks() if t > 50])
            except Exception as e:
                report[name] = dict(failed=f'{type(e).__name__}: {str(e)[:400]}', errors=list(s.errors))
                print(vp, name, 'FAILED', report[name]['failed'])
                try:
                    await s.shot(f'FAILED-{name}')
                except Exception:
                    pass
        out = os.path.join(SHOTS, f'{vp}-scenes.json')
        prev = json.load(open(out)) if os.path.exists(out) else dict(scenes={}, groups={})   # --only runs add to it
        prev['scenes'].update(r.meta)
        prev['groups'].update(report)
        json.dump(prev, open(out, 'w'), ensure_ascii=False, indent=1)
        print(vp, json.dumps(report, ensure_ascii=False)[:1500])


async def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    only = None
    for a in sys.argv[1:]:
        if a.startswith('--only='):
            only = a.split('=', 1)[1].split(',')
    for vp in args or list(VIEWPORTS):
        await run_vp(vp, only)


if __name__ == '__main__':
    asyncio.run(main())
