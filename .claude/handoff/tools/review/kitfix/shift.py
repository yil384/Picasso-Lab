# best sub-pixel shift between <pre>_hov and <pre>_t000 (brute force over a grid of shifts, bilinear)
import sys
from PIL import Image
import numpy as np
from scipy.ndimage import shift as nshift
for pre in sys.argv[1:]:
    a=np.asarray(Image.open(f'shots/{pre}_hov.jpg').convert('L')).astype(float); b=np.asarray(Image.open(f'shots/{pre}_t000.jpg').convert('L')).astype(float)
    best=None
    for dy in np.arange(-1.5,1.51,0.25):
        for dx in np.arange(-1.5,1.51,0.25):
            c=nshift(b,(dy,dx),order=1,mode='nearest'); m=np.abs(a-c)[10:-10,10:-10].mean()
            if best is None or m<best[0]: best=(m,dx,dy)
    print(pre,'unshifted %.2f'%np.abs(a-b)[10:-10,10:-10].mean(),'best %.2f at dx %.2f dy %.2f'%best)
