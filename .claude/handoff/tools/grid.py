import sys, glob
from PIL import Image
out, pat, cols, scale = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
files = sorted(glob.glob(pat)) + sys.argv[5:]
ims=[Image.open(f) for f in files]
w,h=ims[0].size; w2,h2=int(w*scale),int(h*scale)
rows=(len(ims)+cols-1)//cols
c=Image.new('RGB',(cols*w2+ (cols-1)*6,rows*h2 + (rows-1)*6),'#888')
for i,im in enumerate(ims): c.paste(im.resize((w2,h2)),((i%cols)*(w2+6),(i//cols)*(h2+6)))
c.save(out,quality=72)
