# Patch the kit snippets (photo sized to its tile + keyboard focus ring). Idempotent: fails loudly if a
# snippet does not contain the expected original text.
import sys
FILES = sys.argv[1:] or ['chang_top_scorer', 'jixuan_painting', 'keyi_esports_genius', 'ohm', 'xiang_concert',
                         'yichen_card_master', 'yue_baseball', 'zaifeng_academician', 'zhengding_sunshine', 'zhuo_gold_medal']
REPL = [
    ("""html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: transparent; }
.pfx {
  position: absolute; left: 8px; top: 8px; width: 200px; height: 200px;
  border-radius: 50%; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;
}
/* phones: Sites stacks the photo above the name, so sit at the bottom of the tile (next to the name) */
.pfx.pfx-phone { left: 50%; top: auto; bottom: 10px; margin-left: -100px; }
""",
     """html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; background: transparent; }
/* the Team page tiles shrink with the window (to about 150 px wide at 768): the photo is 200 px or
   whatever fits the tile, and the kit scales the effect with it */
.pfx {
  --d: min(200px, calc(100vw - 16px), calc(100vh - 16px));
  position: absolute; left: 8px; top: 8px; width: var(--d); height: var(--d);
  border-radius: 50%; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent;
}
/* phones: Sites stacks the photo above the name, so sit at the bottom of the tile (next to the name) */
.pfx.pfx-phone { left: 50%; top: auto; bottom: 10px; margin-left: calc(var(--d) / -2); }
"""),
    (""".pfx-shadow { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 4px 10px rgba(0, 0, 0, .18); }
""",
     """.pfx-shadow { position: absolute; inset: 0; border-radius: 50%; box-shadow: 0 4px 10px rgba(0, 0, 0, .18); }
/* keyboard focus: a ring on the photo's edge, drawn over the effect canvas too (so it shows on and off) */
.pfx-stage::after {
  content: ''; position: absolute; inset: -1px; border: 3px solid #00629b; border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .85); opacity: 0; pointer-events: none;
}
.pfx:focus-visible .pfx-stage::after { opacity: 1; }
"""),
]
for name in FILES:
    p = f'/home/user/Picasso-Lab/people/{name}.html'
    s = open(p, encoding='utf-8').read()
    for old, new in REPL:
        if new in s:
            continue
        assert s.count(old) == 1, (name, old[:60])
        s = s.replace(old, new)
    open(p, 'w', encoding='utf-8').write(s)
    print('patched', name)
