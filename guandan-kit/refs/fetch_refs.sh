#!/bin/bash
# Download the Tencent Guandan reference screenshots into refs/img/ (git-ignored: they are copyrighted —
# reference only, never commit or ship them). Needs network access to the image hosts listed below
# (claude.ai/code environment: network "Full", or "Custom" with these domains).
set -u
cd "$(dirname "$0")"
mkdir -p img
cd img
dl() { curl -sL -m 60 -A 'Mozilla/5.0' -o "$1" "$2" && echo "ok  $1" || echo "FAIL $1  ($2)"; }

# 大掼蛋 2026 (游戏日报 article images)
dl yxrb_lobby.jpeg     http://news.yxrb.net/uploadfile/2026/0116/12ca3cacc44e1fd.jpeg
dl yxrb_room.png       http://news.yxrb.net/uploadfile/2026/0116/181adf87f224664.png
dl yxrb_vs.jpeg        http://news.yxrb.net/uploadfile/2026/0116/ff543cab49002ca.jpeg
dl yxrb_matchlist.jpeg http://news.yxrb.net/uploadfile/2026/0116/48763773e9d7685.jpeg
dl yxrb_popup.png      http://news.yxrb.net/uploadfile/2026/0116/faf2d8adf70520d.png
# 大掼蛋 official site
for i in 1 3 4 5 6; do dl tx_p3_img$i.jpg https://game.gtimg.cn/images/guandan/web202412/p3_img$i.jpg; done
# 腾讯掼蛋 Google Play promo images (in-game insets are cropped below)
dl tg_gp1.jpg 'https://play-lh.googleusercontent.com/R5WRqryxzBVDEboMc2SaGplSwIoTNFkGgLDTpDumKSnxMyQjy7LeJkpI0Rt9SdxNG14wGO3p2TSBQO-LQgVGZg=w1600'
dl tg_gp2.jpg 'https://play-lh.googleusercontent.com/elEcY-lo93TBNviWbCJZqmxHEQFbn1NeaOgzpSpm1U6dgNM7Zrgk9yNokNPIKF3PowwoZRCRioTUBrsVVN2402w=w1600'
dl tg_gp3.jpg 'https://play-lh.googleusercontent.com/e4Cr_EcodC1T1F_HTLVhOw0s6IhDHfQOTxTjhxPW1L5o6YKyKl95a8-e3zsj_lG0r9sJOHDsk8qI-OVSQkN8HP4=w1600'
dl tg_gp4.jpg 'https://play-lh.googleusercontent.com/9Dj7CTKGUFFTevK9dh1-KbeY-PjjXi_mddMuwObAaeibxNKqnomjG6ni3RsvJRYs4GtKP_RRp-ucNxyikjp-Pw=w1600'
# 腾讯斗地主-掼蛋 (QQ游戏)
dl qqg_result.jpg   https://qqgame.qq.com/app/banner/screen_shot_img_10947231.jpg
dl qqg_ribbons.jpg  https://qqgame.qq.com/app/banner/screen_shot_img_48718280.jpg
dl qqg_shouchu.jpg  https://qqgame.qq.com/app/banner/screen_shot_img_65080402.jpg
# 大掼蛋 App Store screenshots (dagd_store_5 = 2026 in-game action row, dagd_store_6 = 2026 lobby)
n=0
for u in \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/14/1b/4b/141b4b3c-99f1-93b7-905e-988af8e0f1b8/2048x2732-6.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/fe/25/48/fe2548ea-91c7-2127-84a0-92f78f5ca9eb/2048x2732-4.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/b9/0a/41/b90a4140-7519-4f3a-b935-3093b713ea3d/2048x2732-3.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/1d/b3/3a/1db33a27-e6ff-2f87-51f9-432cd91afb46/2048x2732-5.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/bb/98/f4/bb98f47b-6bfa-2e22-589e-badf1014d97b/2048x2732-1.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/83/36/4b/83364bd3-f303-7bc8-ca30-cc326335bea1/2048x2732-2.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/0d/4c/32/0d4c3232-6445-e3e5-10f5-e331a377fe54/1242x2208-1.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/5d/1a/3a/5d1a3acb-7c02-d8c3-e9b0-6ad835526ead/1242x2208-2.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource221/v4/e9/77/f3/e977f334-b6f2-9e5e-8419-6ef966696e9d/1242x2208-4.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/c0/77/40/c0774034-662b-535a-831c-0bbe37252cc6/1242x2208-5.jpg/2732x2048bb.jpg \
  https://is1-ssl.mzstatic.com/image/thumb/PurpleSource211/v4/7c/fb/34/7cfb34f0-85b4-5ef0-e13c-1f1d8f4a6aef/1242x2208-6.jpg/2732x2048bb.jpg ; do
  n=$((n+1)); dl dagd_store_$n.jpg "$u"
done

# Crop the 腾讯掼蛋 in-game insets out of the promo images
python3 - <<'EOF'
from PIL import Image
crops = {
    'tg_ingame_classic.png':          ('tg_gp2.jpg', (180, 1003, 1425, 1645)),  # full hand in rank columns, 不出, level tiles
    'tg_ingame_wild_timer_report.png':('tg_gp3.jpg', (181, 1004, 1424, 1644)),  # 逢人配, alarm-clock timer, 剩10张
    'tg_ingame_bomb.png':             ('tg_gp4.jpg', (178, 1002, 1426, 1645)),  # 炸弹 effect
    'tg_ingame_tianwangzha_lowres.png':('tg_gp1.jpg', (32, 409, 490, 644)),     # 天王炸 effect (low-res source)
}
for out, (src, box) in crops.items():
    try:
        Image.open(src).convert('RGB').crop(box).save(out); print('crop', out)
    except Exception as e:
        print('crop FAILED', out, e)
EOF
ls -la
