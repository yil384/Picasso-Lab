import sys
from PIL import Image
import numpy as np
f = sys.argv[1]
a = np.asarray(Image.open(f).convert('RGB')).astype(int)
H, W = a.shape[:2]
m = (a.min(axis=2) < 200)
m[:3,:]=False; m[-3:,:]=False; m[:,:3]=False; m[:,-3:]=False
ys, xs = np.nonzero(m)
print('size', W, H, 'bbox x', xs.min(), xs.max(), 'y', ys.min(), ys.max())
print('centre', (xs.min()+xs.max()+1)/2, (ys.min()+ys.max()+1)/2, 'R', (xs.max()-xs.min()+1)/2, (ys.max()-ys.min()+1)/2)
