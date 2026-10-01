# builds /home/user/Picasso-Lab/home/footer.html from footer.tpl.html + verbatim code from home/visitor-map.html
import sys
VM = open('/home/user/Picasso-Lab/home/visitor-map.html').read().split('\n')
def lines(a, b): return VM[a-1:b]
css = lines(1269, 1277)
assert css[0].lstrip().startswith('.vmap {') and css[-1].lstrip().startswith('.vmtip.show'), css[0][:40]
js = lines(145, 291)
assert js[0].strip().startswith('var SUPABASE_URL') and js[-1].strip().startswith('else { tip.classList.remove'), js[-1][:60]
js = '\n'.join(js)
def sub(old, new):
    global js
    assert js.count(old) == 1, old
    js = js.replace(old, new)
# the footer is always the compact map (also when footer.html is opened on its own)
sub("var period = 2400, big = IS_TOP, M = big ? 0 : 1;", "var period = 2400, big = false, M = 1;")
# tooltip: same content, kept inside the box (flips left / up near the right / bottom edge)
sub("tip.style.left = (e.clientX + 14) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; tip.classList.add('show'); }",
    "tip.classList.add('show'); var tw = tip.offsetWidth, th = tip.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;\n"
    "            var tx = e.clientX + 14, ty = e.clientY + 14; if (tx + tw > vw - 4) tx = Math.max(4, e.clientX - 14 - tw); if (ty + th > vh - 4) ty = Math.max(4, e.clientY - 14 - th);\n"
    "            tip.style.left = tx + 'px'; tip.style.top = ty + 'px'; }")
tpl = open('footer.tpl.html').read()
out = tpl.replace('/*@@VM_CSS@@*/', '\n'.join(css)).replace('//@@VM_JS@@', js)
assert '@@' not in out
open('/home/user/Picasso-Lab/home/footer.html', 'w').write(out)
print('wrote', len(out), 'bytes')
