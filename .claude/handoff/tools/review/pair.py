import sys
from PIL import Image
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB').resize(a.size)
s=float(sys.argv[4]) if len(sys.argv)>4 else 1
w,h=a.size
horiz = w < h
c=Image.new('RGB',(w*2+8,h) if horiz else (w,h*2+8),'#f0f')
c.paste(a,(0,0)); c.paste(b,(w+8,0) if horiz else (0,h+8))
c=c.resize((int(c.size[0]*s),int(c.size[1]*s)))
c.save(sys.argv[3],quality=80)
