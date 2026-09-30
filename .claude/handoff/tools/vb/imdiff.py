import sys
from PIL import Image, ImageChops
import numpy as np
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(int)
b = np.asarray(Image.open(sys.argv[2]).convert('RGB').resize((a.shape[1], a.shape[0]))).astype(int)
if len(sys.argv) > 3:
    x0, y0, x1, y1 = map(int, sys.argv[3].split(','))
    a = a[y0:y1, x0:x1]; b = b[y0:y1, x0:x1]
d = np.abs(a - b).max(axis=2)
print(f'mean {d.mean():.2f}  px>40 {(d > 40).sum()}  px>80 {(d > 80).sum()}  of {d.size}')
