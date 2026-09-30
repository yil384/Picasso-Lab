import sys
from PIL import Image
out=sys.argv[1]; files=sys.argv[2:]
ims=[Image.open(f) for f in files]
w=sum(i.width for i in ims); h=max(i.height for i in ims)
c=Image.new('RGB',(w,h),'white'); x=0
for i in ims: c.paste(i,(x,0)); x+=i.width
s=min(1.0, 1800/w)
c=c.resize((int(w*s),int(h*s))); c.save(out,quality=72)
