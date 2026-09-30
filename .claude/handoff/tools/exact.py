# mean abs difference between the idle frame and t=0 (should be ~0 now), per prefix
import sys
from PIL import Image, ImageChops, ImageStat
for pre in sys.argv[1:]:
    a = Image.open(f'shots/{pre}_hov.jpg').convert('RGB'); b = Image.open(f'shots/{pre}_t000.jpg').convert('RGB')
    d = ImageChops.difference(a, b); st = ImageStat.Stat(d)
    print(pre, 'mean diff', [round(x, 2) for x in st.mean])
