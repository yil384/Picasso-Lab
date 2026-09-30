import json, sys, os
D = os.path.dirname(os.path.abspath(__file__))
CFG = {
 'hezi': dict(id='hezi', art='art/hezi.png', seed=5, bg='#1f3b8f', ray='#2a4db0', dots='#ffd23f',
              title='Dr. Hezi Zhang!', titleColor='#1e40af', kicker='PhD defense passed  ·  June 2026',
              sfx='WE DID IT!', sfxAt=[948, 104], sfxFill='#ffd23f', sfxColor='#e8364a',
              props=['cap', 'star', 'confetti', 'confetti', 'cap', 'star'], colors=[0xffd23f, 0x3b82f6, 0xf472b6, 0x34d399, 0xffffff, 0xff8a3d]),
 'openai': dict(id='openai', art='art/openai.png', seed=11, bg='#0d6a5a', ray='#10806c', dots='#ffe08a',
              title='Next Station: OpenAI!', titleColor='#0b6b5a', kicker="Prof. Ding joins OpenAI's LLM Inference team  ·  June 2026",
              sfx='WHOOSH!', sfxAt=[262, 104], sfxFill='#ffe08a', sfxColor='#e8364a',
              props=['star', 'puff', 'confetti', 'star', 'puff'], colors=[0xffd23f, 0xffffff, 0x5eead4, 0xff8a3d, 0xffffff]),
 'cny': dict(id='cny', art='art/cny.png', seed=17, bg='#9a1b1b', ray='#b42222', dots='#ffd23f',
              title='Happy Lunar New Year!', titleColor='#b91c1c', kicker="New Year's Eve dinner  ·  Star Anise  ·  Feb 2026",
              sfx='BANG!', sfxAt=[990, 84], sfxFill='#ffd23f', sfxColor='#d62828',
              props=['envelope', 'coin', 'confetti', 'star', 'coin'], colors=[0xd62828, 0xffc933, 0xff6b3d, 0xffe08a, 0xffc933]),
 'safari': dict(id='safari', art='art/safari.png', seed=23, bg='#2d6a34', ray='#387f41', dots='#f4c542',
              title='Safari Day!', titleColor='#2f7a37', kicker='San Diego Zoo Safari Park  ·  Dec 2025',
              sfx='ROAR!', sfxAt=[250, 108], sfxFill='#f4c542', sfxColor='#e8641a',
              props=['leaf', 'paw', 'leaf', 'confetti'], colors=[0x3fa34d, 0x8bc34a, 0xf4a300, 0x6b8e23]),
 'welcome': dict(id='welcome', art='art/welcome.png', seed=29, bg='#b0420e', ray='#c55219', dots='#ffd23f',
              title='Welcome to Picasso Lab!', titleColor='#c2410c', kicker='Welcome lunch for Xinwei & new members  ·  Fire Spot  ·  Sep 2026',
              sfx='SIZZLE!', sfxAt=[1030, 74], sfxFill='#ffd23f', sfxColor='#e8364a',
              props=['flame', 'heart', 'star', 'confetti'], colors=[0xff7a1a, 0xff4d6d, 0xffd23f, 0xffffff]),
 'bestpaper': dict(id='bestpaper', art='art/bestpaper.png', seed=31, bg='#1a2354', ray='#233071', dots='#ffd23f',
              title='ISCA 2026 Best Paper!', titleColor='#1e3a8a', kicker='Zhongkai Yu  ·  "Patterns behind Chaos"  ·  June 2026',
              sfx='WOOHOO!', sfxAt=[256, 104], sfxFill='#ffd23f', sfxColor='#e8364a',
              props=['star', 'coin', 'confetti', 'star', 'confetti'], colors=[0xffd23f, 0xffc233, 0xffe08a, 0xffffff, 0xf0a93b]),
}
tpl = open(os.path.join(D, 'scene', 'template.html')).read()
for k in (sys.argv[1:] or CFG):
    for suffix, matte in (('k', '#000000'), ('w', '#ffffff')):      # black and white mattes of the same film
        c = dict(CFG[k], matte=matte)
        out = tpl.replace('/*CONFIG*/{}/*END*/', json.dumps(c))
        open(os.path.join(D, 'scene', f'{k}_{suffix}.html'), 'w').write(out)
    print('wrote', k)
