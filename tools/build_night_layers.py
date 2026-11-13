import cv2, numpy as np
from PIL import Image, ImageDraw
U='/mnt/user-data/uploads/'; OUT='/home/claude/regent-exterior/public/home2/'
N={'path':'73f79c83','stone':'1ed70ea6','eave':'7c17b776','holiday':'2019fc99'}
W,H=1448,1086
def load(p): return np.array(Image.open(p).convert('RGB').resize((W,H),Image.LANCZOS))
m={k:load(U+v+'-image.png') for k,v in N.items()}
real=load('/tmp/mk/real.png')
# Privacy: paint out the house number and the yard sign in every image.
mask=np.zeros((H,W),np.uint8)
cv2.rectangle(mask,(646,570),(684,596),255,-1); cv2.rectangle(mask,(1104,826),(1150,872),255,-1); cv2.rectangle(mask,(1124,872),(1134,915),255,-1)
for k in m: m[k]=cv2.inpaint(m[k],mask,5,cv2.INPAINT_TELEA)
real=cv2.inpaint(real,mask,5,cv2.INPAINT_TELEA)
lin=lambda a:(a.astype(np.float32)/255)**2.2
enc=lambda a:(np.clip(a,0,1)**(1/2.2)*255).astype(np.uint8)
L={k:lin(v) for k,v in m.items()}
# Unlit base: darkest value any mockup shows for each pixel.
base=np.minimum.reduce(list(L.values()))
# Where mockups disagree about objects (door, window box), keep one source.
for (x0,y0,x1,y1) in [(628,596,712,790),(815,372,990,470)]:
    a=np.zeros((H,W),np.float32); cv2.rectangle(a,(x0,y0),(x1,y1),1,-1); a=cv2.GaussianBlur(a,(0,0),6)[...,None]
    src=np.minimum(L['stone'],L['path'])
    base=base*(1-a)+src*a
# Sky from the stone mockup.
s=m['stone']; hsv=cv2.cvtColor(s,cv2.COLOR_RGB2HSV)
cand=((s[...,2].astype(int)>s[...,0].astype(int)+10)&(hsv[...,2]>25)).astype(np.uint8)
cand=cv2.morphologyEx(cand,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
n,lab=cv2.connectedComponents(cand); keep=set(np.unique(lab[0:5,:]))-{0}
sky=np.isin(lab,list(keep)).astype(np.float32); sky[int(H*.62):]=0
sky=cv2.GaussianBlur(sky,(0,0),1.5)[...,None]
base=base*(1-sky)+L['stone']*sky
lum=lambda a:a@np.array([.2126,.7152,.0722],np.float32)
layers={}
for k in L:
    d=np.clip(L[k]-base,0,None)*(1-sky)
    w=np.clip((lum(d)-0.006)/0.03,0,1); w=w*w*(3-2*w)
    d*=w[...,None]
    if k=='eave':  # no window box popping in with the soffit lights
        a=np.zeros((H,W),np.float32); cv2.rectangle(a,(815,385),(990,470),1,-1); d*=(1-cv2.GaussianBlur(a,(0,0),5))[...,None]
    layers[k]=d
    Image.fromarray(enc(d)).save(OUT+f'light-{k}.webp',quality=90,method=6)
Image.fromarray(enc(base)).save(OUT+'base.webp',quality=92,method=6)
Image.fromarray(real).save(OUT+'real.webp',quality=86,method=6)
# Holiday bulbs: local maxima of the holiday layer; each gets a colour index.
hl=lum(layers['holiday']); hb=cv2.GaussianBlur(hl,(0,0),1.0)
hp=hb-cv2.GaussianBlur(hl,(0,0),7)
peak=(hb==cv2.dilate(hb,np.ones((5,5),np.uint8)))&(hp>0.16)&(hb>0.3)
ys,xs=np.nonzero(peak); print(len(xs),'bulbs')
rng=np.random.default_rng(4); ids=rng.integers(0,4,len(xs))
seed=np.ones((H,W),np.uint8); seed[ys,xs]=0
dist,labels=cv2.distanceTransformWithLabels(seed,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
lab2id=np.zeros(labels.max()+1,np.int32); lab2id[labels[ys,xs]]=ids
idx=lab2id[labels]
fall=np.exp(-(dist/8.0)**2)
tex=np.zeros((H,W,4),np.uint8); tex[...,3]=((1-sky[...,0])*255).astype(np.uint8); tex[...,0]=idx*85; tex[...,1]=(fall*255).astype(np.uint8)
# Snow cover in blue: roofs (dark shingles inside a hull) and the ground.
def poly(p):
    im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon(p,fill=255); return np.array(im).astype(np.float32)/255
rl=lum(lin(real))
roof=poly([(262,578),(285,560),(760,250),(990,156),(1250,66),(1264,98),(1150,278),(905,128),(742,380),(700,300),(652,342),(640,420),(470,552)])*(rl<0.035)*(1-sky[...,0])
roof=cv2.morphologyEx(roof.astype(np.uint8),cv2.MORPH_OPEN,np.ones((3,3),np.uint8)).astype(np.float32)
roof=cv2.morphologyEx(roof.astype(np.uint8),cv2.MORPH_CLOSE,np.ones((9,9),np.uint8)).astype(np.float32)
n1=cv2.GaussianBlur(rng.random((H//8,W//8)).astype(np.float32),(0,0),5); n1=cv2.resize((n1-n1.min())/np.ptp(n1),(W,H))
n2=cv2.GaussianBlur(rng.random((H//2,W//2)).astype(np.float32),(0,0),2); n2=cv2.resize((n2-n2.min())/np.ptp(n2),(W,H))
ground=poly([(0,872),(120,868),(430,872),(560,905),(760,935),(1000,975),(1200,1010),(1448,930),(1448,1086),(0,1086)])
snow=np.clip(roof*(0.75+0.25*n2)+ground*np.clip(0.2+0.9*n1+0.3*(n2-.5),0,.9),0,1)
tex[...,2]=(cv2.GaussianBlur(snow,(0,0),1.6)*255).astype(np.uint8)
Image.fromarray(tex).save(OUT+'holiday-map.png',optimize=True)
# previews
allon=base+np.maximum.reduce([layers['path'],layers['stone'],layers['eave']])
sh=Image.new('RGB',(W*2,H*2)); 
for i,a in enumerate([base,allon,base+layers['holiday'],np.dstack([snow,roof,fall])][:3]): sh.paste(Image.fromarray(enc(a)),((i%2)*W,(i//2)*H))
sh.resize((1448,1086)).save('/tmp/mk/prev.jpg',quality=88)
import os
for f in sorted(os.listdir(OUT)): print(f,os.path.getsize(OUT+f)//1024,'KB')
