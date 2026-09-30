import sys
from PIL import Image, ImageChops
import numpy as np
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
b = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(int)
d = np.abs(a - b).max(axis=2)
print('mean %.2f  p99 %d  max %d  px>24: %d  px>48: %d' % (d.mean(), np.percentile(d, 99), d.max(), (d > 24).sum(), (d > 48).sum()))
if len(sys.argv) > 3:
    Image.fromarray(np.clip(d * 4, 0, 255).astype('uint8')).save(sys.argv[3])
