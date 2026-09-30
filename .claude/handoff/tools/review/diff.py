import sys
from PIL import Image, ImageChops
import numpy as np
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
b = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(int)
d = np.abs(a-b).max(axis=2)
thr = int(sys.argv[3]) if len(sys.argv)>3 else 40
ys, xs = np.nonzero(d > thr)
print('max', d.max(), 'mean', round(d.mean(),3), 'n>thr', len(ys), 'bbox', (xs.min(), ys.min(), xs.max(), ys.max()) if len(ys) else None)
if len(sys.argv) > 4:
    im = Image.fromarray(np.clip(d*4,0,255).astype('uint8'))
    im.save(sys.argv[4])
