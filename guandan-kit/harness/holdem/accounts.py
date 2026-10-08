"""Account layer checks (games-account.js + account-link.html) against a games service (fake by default,
HD_DEALER=real for events/holdem-dealer) and the stubbed Firebase. Usage: python3 accounts.py [desk|phone|portrait]
Prints PASS/FAIL lines; screenshots go to HD_SHOTS (default /tmp/holdem-shots)."""
import asyncio, json, sys
from hdh import dealer, hsession

FAILS = []


def check(name, ok, detail=''):
    print(('PASS ' if ok else 'FAIL ') + name + (f' {detail}' if detail else ''), flush=True)
    if not ok:
        FAILS.append(name)


async def main(vp):
    with dealer() as d:
        fake = d.kind == 'fake'
        async with hsession(vp, d, f'acct-{vp}') as s:
            # 1. a fresh browser: the guest session runs in the background, the lobby is never held up
            if fake:
                d.post('/__suggest', {'names': ['Zhuo']})
            await s.goto(client=None, name=None, game='guandan', wait=300)
            lobby = await s.pg.evaluate("document.body.dataset.screen")
            check('lobby renders before the session settles', lobby == 'lobby', lobby)
            await s.pg.wait_for_timeout(1200)
            tok = await s.token()
            check('a guest token is stored', bool(tok))
            if fake:
                prompt = await s.pg.evaluate("(()=>{const p=document.querySelector('.ga-suggest');return p&&p.textContent.replace(/\\s+/g,' ').trim()})()")
                check('fresh browser is asked "continue as X?"', prompt and 'Zhuo' in prompt, str(prompt))
                await s.shot('suggest')
                await s.press('.ga-claim')
                await s.pg.wait_for_timeout(700)
                name = await s.pg.evaluate("localStorage.getItem('picasso.guandan.name')")
                check('继续 claims the suggested name', name == 'Zhuo', name)
                check('the claim brings a new device token', (await s.token()) != tok)
                d.post('/__suggest', {'names': []})
            # 2. a returning player is never prompted
            await s.goto(game='guandan', wait=1500)
            check('no prompt for a returning player', not await s.pg.evaluate("!!document.querySelector('.ga-suggest')"))
            # 3. rename sync: a protected name is reverted with a toast
            await s.pg.fill('#nick-input', 'Yufei')
            await s.pg.keyboard.press('Enter')
            await s.pg.wait_for_timeout(900)
            name = await s.pg.evaluate("document.getElementById('nick-input').value")
            toast = await s.pg.evaluate("document.getElementById('toast').textContent")
            check('a protected name is reverted', name == 'Yichen', f'{name} / {toast}')
            await s.pg.fill('#nick-input', 'Yichen L')
            await s.pg.keyboard.press('Enter')
            await s.pg.wait_for_timeout(700)
            me = await s.pg.evaluate("fetch(window.__PICASSO_GAMES_ORIGIN + '/v1/me', {headers:{authorization:'Bearer ' + localStorage.getItem('picasso.games.token')}}).then(r => r.json())")
            check('a free name reaches the service', me['account']['name'] == 'Yichen L', me['account']['name'])
            # 4. 账号 popup and save with email
            await s.press('.hud-avatar')
            await s.pg.wait_for_selector('.ga-profile')
            await s.pg.wait_for_timeout(400)
            await s.shot('profile')
            await s.press('[data-ga=email]')
            await s.pg.wait_for_selector('.ga-email-input')
            await s.pg.fill('.ga-email-input', 'yichen@ucsd.edu')
            await s.shot('email-form')
            await s.press('.ga-email [type=submit]')
            await s.pg.wait_for_selector('.ga-email.is-sent', timeout=5000)
            calls = await s.pg.evaluate("window.__authCalls")
            sent = [c for c in calls if c['fn'] == 'sendSignInLinkToEmail']
            check('the sign-in link is sent through Firebase Auth', bool(sent) and 'account-link.html?lid=' in sent[0]['url'] and sent[0]['handleCodeInApp'], json.dumps(sent)[:200])
            await s.shot('email-sent')
            lid = sent[0]['url'].split('lid=')[1].split('&')[0] if sent else ''
            # 5. account-link.html completes it (another page, same browser: the email is prefilled)
            pg2 = await s.ctx.new_page()
            pg2.on('pageerror', lambda e: s.errors.append(f'LINK PAGEERROR: {e}'))
            await pg2.goto(f'https://yil384.github.io/Picasso-Lab/events/account-link.html?lid={lid}&lang=zh&mode=signIn&oobCode=test', wait_until='load')
            await pg2.wait_for_timeout(700)
            pre = await pg2.evaluate("document.getElementById('al-email')?.value")
            check('account-link.html prefills the email', pre == 'yichen@ucsd.edu', str(pre))
            await pg2.screenshot(path=f'/tmp/holdem-shots/{s.tag}-link-form.jpg', type='jpeg', quality=82)
            await pg2.click('#al-go')
            await pg2.wait_for_timeout(900)
            done = await pg2.evaluate("document.getElementById('al-body').textContent")
            check('account-link.html says done', '已完成' in done, done[:80])
            calls2 = await pg2.evaluate("window.__authCalls.map(c => c.fn)")
            check('account-link.html signs out of Firebase', 'signOut' in calls2, str(calls2))
            await pg2.screenshot(path=f'/tmp/holdem-shots/{s.tag}-link-done.jpg', type='jpeg', quality=82)
            await pg2.close()
            await s.pg.wait_for_selector('.ga-email.is-done', timeout=6000)
            await s.shot('email-done')
            saved = await s.pg.evaluate("JSON.parse(localStorage.getItem('picasso.games.account'))")
            check('the poll stores the saved account', saved and not saved['guest'], str(saved and saved.get('email')))
            # 6. an invalid link
            pg3 = await s.ctx.new_page()
            await pg3.goto('https://yil384.github.io/Picasso-Lab/events/account-link.html?lang=en', wait_until='load')
            await pg3.wait_for_timeout(500)
            txt = await pg3.evaluate("document.getElementById('al-body').textContent")
            check('an invalid link is refused (EN)', 'not valid' in txt, txt[:60])
            await pg3.screenshot(path=f'/tmp/holdem-shots/{s.tag}-link-invalid.jpg', type='jpeg', quality=82)
            await pg3.close()
            # 7. Guandan rounds are reported once per room:round
            await s.pg.keyboard.press('Escape')
            await s.goto(game='guandan', wait=1200)
            await s.create_room()
            await s.fill_ai()
            await s.start()
            await s.pg.wait_for_timeout(600)

            def over(g):
                g['phase'] = 'roundOver'
                g['finished'] = [0, 2, 1, 3]
                g['roundResult'] = {'first': 0, 'firstTeam': 0, 'order': [0, 2, 1, 3], 'advance': 3, 'tributePayers': [1, 3], 'nextStarter': 0}
            await s.set_game(over)
            await s.pg.wait_for_timeout(1200)
            await s.set_game(lambda g: g.update(message='tick'))
            await s.pg.wait_for_timeout(800)
            me = await s.pg.evaluate("fetch(window.__PICASSO_GAMES_ORIGIN + '/v1/me', {headers:{authorization:'Bearer ' + localStorage.getItem('picasso.games.token')}}).then(r => r.json())")
            g = me['account']['guandan']
            check('a finished Guandan round is reported once', g['rounds'] == 1 and g['wins'] == 1, json.dumps(g))
            errors = [e for e in s.errors if 'status of 409' not in e]   # the refused name above is a 409 by design
            check('no console errors', not errors, str(errors[:3]))
    print('FAILED' if FAILS else 'ALL PASS', FAILS)
    return not FAILS


if __name__ == '__main__':
    sys.exit(0 if asyncio.run(main(sys.argv[1] if len(sys.argv) > 1 else 'desk')) else 1)
